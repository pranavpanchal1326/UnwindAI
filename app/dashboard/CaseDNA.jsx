// app/dashboard/CaseDNA.jsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls
} from 'reactflow'
import 'reactflow/dist/style.css'
import { motion } from 'framer-motion'
import { EmptyState } from '@/app/components/ui'
import { PAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'

/**
 * CaseDNA
 * React Flow visualization of the case as a directed graph
 */

// ─── CUSTOM NODE COMPONENTS ───────────────────────────────

function PhaseNode({ data }) {
  const isActive = data.status === 'active'
  const isComplete = data.status === 'completed'

  return (
    <div
      style={{
        padding: '12px 20px',
        backgroundColor: isActive
          ? 'var(--accent)'
          : isComplete
          ? 'var(--bg-surface)'
          : 'var(--bg-raised)',
        borderRadius: '8px',
        border: `1px solid ${
          isActive ? 'transparent' : 'var(--border-subtle)'
        }`,
        minWidth: '120px',
        textAlign: 'center'
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 500,
          color: isActive
            ? 'var(--text-inverse)'
            : 'var(--text-primary)',
          letterSpacing: '+0.06em',
          textTransform: 'uppercase',
          margin: 0
        }}
      >
        {data.label}
      </p>
      {data.days_estimate && (
        <p
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '18px',
            fontWeight: 300,
            color: isActive
              ? 'rgba(255,255,255,0.8)'
              : 'var(--text-tertiary)',
            margin: '4px 0 0',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {data.days_estimate}d
        </p>
      )}
    </div>
  )
}

function TaskNode({ data }) {
  const statusColor = {
    completed:   'var(--success)',
    in_progress: 'var(--accent)',
    escalated:   'var(--danger)',
    blocked:     'var(--warning)',
    pending:     'var(--text-tertiary)'
  }[data.status] || 'var(--text-tertiary)'

  return (
    <div
      style={{
        padding: '10px 14px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)',
        maxWidth: '160px',
        borderLeft: `3px solid ${statusColor}`
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--text-primary)',
          margin: 0,
          lineHeight: 1.3,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}
      >
        {data.label}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '10px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          margin: '4px 0 0',
          letterSpacing: '+0.04em',
          textTransform: 'uppercase'
        }}
      >
        {data.role_label}
      </p>
    </div>
  )
}

function DecisionNode({ data }) {
  // Decision nodes pulse to signal urgency
  return (
    <motion.div
      animate={{
        boxShadow: [
          '0 0 0 0 rgba(61, 90, 128, 0)',
          '0 0 0 6px rgba(61, 90, 128, 0.15)',
          '0 0 0 0 rgba(61, 90, 128, 0)'
        ]
      }}
      transition={{ repeat: Infinity, duration: 2 }}
      style={{
        padding: '10px 14px',
        backgroundColor: 'var(--accent-soft)',
        borderRadius: '8px',
        border: '1px solid var(--accent)',
        maxWidth: '160px'
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--accent)',
          letterSpacing: '+0.06em',
          textTransform: 'uppercase',
          margin: '0 0 3px'
        }}
      >
        Your decision
      </p>
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--text-primary)',
          margin: 0,
          lineHeight: 1.3
        }}
      >
        {data.label}
      </p>
    </motion.div>
  )
}

const NODE_TYPES = {
  phase:    PhaseNode,
  task:     TaskNode,
  decision: DecisionNode
}

// ─── CASE DNA DATA TRANSFORMER ────────────────────────────

