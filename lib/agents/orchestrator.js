// lib/agents/orchestrator.js
// LangGraph.js multi-agent orchestrator
// Primary model: Gemini 2.5 Flash (MODELS.ORCHESTRATOR)
// All state persisted to Supabase before execution

import { StateGraph, END } from '@langchain/langgraph'
import { withFallback } from '@/lib/ai'
import { generateDecision, generateTask } from '@/lib/ai/structured'
import { createSupabaseAdminClient } from '@/lib/db/client'
import { getFullCaseState, logMLPrediction } from '@/lib/db/cases'
import {
  broadcastProfessionalStatus,
  broadcastNewDecision,
  broadcastPredictionUpdate,
  broadcastToChannel,
  CHANNELS,
  EVENTS
} from '@/lib/realtime/channels'
import {
  queueMlRefresh,
  queueEscalation
} from '@/lib/queues'

// ─── ORCHESTRATOR SYSTEM PROMPT ───────────────────────────
// From document Section 10 — never paraphrase

const ORCHESTRATOR_SYSTEM_PROMPT = `
You are the case coordination orchestrator for UnwindAI.
You coordinate professionals managing someone's most difficult
life transition — divorce, inheritance, property, or business
dispute.

YOUR ROLE:
- Analyze case state and determine what needs to happen next
- Route tasks to appropriate professionals
- Detect blockers and dependencies
- Generate decisions for the user when action is needed
- Never generate legal advice — only coordination and status

STRICT RULES:
- Never share one professional's work with another
- Never include financial details in status messages
- Never include legal strategy in professional notifications
- Never say "your lawyer said" or reference specific advice
- Plain language only — no legal jargon
- You see the full case state but FILTER before acting

OUTPUT FORMAT:
Always respond with valid JSON only. No preamble. No explanation.
Use the exact schema provided in each prompt.
`

// ─── ROLE ISOLATION FILTER ────────────────────────────────
// Law 1 from document Section 02
// Applied before any data reaches a professional

const ROLE_ACCESS = {
  lawyer: {
    can_see_tasks:     true,
    can_see_documents: ['property_deed','petition',
                        'custody_agreement','correspondence'],
    can_see_financial: false,    // AI summary only
    can_see_strategy:  'own',    // Only decisions they generated
    can_see_userinfo:  'full'
  },
  chartered_accountant: {
    can_see_tasks:     true,
    can_see_documents: ['financial_statement','bank_statement',
                        'tax_return','valuation_report'],
    can_see_financial: true,
    can_see_strategy:  false,
    can_see_userinfo:  'full'
  },
  therapist: {
    can_see_tasks:     true,
    can_see_documents: [],          // No documents
    can_see_financial: false,
    can_see_strategy:  false,
    can_see_userinfo:  'full'
  },
  property_valuator: {
    can_see_tasks:     true,
    can_see_documents: ['property_deed','valuation_report'],
    can_see_financial: false,
    can_see_strategy:  false,
    can_see_userinfo:  'name_only'
  },
  mediator: {
    can_see_tasks:     true,
    can_see_documents: [],
    can_see_financial: false,    // AI summary only
    can_see_strategy:  false,
    can_see_userinfo:  'full'
  }
}

/**
 * filterCaseDataForRole
 * Applies role isolation before any professional receives data
 * This is the enforcement point for Architecture Law 1
 */
