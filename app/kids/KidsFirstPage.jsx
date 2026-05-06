// app/kids/KidsFirstPage.jsx
'use client'
// Phase 9.2: KidsFirst module
// Custody schedule builder — visual, simple, child-focused
// Co-parenting communication template generator

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PAGE_VARIANTS,
  MESSAGE_VARIANTS,
  TRANSITIONS
} from '@/lib/constants/animations'

/**
 * KidsFirstPage
 * Everything is designed for one goal:
 * making this process less confusing for children.
 *
 * No legal language. No adversarial framing.
 * "Co-parenting schedule" not "custody arrangement".
 * "What works for your child" not "visitation rights".
 *
 * Features:
 * 1. Weekly schedule builder — visual drag-to-assign
 * 2. Holiday schedule planner
 * 3. Co-parenting message templates
 * 4. Child preference notes (for mediator)
 */
export function KidsFirstPage({
  caseId,
  userId,
  childrenCount,
  childrenAges
}) {
  const [activeTab, setActiveTab] = useState('schedule')
  const [weeklySchedule, setWeeklySchedule] = useState(
    getDefaultSchedule()
  )
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [copiedMessage, setCopiedMessage] = useState(false)

  const DAYS = [
    'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday', 'Sunday'
  ]

  const PARENTS = ['Parent A', 'Parent B', 'Both']

  const MESSAGE_TEMPLATES = [
    {
      id:       'school_update',
      label:    'School update',
      template: 'Wanted to share a quick update about ' +
        '[Child\'s name]\'s school: [update]. ' +
        'Let me know if you have any questions.'
    },
    {
      id:       'schedule_change',
      label:    'Schedule change',
      template: 'Would it work to adjust this week\'s ' +
        'schedule? I was hoping [Child\'s name] could ' +
        '[proposed change]. Let me know what you think.'
    },
    {
      id:       'medical',
      label:    'Medical update',
      template: '[Child\'s name] had a [appointment type] ' +
        'appointment today. [Brief summary]. ' +
        'I\'ll share the paperwork.'
    },
    {
      id:       'activity',
      label:    'Activity / event',
      template: '[Child\'s name] has been invited to ' +
        '[event/activity] on [date]. ' +
        'Would you like to come?'
    }
  ]

  const noChildren = childrenCount === 0

  if (noChildren) {
    return (
      <motion.div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}
        initial="hidden"
        animate="visible"
        variants={PAGE_VARIANTS}
      >
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '14px',
              color: 'var(--text-tertiary)',
              lineHeight: 1.6
            }}
          >
            The KidsFirst module is for cases involving children.
            Your case profile shows no children.
            If this is incorrect, update your case profile.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}
      initial="hidden"
      animate="visible"
      variants={PAGE_VARIANTS}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: 'var(--bg-base)',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div
          className="mx-auto px-6"
          style={{
            maxWidth: '780px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <span
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '15px',
                fontWeight: 500,
                color: 'var(--text-primary)'
              }}
            >
              KidsFirst
            </span>
            {childrenCount > 0 && (
              <span
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  marginLeft: '10px'
                }}
              >
                {childrenCount}{' '}
                {childrenCount === 1 ? 'child' : 'children'}
                {childrenAges.length > 0 &&
                  ` · ages ${childrenAges.join(', ')}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className="mx-auto px-6"
        style={{
          maxWidth: '780px',
          paddingTop: '32px',
          paddingBottom: '80px'
        }}
      >
        {/* Tab navigation */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '32px'
          }}
          role="tablist"
        >
          {[
            { id: 'schedule',  label: 'Schedule' },
            { id: 'holidays',  label: 'Holidays' },
            { id: 'messages',  label: 'Co-parenting messages' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 500 : 400,
                color: activeTab === tab.id
                  ? 'var(--text-primary)'
                  : 'var(--text-tertiary)',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
                cursor: 'pointer',
                padding: '12px 20px',
                marginBottom: '-1px',
                transition: `all ${TRANSITIONS.standard.duration}s`
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* Schedule tab */}
          {activeTab === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSITIONS.standard}
            >
              <p
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: '0 0 28px',
                  maxWidth: '52ch'
                }}
              >
                Build a weekly schedule that keeps things
                consistent for your child.
                Tap each day to assign.
              </p>

              {/* Weekly schedule grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '8px',
                  marginBottom: '24px'
                }}
                role="group"
                aria-label="Weekly schedule"
              >
                {DAYS.map((day, i) => {
                  const assignment = weeklySchedule[day] || 'None'
                  const color = assignment === 'Parent A'
                    ? 'var(--accent)'
                    : assignment === 'Parent B'
                    ? 'var(--success)'
                    : assignment === 'Both'
                    ? 'var(--warning)'
                    : 'var(--border-default)'

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        const options = [
                          'Parent A', 'Parent B', 'Both', 'None'
                        ]
                        const currentIdx = options.indexOf(
                          weeklySchedule[day] || 'None'
                        )
                        const nextIdx =
                          (currentIdx + 1) % options.length
                        setWeeklySchedule(prev => ({
                          ...prev,
                          [day]: options[nextIdx]
                        }))
                      }}
                      style={{
                        padding: '12px 6px',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: '10px',
                        border: `2px solid ${color}`,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                      aria-label={`${day}: ${assignment}`}
                    >
                      <p
                        style={{
                          fontFamily: 'var(--font-general-sans)',
                          fontSize: '10px',
                          fontWeight: 500,
                          color: 'var(--text-tertiary)',
                          letterSpacing: '+0.04em',
                          textTransform: 'uppercase',
                          margin: '0 0 6px'
                        }}
                      >
                        {day.slice(0, 3)}
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--font-general-sans)',
                          fontSize: '10px',
                          fontWeight: 500,
                          color,
                          margin: 0
                        }}
                      >
                        {assignment === 'None' ? '—' : assignment}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div
                style={{
                  display: 'flex',
                  gap: '20px',
                  flexWrap: 'wrap'
                }}
                aria-label="Schedule legend"
              >
                {[
                  { label: 'Parent A', color: 'var(--accent)' },
                  { label: 'Parent B', color: 'var(--success)' },
                  { label: 'Both',     color: 'var(--warning)' },
                  { label: 'Unassigned', color: 'var(--border-default)' }
                ].map(item => (
                  <div
                    key={item.label}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '2px',
                        backgroundColor: item.color
                      }}
                      aria-hidden="true"
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-general-sans)',
                        fontSize: '11px',
                        color: 'var(--text-tertiary)'
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Save schedule */}
              <button
                onClick={async () => {
                  await fetch(`/api/cases/${caseId}/kids/schedule`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      weekly_schedule: weeklySchedule
                    })
                  })
                }}
                style={{
                  marginTop: '24px',
                  padding: '12px 24px',
                  backgroundColor: 'var(--accent)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text-inverse)'
                }}
              >
                Save schedule for mediator
              </button>
            </motion.div>
          )}

          {/* Messages tab */}
          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: '0 0 28px',
                  maxWidth: '52ch'
                }}
              >
                Keep co-parenting communication clear and
                child-focused. These templates help.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {MESSAGE_TEMPLATES.map(tmpl => (
                  <motion.div
                    key={tmpl.id}
                    variants={MESSAGE_VARIANTS}
                    initial="hidden"
                    animate="visible"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: '10px',
                      padding: '16px 20px',
                      cursor: 'pointer',
                      border: selectedMessage === tmpl.id
                        ? '1px solid var(--accent)'
                        : '1px solid var(--border-subtle)'
                    }}
                    onClick={() => setSelectedMessage(
                      selectedMessage === tmpl.id ? null : tmpl.id
                    )}
                  >
                    <p
                      style={{
                        fontFamily: 'var(--font-general-sans)',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        margin: '0 0 6px'
                      }}
                    >
                      {tmpl.label}
                    </p>

                    <AnimatePresence>
                      {selectedMessage === tmpl.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={TRANSITIONS.standard}
                        >
                          <p
                            style={{
                              fontFamily: 'var(--font-general-sans)',
                              fontSize: '13px',
                              color: 'var(--text-secondary)',
                              lineHeight: 1.6,
                              margin: '0 0 12px',
                              fontStyle: 'italic'
                            }}
                          >
                            {tmpl.template}
                          </p>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              await navigator.clipboard
                                .writeText(tmpl.template)
                                .catch(() => {})
                              setCopiedMessage(tmpl.id)
                              setTimeout(
                                () => setCopiedMessage(null), 2000
                              )
                            }}
                            style={{
                              fontFamily: 'var(--font-general-sans)',
                              fontSize: '11px',
                              fontWeight: 500,
                              color: copiedMessage === tmpl.id
                                ? 'var(--success)'
                                : 'var(--accent)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              letterSpacing: '+0.04em',
                              textTransform: 'uppercase'
                            }}
                          >
                            {copiedMessage === tmpl.id
                              ? 'Copied'
                              : 'Copy template'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Holidays tab */}
          {activeTab === 'holidays' && (
            <motion.div
              key="holidays"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: '0 0 20px',
                  maxWidth: '52ch'
                }}
              >
                Plan how your child spends important dates.
                These notes go to your mediator.
              </p>

              <HolidayPlanner
                caseId={caseId}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── HOLIDAY PLANNER ──────────────────────────────────────

function HolidayPlanner({ caseId }) {
  const HOLIDAYS = [
    'Diwali', 'Christmas', 'Eid', 'Holi',
    'New Year', 'Child\'s Birthday',
    'Mother\'s Day', 'Father\'s Day',
    'Summer Holidays'
  ]

  const [assignments, setAssignments] = useState({})

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      {HOLIDAYS.map(holiday => (
        <div
          key={holiday}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '8px',
            gap: '12px'
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '13px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              flex: 1
            }}
          >
            {holiday}
          </span>

          <div style={{ display: 'flex', gap: '6px' }}>
            {['A', 'B', 'Both', '?'].map(option => (
              <button
                key={option}
                onClick={() => setAssignments(prev => ({
                  ...prev, [holiday]: option
                }))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: assignments[holiday] === option
                    ? 'var(--accent)'
                    : 'var(--border-subtle)',
                  backgroundColor: assignments[holiday] === option
                    ? 'var(--accent-soft)'
                    : 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: assignments[holiday] === option
                    ? 'var(--accent)'
                    : 'var(--text-tertiary)'
                }}
                aria-label={`${holiday}: ${option}`}
                aria-pressed={assignments[holiday] === option}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={async () => {
          await fetch(`/api/cases/${caseId}/kids/holidays`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ holiday_plan: assignments })
          })
        }}
        style={{
          marginTop: '8px',
          padding: '12px 24px',
          backgroundColor: 'var(--accent)',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-inverse)'
        }}
      >
        Save holiday plan for mediator
      </button>
    </div>
  )
}

// ─── HELPERS ──────────────────────────────────────────────
function getDefaultSchedule() {
  return {
    Monday:    'Parent A',
    Tuesday:   'Parent A',
    Wednesday: 'Parent B',
    Thursday:  'Parent B',
    Friday:    'Parent A',
    Saturday:  'Both',
    Sunday:    'Both'
  }
}
