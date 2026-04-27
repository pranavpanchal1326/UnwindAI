// scripts/verify/verify_4_2.js
const fs = require('fs');
const path = require('path');

async function runVerification() {
  const results = {}
  console.log('PHASE 4.2 — ESCALATION ENGINE VERIFICATION')
  console.log('--------------------------------------------')

  const deadlinePath = path.join(__dirname, '../../lib/agents/deadline.js');
  const content = fs.readFileSync(deadlinePath, 'utf-8');

  // -- CHECK 1: All functions exported (Static Check) --------
  const required = [
    'scanAndEscalate', 'escalateOverdueTask',
    'updateTrustScore', 'recordTaskCompletion',
    'checkDeadManSwitch', 'detectDependencyBlockers',
    'notifyProfessionalOfTask', 'sendTaskReminder'
  ]

  const missing = required.filter(
    fn => !content.includes(`export async function ${fn}`)
  )
  results.allExported = missing.length === 0
  console.log(results.allExported
    ? `? CHECK 1: All ${required.length} functions exported`
    : `? CHECK 1: Missing: ${missing.join(', ')}`
  )

  // -- CHECK 2: ESCALATION_CONFIG values --------------------
  results.configExists = content.includes('const ESCALATION_CONFIG = {');
  console.log(results.configExists
    ? '? CHECK 2: ESCALATION_CONFIG defined'
    : '? CHECK 2: ESCALATION_CONFIG missing'
  )

  // -- CHECK 3: DEMO_MODE check -----------------------------
  results.demoCheck = content.includes("process.env.DEMO_MODE === 'true'");
  console.log(results.demoCheck
    ? '? CHECK 3: DEMO_MODE check present'
    : '? CHECK 3: DEMO_MODE check missing'
  )

  // -- CHECK 4: Trust score clamping ------------------------
  results.trustScoreClamping = content.includes('Math.max(') && content.includes('Math.min(100');
  console.log(results.trustScoreClamping
    ? '? CHECK 4: Trust score clamping logic [0, 100] present'
    : '? CHECK 4: Trust score clamping missing'
  )

  // -- CHECK 5: Dead Man Switch thresholds -------------------
  const dmsThresholds = [
    'checkin_warning_days:    7',
    'pause_tasks_days:        21',
    'freeze_access_days:      45'
  ];
  results.dmsThresholds = dmsThresholds.every(t => content.includes(t));
  console.log(results.dmsThresholds
    ? '? CHECK 5: DMS thresholds (7/21/45 days) correct'
    : '? CHECK 5: DMS thresholds missing or incorrect'
  )

  // -- CHECK 6: Dependency blocker detection logic -----------
  results.blockerLogic = content.includes('blocker_task_id') && content.includes('blockerTask.status !== \'completed\'');
  console.log(results.blockerLogic
    ? '? CHECK 6: Dependency blocker detection logic present'
    : '? CHECK 6: Blocker logic missing'
  )

  // -- CHECK 7: Escalation severity levels -------------------
  results.severityMapping = content.includes('escalationCount >= 3') && content.includes('critical');
  console.log(results.severityMapping
    ? '? CHECK 7: Escalation severity mapping present'
    : '? CHECK 7: Severity mapping missing'
  )

  // -- CHECK 8: withFallback usage ---------------------------
  results.withFallback = content.includes('withFallback(\'deadline\'');
  console.log(results.withFallback
    ? '? CHECK 8: Uses withFallback(\'deadline\')'
    : '? CHECK 8: withFallback usage missing'
  )

  // -- FINAL RESULT -----------------------------------------
  const allPassed = Object.values(results).every(Boolean)
  const passCount = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length

  console.log('\n--------------------------------------------')
  if (!allPassed) {
    const failed = Object.entries(results)
      .filter(([, v]) => !v)
      .map(([k]) => k)
    console.log(`? FAILED: ${failed.join(', ')}`)
    process.exit(1)
  }

  console.log(`
  +-------------------------------------------------------+
  ¦        PHASE 4.2 — ESCALATION ENGINE — COMPLETE          ¦
  ¦-------------------------------------------------------¦
  ¦  Escalation scan ?  Trust scores ?  Dead Man Switch ? ¦
  ¦  Dependency blockers ?  DEMO_MODE ?                    ¦
  ¦  ${passCount}/${total} checks pass                                   ¦
  ¦  ? PROCEED TO PHASE 4.3: SUMMARY AGENT + WHATSAPP        ¦
  +-------------------------------------------------------+
  `)
}

runVerification().catch(console.error)
