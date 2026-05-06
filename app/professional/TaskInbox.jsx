// app/professional/TaskInbox.jsx
'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MESSAGE_VARIANTS,
  TRANSITIONS,
  DURATION
} from '@/lib/constants/animations'
import { EmptyState } from '@/app/components/ui'

/**
 * TaskInbox
 * All pending + active tasks for this professional
 *
 * Task card shows:
 * - Task title + description
 * - Case type + city (never case ID, never user name)
 * - Deadline with relative time
 * - Priority indicator (4px left bar — same system as user dashboard)
 * - Mark complete + cost entry
 * - Escalation count if escalated
 *
 * Role isolation:
 * - Task list was filtered server-side
 * - This component never fetches other professionals' tasks
 * - Case details shown: type + city only — never user PII
 */
export function TaskInbox({
  tasks,
  professionalId,
  role,
  onTaskUpdated
}) {
  const [expandedTask, setExpandedTask] = useState(null)
  const [submittingTask, setSubmittingTask] = useState(null)
  const [costInput, setCostInput] = useState('')

  const PRIORITY_BAR = {
    critical: { color: 'var(--danger)',  pulse: false },
    high:     { color: 'var(--warning)', pulse: false },
    normal:   { color: 'var(--accent)',  pulse: false },
    low:      { color: 'var(--border-strong)', pulse: false }
  }

  const PRIORITY_LABELS = {
    critical: 'Critical',
    high:     'High priority',
    normal:   'Normal',
    low:      'Low priority'
  }

  const CASE_TYPE_LABELS = {
    divorce:     'Divorce',
    inheritance: 'Inheritance',
    property:    'Property',
    business:    'Business',
    nri:         'NRI'
  }

  const handleMarkComplete = useCallback(async (taskId) => {
    setSubmittingTask(taskId)
    try {
      const body = { status: 'completed' }
      const costValue = parseFloat(
        costInput.replace(/[^0-9.]/g, '')
      )
      if (!isNaN(costValue) && costValue > 0) {
        body.actual_cost_inr = costValue
      }

      const response = await fetch(
        `/api/professional/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      )

      if (response.ok) {
        onTaskUpdated?.(taskId, 'completed')
        setExpandedTask(null)
        setCostInput('')
      }
    } catch (err) {
      console.error('[TaskInbox] Update failed:', err)
    } finally {
      setSubmittingTask(null)
    }
  }, [costInput, onTaskUpdated])

  if (tasks.length === 0) {
    return (
      <EmptyState
        screen="deadlines"
        message="No tasks assigned yet. New tasks will appear here when your cases progress."
      />
    )
  }

  // Group by status
  const escalated = tasks.filter(t => t.status === 'escalated')
  const active    = tasks.filter(t => t.status === 'in_progress')
  const pending   = tasks.filter(t => t.status === 'pending')

  const groups = [
    { label: 'Escalated', tasks: escalated, urgent: true  },
    { label: 'In progress', tasks: active,   urgent: false },
    { label: 'Pending',     tasks: pending,  urgent: false }
  ].filter(g => g.tasks.length > 0)

  return (
    <div>
      {groups.map(group => (
        <div key={group.label} style={{ marginBottom: '32px' }}>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 500,
              color: group.urgent
                ? 'var(--danger)'
                : 'var(--text-tertiary)',
              letterSpacing: '+0.08em',
              textTransform: 'uppercase',
              margin: '0 0 12px'
            }}
          >
            {group.label} · {group.tasks.length}
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
            role="list"
            aria-label={`${group.label} tasks`}
          >
            <AnimatePresence mode="popLayout">
              {group.tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isExpanded={expandedTask === task.id}
                  onToggle={() => setExpandedTask(
                    expandedTask === task.id ? null : task.id
                  )}
                  onComplete={() => handleMarkComplete(task.id)}
                  isSubmitting={submittingTask === task.id}
                  costInput={costInput}
                  onCostChange={setCostInput}
                  priorityBar={
                    PRIORITY_BAR[task.priority] ||
                    PRIORITY_BAR.normal
                  }
                  priorityLabel={
                    PRIORITY_LABELS[task.priority] || 'Normal'
                  }
                  caseTypeLabel={
                    CASE_TYPE_LABELS[
                      task.cases?.case_type
                    ] || 'Case'
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  )
}

function TaskCard({
  task,
  isExpanded,
  onToggle,
  onComplete,
  isSubmitting,
  costInput,
  onCostChange,
  priorityBar,
  priorityLabel,
  caseTypeLabel
}) {
  const isOverdue = task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== 'completed'

  const isEscalated = task.status === 'escalated'

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'
      }}
      role="listitem"
    >
      {/* Task card header — always visible */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
          display: 'flex'
        }}
        aria-expanded={isExpanded}
        aria-label={`Task: ${task.title}`}
      >
        {/* Priority bar — 4px left border system */}
        <div
          style={{
            width: '4px',
            flexShrink: 0,
            backgroundColor: isEscalated
              ? 'var(--danger)'
              : isOverdue
              ? 'var(--warning)'
              : priorityBar.color,
            alignSelf: 'stretch'
          }}
          aria-hidden="true"
        />

        <div
          style={{
            flex: 1,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Case context — type + city only, never user PII */}
            <p
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '11px',
                fontWeight: 400,
                color: 'var(--text-tertiary)',
                margin: '0 0 3px',
                letterSpacing: '+0.04em',
                textTransform: 'uppercase'
              }}
            >
              {caseTypeLabel}
              {task.cases?.city && ` · ${
                task.cases.city
                  .charAt(0).toUpperCase() +
                task.cases.city.slice(1)
              }`}
            </p>

            {/* Task title */}
            <p
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '14px',
                fontWeight: 500,
                color: isEscalated
                  ? 'var(--danger)'
                  : 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: isExpanded ? 'normal' : 'nowrap'
              }}
            >
              {isEscalated && '⚠ '}
              {task.title}
            </p>
          </div>

          {/* Deadline */}
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            {task.deadline ? (
              <p
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '12px',
                  fontWeight: 400,
                  color: isOverdue
                    ? 'var(--danger)'
                    : 'var(--text-tertiary)',
                  margin: 0
                }}
              >
                {formatDeadline(task.deadline)}
              </p>
            ) : (
              <p
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '12px',
                  color: 'var(--text-disabled)',
                  margin: 0
                }}
              >
                No deadline
              </p>
            )}
          </div>
        </div>
      </button>

      {/* Expanded: description + complete action */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={TRANSITIONS.standard}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '0 20px 20px 24px',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              {/* Description */}
              {task.description && (
                <p
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '13px',
                    fontWeight: 400,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    margin: '16px 0 20px'
                  }}
                >
                  {task.description}
                </p>
              )}

              {/* Escalation warning */}
              {isEscalated && task.escalation_count > 0 && (
                <div
                  style={{
                    backgroundColor: 'var(--danger-soft)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginBottom: '16px'
                  }}
                  role="alert"
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-general-sans)',
                      fontSize: '12px',
                      fontWeight: 400,
                      color: 'var(--danger)',
                      margin: 0
                    }}
                  >
                    This task has been escalated{' '}
                    {task.escalation_count} time
                    {task.escalation_count > 1 ? 's' : ''}.
                    Please update or request an extension.
                  </p>
                </div>
              )}

              {/* Cost entry */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor={`cost-${task.id}`}
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--text-tertiary)',
                    letterSpacing: '+0.06em',
                    textTransform: 'uppercase',
                    marginBottom: '6px'
                  }}
                >
                  Actual cost (₹) — optional
                </label>
                <input
                  id={`cost-${task.id}`}
                  type="text"
                  inputMode="numeric"
                  value={costInput}
                  onChange={e => onCostChange(e.target.value)}
                  placeholder={
                    task.predicted_cost_inr
                      ? `Predicted: ₹${Math.round(
                          task.predicted_cost_inr
                        ).toLocaleString('en-IN')}`
                      : 'Enter amount'
                  }
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-raised)',
                    border: 'none',
                    borderBottom: '2px solid var(--border-default)',
                    borderRadius: 0,
                    padding: '10px 0',
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    caretColor: 'var(--accent)',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => {
                    e.target.style.borderBottomColor =
                      'var(--border-focus)'
                  }}
                  onBlur={e => {
                    e.target.style.borderBottomColor =
                      'var(--border-default)'
                  }}
                  aria-label="Actual cost in rupees"
                />
              </div>

              {/* Complete button */}
              <motion.button
                onClick={onComplete}
                disabled={isSubmitting}
                whileTap={{ scale: 0.98 }}
                transition={TRANSITIONS.standard}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  backgroundColor: 'var(--accent)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text-inverse)',
                  opacity: isSubmitting ? 0.6 : 1
                }}
                aria-busy={isSubmitting}
              >
                {isSubmitting
                  ? 'Marking complete...'
                  : 'Mark as complete'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function formatDeadline(isoDate) {
  const date = new Date(isoDate)
  const now  = new Date()
  const diff = date - now
  const days = Math.round(diff / 86400000)

  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days < 7) return `${days} days left`
  return date.toLocaleDateString('en-IN', {
    month: 'short', day: 'numeric'
  })
}