function transformCaseStateToGraph(caseState) {
  if (!caseState) return { nodes: [], edges: [] }

  const nodes = []
  const edges = []

  const PHASES = [
    { key: 'setup',       label: 'Setup',       x: 100 },
    { key: 'docs',        label: 'Documents',   x: 300 },
    { key: 'negotiation', label: 'Negotiation', x: 500 },
    { key: 'draft',       label: 'Agreement',   x: 700 },
    { key: 'filing',      label: 'Filing',      x: 900 }
  ]

  const currentPhase = caseState.case?.phase_current

  // Add phase nodes in a horizontal line
  PHASES.forEach((phase, idx) => {
    const isActive = phase.key === currentPhase
    const isComplete = PHASES.findIndex(p => p.key === currentPhase) > idx

    nodes.push({
      id:       `phase-${phase.key}`,
      type:     'phase',
      position: { x: phase.x, y: 50 },
      data: {
        label:         phase.label,
        status:        isActive ? 'active' : isComplete ? 'completed' : 'pending',
        days_estimate: getPhaseDaysEstimate(
          phase.key,
          caseState.profile?.ml_prediction_json
        )
      }
    })

    // Edge between consecutive phases
    if (idx < PHASES.length - 1) {
      edges.push({
        id:           `edge-phase-${idx}`,
        source:       `phase-${phase.key}`,
        target:       `phase-${PHASES[idx + 1].key}`,
        type:         'smoothstep',
        style: {
          stroke: isComplete
            ? 'var(--accent)'
            : 'var(--border-default)',
          strokeWidth: 1.5,
          opacity: isComplete ? 0.8 : 0.4
        },
        animated: isActive
      })
    }
  })

  // Add task nodes below their phase
  const tasksByPhase = {}
  ;(caseState.activeTasks || []).forEach(task => {
    const phase = task.phase || 'setup'
    if (!tasksByPhase[phase]) tasksByPhase[phase] = []
    tasksByPhase[phase].push(task)
  })

  Object.entries(tasksByPhase).forEach(([phase, tasks]) => {
    const phaseNode = PHASES.find(p => p.key === phase)
    if (!phaseNode) return

    tasks.forEach((task, taskIdx) => {
      const nodeId = `task-${task.id}`
      nodes.push({
        id:   nodeId,
        type: 'task',
        position: {
          x: phaseNode.x - 60 + (taskIdx % 2) * 80,
          y: 160 + Math.floor(taskIdx / 2) * 90
        },
        data: {
          label:      task.title,
          status:     task.status,
          role_label: ROLE_SHORT[task.professional?.role] || ''
        }
      })

      // Edge from phase to task
      edges.push({
        id:     `edge-${phase}-${task.id}`,
        source: `phase-${phase}`,
        target: nodeId,
        style: {
          stroke: 'var(--border-default)',
          strokeWidth: 1,
          opacity: 0.3
        }
      })
    })
  })

  // Add pending decision nodes
  ;(caseState.decisions || []).forEach((decision, idx) => {
    const nodeId = `decision-${decision.id}`
    nodes.push({
      id:   nodeId,
      type: 'decision',
      position: {
        x: 100 + idx * 200,
        y: 400
      },
      data: { label: decision.title }
    })
  })

  return { nodes, edges }
}

const ROLE_SHORT = {
  lawyer:               'Legal',
  chartered_accountant: 'Finance',
  therapist:            'Wellbeing',
  property_valuator:    'Property',
  mediator:             'Mediation'
}

function getPhaseDaysEstimate(phaseKey, mlPrediction) {
  if (!mlPrediction?.phase_timeline) return null
  const phases = mlPrediction.phase_timeline?.phases || []
  const phase = phases.find(p => p.key === phaseKey)
  return phase?.days || null
}

// ─── MAIN COMPONENT ───────────────────────────────────────

export function CaseDNA({ caseState, isLoading }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => transformCaseStateToGraph(caseState),
    [caseState]
  )

  const [nodes, setNodes, onNodesChange] =
    useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges)

  // Update graph when case state changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } =
      transformCaseStateToGraph(caseState)
    setNodes(newNodes)
    setEdges(newEdges)
  }, [caseState, setNodes, setEdges])

  if (isLoading) {
    return (
      <EmptyState
        screen="caseDna"
      />
    )
  }

  if (!caseState || nodes.length === 0) {
    return (
      <EmptyState
        message="Your case map is being built. Check back in a moment."
      />
    )
  }

  return (
    <div
      style={{
        height: '480px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'
      }}
      aria-label="Case DNA visualization"
      role="figure"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: false }}
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <Background
          color="var(--border-subtle)"
          gap={24}
          size={1}
        />
        <Controls
          style={{
            backgroundColor: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px'
          }}
        />
      </ReactFlow>
    </div>
  )
}