export function filterCaseDataForRole(caseState, role) {
  const access = ROLE_ACCESS[role]
  if (!access) {
    throw new Error(`Unknown professional role: ${role}`)
  }

  const filtered = {
    case_id:      caseState.case_id,
    case_type:    caseState.case_type,
    city:         caseState.city,
    phase:        caseState.phase_current,
    day_number:   caseState.day_number
  }

  // User info — apply name_only restriction for valuator
  if (access.can_see_userinfo === 'full') {
    filtered.user_context = {
      case_type: caseState.case_type,
      urgency:   caseState.urgency || 'medium',
      city:      caseState.city
    }
  } else if (access.can_see_userinfo === 'name_only') {
    filtered.user_context = { city: caseState.city }
  }

  // Tasks — professional sees ONLY their own tasks
  if (access.can_see_tasks && caseState.tasks) {
    filtered.my_tasks = caseState.tasks.filter(
      t => t.professional_role === role
    ).map(t => ({
      id:          t.id,
      title:       t.title,
      description: t.description,
      deadline:    t.deadline,
      status:      t.status,
      priority:    t.priority,
      phase:       t.phase
    }))
  }

  // Financial — CA gets full, others get nothing
  if (access.can_see_financial && caseState.financial_summary) {
    filtered.financial_summary = caseState.financial_summary
  }

  // Documents — only allowed types
  if (caseState.documents && access.can_see_documents.length > 0) {
    filtered.accessible_documents = caseState.documents
      .filter(d =>
        access.can_see_documents.includes(d.document_type)
      )
      .map(d => ({
        id:            d.id,
        label:         d.label,
        document_type: d.document_type,
        ipfs_hash:     d.ipfs_hash,
        uploaded_at:   d.uploaded_at
      }))
  }

  return filtered
}

// ─── NODE 1: LOAD CASE STATE ──────────────────────────────

async function loadCaseState(state) {
  const supabase = createSupabaseAdminClient()

  try {
    // Load full case state from Supabase
    const caseData = await getFullCaseState(state.case_id)

    if (!caseData?.case) {
      throw new Error(`Case not found: ${state.case_id}`)
    }

    // Save checkpoint BEFORE any action — Law 4
    const checkpoint = await saveOrchestratorCheckpoint(
      state.case_id,
      'load_case_state',
      { loaded_at: new Date().toISOString() }
    )

    return {
      ...state,
      case_type:          caseData.case.case_type,
      city:               caseData.case.city,
      status:             caseData.case.status,
      phase_current:      caseData.case.phase_current,
      day_number:         caseData.case.day_number,
      risk_score:         caseData.profile?.risk_score,
      recommended_path:   caseData.profile?.recommended_path,
      ml_prediction_json: caseData.profile?.ml_prediction_json,
      professionals:      caseData.professionals || [],
      tasks:              caseData.activeTasks || [],
      pending_decisions:  caseData.decisions || [],
      checkpoint_id:      checkpoint.id,
      last_error:         null
    }
  } catch (err) {
    console.error('[Orchestrator] loadCaseState failed:', err.message)
    return {
      ...state,
      last_error: err.message,
      graph_complete: true
      // Terminate graph on load failure
      // State recovery via checkpoint on next run
    }
  }
}

// ─── NODE 2: ANALYZE STATE ────────────────────────────────

