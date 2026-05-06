// app/professional/ProfessionalDashboard.jsx
'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PAGE_VARIANTS,
  MESSAGE_VARIANTS,
  TRANSITIONS
} from '@/lib/constants/animations'
import {
  useProfessionalTaskInbox
} from '@/lib/realtime/useChannel'
import { ProfessionalHeader } from './ProfessionalHeader'
import { TaskInbox } from './TaskInbox'
import { DocumentAccessPanel } from './DocumentAccessPanel'
import { TrustScoreCard } from './TrustScoreCard'

/**
 * ProfessionalDashboard
 * Main portal for approved professionals
 *
 * Three columns:
 * Left (main):   TaskInbox — all pending + active tasks
 * Right top:     TrustScoreCard — score + trend
 * Right bottom:  DocumentAccessPanel — allowed docs only
 *
 * Role isolation enforced:
 * - Tasks filtered server-side — only their tasks
 * - Documents filtered by role — server-side
 * - No cross-professional data ever shown
 */
export function ProfessionalDashboard({
  professional,
  tasks: initialTasks,
  accessibleDocuments,
  trustHistory
}) {
  const [tasks, setTasks] = useState(initialTasks)

  // ─── REALTIME: NEW TASKS ───────────────────────────────────
  useProfessionalTaskInbox(
    professional.id,
    useCallback((newTask) => {
      setTasks(prev => {
        if (prev.some(t => t.id === newTask.task_id)) return prev
        return [
          {
            id:       newTask.task_id,
            case_id:  newTask.case_id,
            title:    newTask.title,
            deadline: newTask.deadline,
            priority: newTask.priority,
            status:   'pending',
            escalation_count: 0,
            cases: null
            // Full case data loaded on click
          },
          ...prev
        ]
      })
    }, [])
  )

  const ROLE_LABELS = {
    lawyer:               'Legal',
    chartered_accountant: 'Finance',
    therapist:            'Wellbeing',
    property_valuator:    'Property',
    mediator:             'Mediation'
  }

  return (
    <motion.div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-base)'
      }}
      initial="hidden"
      animate="visible"
      variants={PAGE_VARIANTS}
    >
      <ProfessionalHeader
        professional={professional}
        activeTaskCount={tasks.filter(
          t => t.status !== 'completed' &&
               t.status !== 'cancelled'
        ).length}
        roleLabel={ROLE_LABELS[professional.role]}
      />

      <div
        className="mx-auto px-6"
        style={{
          maxWidth: '1080px',
          paddingTop: '32px',
          paddingBottom: '80px'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 300px',
            gap: '28px',
            alignItems: 'start'
          }}
        >
          {/* Main: Task inbox */}
          <main aria-label="Your tasks">
            <TaskInbox
              tasks={tasks}
              professionalId={professional.id}
              role={professional.role}
              onTaskUpdated={(taskId, newStatus) => {
                setTasks(prev =>
                  prev.map(t =>
                    t.id === taskId
                      ? { ...t, status: newStatus }
                      : t
                  )
                )
              }}
            />
          </main>

          {/* Sidebar */}
          <aside>
            <TrustScoreCard
              score={professional.trust_score}
              history={trustHistory}
              casesCompleted={professional.cases_completed}
              avgCompletionDays={
                professional.average_completion_days
              }
            />

            <div style={{ marginTop: '20px' }}>
              <DocumentAccessPanel
                documents={accessibleDocuments}
                role={professional.role}
                professionalId={professional.id}
              />
            </div>
          </aside>
        </div>
      </div>
    </motion.div>
  )
}