async function analyzeState(state) {
  if (state.last_error) return state

  // Build analysis prompt — aggregate only, no professional data
  const analysisContext = {
    case_id:          state.case_id,
    case_type:        state.case_type,
    phase:            state.phase_current,
    day_number:       state.day_number,
    risk_score:       state.risk_score,
    recommended_path: state.recommended_path,
    total_tasks:      state.tasks.length,
    overdue_tasks:    state.tasks.filter(t =>
      t.deadline && new Date(t.deadline) < new Date() &&
      t.status !== 'completed'
    ).length,
    escalated_tasks: state.tasks.filter(
      t => t.status === 'escalated'
    ).length,
    pending_decisions: state.pending_decisions.length,
    professionals_active: state.professionals.filter(
      p => p.status === 'active'
    ).length
  }

  try {
    const { text } = await withFallback('orchestrator', {
      system: ORCHESTRATOR_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Analyze case state and determine next actions.

Case state:
${JSON.stringify(analysisContext, null, 2)}

Return ONLY this JSON:
{
  "phase_health": "on_track|at_risk|blocked",
  "should_escalate": boolean,
  "should_recalculate_dna": boolean,
  "should_notify_user": boolean,
  "blockers_detected": ["string"],
  "next_actions": ["string"],
  "priority_action": "string",
  "estimated_days_remaining": number
}`
      }],
      maxTokens: 400,
      temperature: 0.2
    })

    const analysis = parseOrchestratorJSON(text)

    // Save checkpoint after analysis
    await saveOrchestratorCheckpoint(
      state.case_id,
      'analyze_state',
      { analysis, completed_at: new Date().toISOString() }
    )

    return {
      ...state,
      should_escalate:          analysis.should_escalate || false,
      should_recalculate_dna:   analysis.should_recalculate_dna || false,
      should_notify_user:       analysis.should_notify_user || false,
      blockers_detected:        analysis.blockers_detected || [],
      actions_taken: [
        ...state.actions_taken,
        `analyzed_state: ${analysis.phase_health}`
      ]
    }
  } catch (err) {
    console.error('[Orchestrator] analyzeState failed:', err.message)
    return {
      ...state,
      last_error: err.message,
      // Safe defaults — non-disruptive
      should_escalate:        false,
      should_recalculate_dna: false,
      should_notify_user:     false
    }
  }
}

// ─── NODE 3: ROUTE TASKS ──────────────────────────────────

async function routeTasks(state) {
  if (state.last_error && state.retry_count > 2) return state

  const supabase = createSupabaseAdminClient()

  // Save checkpoint before task routing
  await saveOrchestratorCheckpoint(
    state.case_id,
    'route_tasks_start',
    { task_count: state.tasks.length }
  )

  try {
    // Generate new tasks if phase requires them
    const newTasks = await generatePhaseTasksIfNeeded(state)

    for (const task of newTasks) {
      // Create task in DB
      const { data: createdTask } = await supabase
        .from('tasks')
        .insert({
          case_id:         state.case_id,
          title:           task.title,
          description:     task.description,
          phase:           task.phase,
          priority:        task.priority || 'normal',
          deadline:        new Date(
            Date.now() + (task.deadline_days || 7) * 86400000
          ).toISOString(),
          predicted_cost_inr: task.predicted_cost_inr || null
        })
        .select('id')
        .single()

      if (createdTask) {
        // Find professional for this role
        const professional = state.professionals.find(
          p => p.professional?.role === task.professional_role &&
               p.status === 'active'
        )

        if (professional) {
          // Assign task to professional
          await supabase
            .from('tasks')
            .update({
              professional_id: professional.professional_id
            })
            .eq('id', createdTask.id)

          // Apply role isolation filter
          const filteredData = filterCaseDataForRole(
            {
              case_id:       state.case_id,
              case_type:     state.case_type,
              city:          state.city,
              phase_current: state.phase_current,
              day_number:    state.day_number,
              tasks:         [...state.tasks, {
                ...task,
                id: createdTask.id,
                professional_role: task.professional_role
              }]
            },
            professional.professional?.role
          )

          // Broadcast filtered task to professional
          const {
            broadcastProfessionalTask
          } = await import('@/lib/realtime/channels')

          await broadcastProfessionalTask(
            supabase,
            professional.professional_id,
            {
              id:       createdTask.id,
              case_id:  state.case_id,
              title:    task.title,
              deadline: new Date(
                Date.now() + (task.deadline_days || 7) * 86400000
              ).toISOString(),
              priority: task.priority || 'normal'
            }
          )
        }
      }
    }

    return {
      ...state,
      actions_taken: [
        ...state.actions_taken,
        `routed_tasks: ${newTasks.length} new tasks created`
      ]
    }
  } catch (err) {
    console.error('[Orchestrator] routeTasks failed:', err.message)
    return { ...state, last_error: err.message }
  }
}

// ─── NODE 4: HANDLE DECISIONS ─────────────────────────────

async function handleDecisions(state) {
  if (state.last_error && state.retry_count > 2) return state

  const supabase = createSupabaseAdminClient()

  // Check for decision-worthy events
  const decisionTriggers = findDecisionTriggers(state)

  if (decisionTriggers.length === 0) {
    return {
      ...state,
      actions_taken: [
        ...state.actions_taken,
        'handle_decisions: no triggers found'
      ]
    }
  }

  // Save checkpoint before creating decisions
  await saveOrchestratorCheckpoint(
    state.case_id,
    'handle_decisions',
    { triggers: decisionTriggers.length }
  )

  const createdDecisions = []

  for (const trigger of decisionTriggers) {
    try {
      // Apply 2AM Rule — suppress non-critical decisions at night
      const userHour = new Date().getHours()
      // Using server time — ideally user timezone from DB
      const isNightTime = userHour >= 22 || userHour < 7
      const isCritical = trigger.urgency === 'critical'

      if (isNightTime && !isCritical) {
        console.log(
          `[Orchestrator] 2AM Rule: deferring ${trigger.type} decision`
        )
        continue
      }

      // Generate structured decision
      const decision = await generateDecision(
        {
          case_type:    state.case_type,
          phase:        state.phase_current,
          risk_score:   state.risk_score,
          day_number:   state.day_number
        },
        trigger.prompt
      )

      // Save to DB
      const { data: savedDecision } = await supabase
        .from('decisions')
        .insert({
          case_id:          state.case_id,
          title:            decision.title,
          context:          decision.context,
          options_json:     decision.options,
          urgency:          trigger.urgency || 'normal',
          deadline:         decision.deadline_hours
            ? new Date(
                Date.now() + decision.deadline_hours * 3600000
              ).toISOString()
            : null,
          generated_by:     'orchestrator',
          two_am_rule_applied: false
        })
        .select('id, title, urgency, deadline')
        .single()

      if (savedDecision) {
        createdDecisions.push(savedDecision)

        // Broadcast to user Decision Inbox
        await broadcastNewDecision(
          supabase,
          state.case_id,
          savedDecision
        )
      }
    } catch (err) {
      console.error(
        `[Orchestrator] Decision creation failed: ${err.message}`
      )
    }
  }

  return {
    ...state,
    actions_taken: [
      ...state.actions_taken,
      `created_decisions: ${createdDecisions.length}`
    ]
  }
}

// ─── NODE 5: ESCALATE BLOCKERS ────────────────────────────

async function escalateBlockers(state) {
  // Only runs if analyzeState flagged should_escalate
  if (!state.should_escalate) return state
  if (state.last_error && state.retry_count > 2) return state

  const overdueEscalatable = state.tasks.filter(t =>
    t.deadline &&
    new Date(t.deadline) < new Date() &&
    t.status !== 'completed' &&
    t.status !== 'cancelled' &&
    (t.escalation_count || 0) < 3
  )

  for (const task of overdueEscalatable) {
    await queueEscalation(
      task.id,
      state.case_id,
      task.professional_id,
      `Task "${task.title}" is past deadline — ` +
      `Day ${state.day_number} of case`
    )
  }

  return {
    ...state,
    actions_taken: [
      ...state.actions_taken,
      `escalated: ${overdueEscalatable.length} tasks`
    ]
  }
}

// ─── NODE 6: RECALCULATE DNA ──────────────────────────────

async function recalculateDna(state) {
  // Only runs if analyzeState flagged should_recalculate_dna
  if (!state.should_recalculate_dna) return state

  try {
    await queueMlRefresh(
      state.case_id,
      `orchestrator_trigger_day_${state.day_number}`,
      {
        case_type:        state.case_type,
        phase:            state.phase_current,
        day_number:       state.day_number,
        overdue_tasks:    state.tasks.filter(t =>
          t.deadline && new Date(t.deadline) < new Date()
        ).length
      }
    )

    console.log(
      `[Orchestrator] DNA recalculation queued: ${state.case_id}`
    )

    return {
      ...state,
      actions_taken: [
        ...state.actions_taken,
        'queued_dna_recalculation'
      ]
    }
  } catch (err) {
    console.error('[Orchestrator] recalculateDna failed:', err.message)
    return state
  }
}

// ─── NODE 7: NOTIFY USER ──────────────────────────────────

async function notifyUser(state) {
  // Only runs if analyzeState flagged should_notify_user
  if (!state.should_notify_user) return state

  const supabase = createSupabaseAdminClient()

  try {
    // Generate user-facing status update
    const { text } = await withFallback('orchestrator', {
      system: ORCHESTRATOR_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Generate a brief user status update.
Phase: ${state.phase_current}
Day: ${state.day_number}
Active tasks: ${state.tasks.length}
Blockers: ${state.blockers_detected.join(', ') || 'none'}
Actions taken: ${state.actions_taken.slice(-3).join(', ')}

Return JSON:
{
  "status_text": "one plain sentence for user (max 15 words)",
  "professional_doing": "what their team is doing right now",
  "next_update": "when user should expect next update"
}`
      }],
      maxTokens: 150,
      temperature: 0.4
    })

    const update = parseOrchestratorJSON(text)

    // Broadcast to user dashboard
    await broadcastToChannel(
      supabase,
      CHANNELS.caseStatus(state.case_id),
      EVENTS.PROFESSIONAL_STATUS_CHANGED,
      {
        status_text:      update.status_text,
        professional_doing: update.professional_doing,
        updated_at:       new Date().toISOString()
      }
    )

    return {
      ...state,
      messages_sent: [
        ...state.messages_sent,
        { type: 'user_status', text: update.status_text }
      ],
      actions_taken: [
        ...state.actions_taken,
        'notified_user'
      ]
    }
  } catch (err) {
    console.error('[Orchestrator] notifyUser failed:', err.message)
    return state
  }
}

// ─── NODE 8: SAVE CHECKPOINT ──────────────────────────────

async function saveCheckpoint(state) {
  const supabase = createSupabaseAdminClient()

  // Always runs — final node
  const checkpointData = {
    actions_taken:    state.actions_taken,
    messages_sent:    state.messages_sent,
    blockers:         state.blockers_detected,
    completed_at:     new Date().toISOString(),
    next_check_at:    new Date(
      Date.now() + 15 * 60 * 1000
      // Re-run every 15 minutes
    ).toISOString()
  }

  await saveOrchestratorCheckpoint(
    state.case_id,
    'graph_complete',
    checkpointData
  )

  // Update case day_number
  await supabase
    .from('cases')
    .update({
      day_number: state.day_number + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', state.case_id)

  console.log(
    `[Orchestrator] Graph complete: ${state.case_id} ` +
    `actions=${state.actions_taken.length}`
  )

  return {
    ...state,
    graph_complete: true
  }
}

// ─── GRAPH CONSTRUCTION ───────────────────────────────────

function buildOrchestratorGraph() {
  const graph = new StateGraph({
    channels: {
      case_id:              { value: (x, y) => y ?? x },
      user_id:              { value: (x, y) => y ?? x },
      case_type:            { value: (x, y) => y ?? x },
      city:                 { value: (x, y) => y ?? x },
      status:               { value: (x, y) => y ?? x },
      phase_current:        { value: (x, y) => y ?? x },
      day_number:           { value: (x, y) => y ?? x, default: () => 0 },
      risk_score:           { value: (x, y) => y ?? x },
      recommended_path:     { value: (x, y) => y ?? x },
      ml_prediction_json:   { value: (x, y) => y ?? x },
      professionals:        { value: (x, y) => y ?? x, default: () => [] },
      tasks:                { value: (x, y) => y ?? x, default: () => [] },
      escalations:          { value: (x, y) => y ?? x, default: () => [] },
      pending_decisions:    { value: (x, y) => y ?? x, default: () => [] },
      recent_decisions:     { value: (x, y) => y ?? x, default: () => [] },
      actions_taken:        {
        // Append-only — accumulates actions
        value: (x, y) => (x || []).concat(y || []),
        default: () => []
      },
      messages_sent:        {
        value: (x, y) => (x || []).concat(y || []),
        default: () => []
      },
      blockers_detected:    { value: (x, y) => y ?? x, default: () => [] },
      next_check_at:        { value: (x, y) => y ?? x },
      last_error:           { value: (x, y) => y ?? x },
      retry_count:          { value: (x, y) => y ?? x, default: () => 0 },
      checkpoint_id:        { value: (x, y) => y ?? x },
      should_escalate:      { value: (x, y) => y ?? x, default: () => false },
      should_recalculate_dna: { value: (x, y) => y ?? x, default: () => false },
      should_notify_user:   { value: (x, y) => y ?? x, default: () => false },
      graph_complete:       { value: (x, y) => y ?? x, default: () => false }
    }
  })

  // Add nodes
  graph.addNode('loadCaseState',   loadCaseState)
  graph.addNode('analyzeState',    analyzeState)
  graph.addNode('routeTasks',      routeTasks)
  graph.addNode('handleDecisions', handleDecisions)
  graph.addNode('escalateBlockers', escalateBlockers)
  graph.addNode('recalculateDna',  recalculateDna)
  graph.addNode('notifyUser',      notifyUser)
  graph.addNode('saveCheckpoint',  saveCheckpoint)

  // Set entry point
  graph.setEntryPoint('loadCaseState')

  // Linear edges
  graph.addEdge('loadCaseState', 'analyzeState')
  graph.addEdge('analyzeState',  'routeTasks')
  graph.addEdge('routeTasks',    'handleDecisions')

  // Conditional edges from handleDecisions
  graph.addConditionalEdges(
    'handleDecisions',
    (state) => {
      // Determine which optional nodes to run
      if (state.should_escalate) return 'escalateBlockers'
      if (state.should_recalculate_dna) return 'recalculateDna'
      if (state.should_notify_user) return 'notifyUser'
      return 'saveCheckpoint'
    },
    {
      escalateBlockers: 'escalateBlockers',
      recalculateDna:   'recalculateDna',
      notifyUser:       'notifyUser',
      saveCheckpoint:   'saveCheckpoint'
    }
  )

  // Conditional edges from escalateBlockers
  graph.addConditionalEdges(
    'escalateBlockers',
    (state) => {
      if (state.should_recalculate_dna) return 'recalculateDna'
      if (state.should_notify_user) return 'notifyUser'
      return 'saveCheckpoint'
    },
    {
      recalculateDna: 'recalculateDna',
      notifyUser:     'notifyUser',
      saveCheckpoint: 'saveCheckpoint'
    }
  )

  // Conditional edges from recalculateDna
  graph.addConditionalEdges(
    'recalculateDna',
    (state) => state.should_notify_user
      ? 'notifyUser'
      : 'saveCheckpoint',
    {
      notifyUser:    'notifyUser',
      saveCheckpoint: 'saveCheckpoint'
    }
  )

  // notifyUser always goes to saveCheckpoint
  graph.addEdge('notifyUser', 'saveCheckpoint')

  // saveCheckpoint ends the graph
  graph.addEdge('saveCheckpoint', END)

  return graph.compile()
}

// Compile the graph once at module load
let _compiledGraph = null

export function getOrchestratorGraph() {
  if (!_compiledGraph) {
    _compiledGraph = buildOrchestratorGraph()
  }
  return _compiledGraph
}

// ─── PUBLIC API — CALLED BY WORKERS ──────────────────────

/**
 * runOrchestrator
 * Main entry point — called by BullMQ orchestrator worker
 */
export async function runOrchestrator(caseId, userId) {
  const graph = getOrchestratorGraph()

  const initialState = {
    case_id:  caseId,
    user_id:  userId,
    day_number: 0,
    professionals: [],
    tasks: [],
    escalations: [],
    pending_decisions: [],
    recent_decisions: [],
    actions_taken: [],
    messages_sent: [],
    blockers_detected: [],
    should_escalate: false,
    should_recalculate_dna: false,
    should_notify_user: false,
    graph_complete: false,
    retry_count: 0,
    last_error: null
  }

  console.log(`[Orchestrator] Graph starting: ${caseId}`)

  try {
    const finalState = await graph.invoke(initialState, {
      recursionLimit: 20
      // Safety — prevent infinite loops
    })

    console.log(
      `[Orchestrator] Graph complete: ${caseId} ` +
      `actions=${finalState.actions_taken?.length || 0}`
    )

    return finalState
  } catch (err) {
    console.error(
      `[Orchestrator] Graph failed: ${caseId}`,
      err.message
    )
    throw err
  }
}

// Alias used by Phase 3.1 processIntakeCompletion
export async function processIntakeCompletion(caseId, userId) {
  return runOrchestrator(caseId, userId)
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────

async function generatePhaseTasksIfNeeded(state) {
  // Only generate tasks when entering a new phase
  // Prevents duplicate task creation
  const phaseTasksExist = state.tasks.some(
    t => t.phase === state.phase_current && t.status !== 'cancelled'
  )

  if (phaseTasksExist) return []

  // Phase-specific task templates
  const PHASE_TASKS = {
    setup: [
      {
        title: 'Review case profile and confirm scope',
        description: 'Review the case details and confirm your scope of engagement.',
        professional_role: 'lawyer',
        deadline_days: 3,
        priority: 'high',
        phase: 'setup'
      },
      {
        title: 'Schedule initial wellbeing session',
        description: 'Schedule and conduct initial wellbeing assessment session.',
        professional_role: 'therapist',
        deadline_days: 5,
        priority: 'high',
        phase: 'setup'
      }
    ],
    docs: [
      {
        title: 'Compile financial statements — last 3 years',
        description: 'Obtain and compile all joint financial statements for the past 36 months.',
        professional_role: 'chartered_accountant',
        deadline_days: 10,
        priority: 'normal',
        phase: 'docs'
      },
      {
        title: 'Conduct property valuation',
        description: 'Schedule site visit and prepare formal valuation report.',
        professional_role: 'property_valuator',
        deadline_days: 14,
        priority: 'normal',
        phase: 'docs'
      }
    ],
    negotiation: [
      {
        title: 'Prepare mediation framework',
        description: 'Review case summary and prepare proposed mediation agenda.',
        professional_role: 'mediator',
        deadline_days: 7,
        priority: 'normal',
        phase: 'negotiation'
      }
    ],
    draft: [
      {
        title: 'Draft settlement agreement',
        description: 'Draft the complete settlement agreement based on agreed terms.',
        professional_role: 'lawyer',
        deadline_days: 10,
        priority: 'high',
        phase: 'draft'
      }
    ],
    filing: [
      {
        title: 'Prepare court filing documents',
        description: 'Prepare all documents required for court filing.',
        professional_role: 'lawyer',
        deadline_days: 7,
        priority: 'critical',
        phase: 'filing'
      }
    ]
  }

  return PHASE_TASKS[state.phase_current] || []
}

function findDecisionTriggers(state) {
  const triggers = []

  // Trigger: property valuator needs site access
  const valuatorTasks = state.tasks.filter(
    t => t.professional_role === 'property_valuator' &&
         t.status === 'pending' &&
         t.title?.toLowerCase().includes('valuation')
  )

  if (valuatorTasks.length > 0) {
    triggers.push({
      type: 'property_access',
      urgency: 'normal',
      prompt: 'Property valuator needs site visit access confirmation from user. Generate a decision asking if they approve the scheduled site visit.'
    })
  }

  // Trigger: document request from professional
  const docsNeeded = state.tasks.filter(
    t => t.status === 'blocked' &&
         t.title?.toLowerCase().includes('document')
  )

  if (docsNeeded.length > 0) {
    triggers.push({
      type: 'document_request',
      urgency: 'normal',
      prompt: `Professional needs documents to proceed. Tasks blocked: ${docsNeeded.map(t => t.title).join(', ')}. Generate a decision asking user to upload required documents.`
    })
  }

  // Trigger: escalation requires user awareness
  if (state.should_escalate && state.blockers_detected.length > 0) {
    triggers.push({
      type: 'blocker_awareness',
      urgency: 'high',
      prompt: `Case has blockers: ${state.blockers_detected.join(', ')}. Generate a decision informing user and asking how to proceed.`
    })
  }

  return triggers
}

function parseOrchestratorJSON(text) {
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return {}

  try {
    return JSON.parse(match[0])
  } catch {
    return {}
  }
}

async function saveOrchestratorCheckpoint(
  caseId,
  nodeName,
  data
) {
  const supabase = createSupabaseAdminClient()

  try {
    const { data: checkpoint } = await supabase
      .from('ml_prediction_log')
      // Reuse for orchestrator checkpoints
      .insert({
        case_id:         caseId,
        prediction_type: 'anomaly',
        features_json:   { node: nodeName, data },
        output_json:     { checkpoint: true, node: nodeName },
        model_name:      'orchestrator_checkpoint',
        demo_mode:       process.env.DEMO_MODE === 'true'
      })
      .select('id')
      .single()

    return checkpoint || { id: null }
  } catch {
    // Checkpoint failure is non-fatal
    return { id: null }
  }
}
