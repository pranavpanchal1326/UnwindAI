"use client"

// DEVELOPMENT ONLY — delete before production
// Route: /dev/components
// Visually verify every component renders correctly
// Run through this before declaring Phase 0 complete

import { useState } from "react"
import {
  Button, Card, Badge, Input, Toggle,
  Skeleton, Modal, PrivateMode, EmptyState,
  RiskBadge, TrustBadge, ErrorCard, EMPTY_STATES,
} from "@components/ui"

export default function ComponentShowcase() {
  const [modalOpen, setModalOpen] = useState(false)
  const [toggleOn,  setToggleOn]  = useState(false)

  return (
    <div className="min-h-screen bg-bg-primary p-8 flex flex-col gap-12">
      <h1 className="text-3xl font-bold text-text-primary">
        UnwindAI — Component Showcase
      </h1>

      {/* ── Buttons ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl text-text-primary">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="lg">Large</Button>
        </div>
      </section>

      {/* ── Badges ──────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl text-text-primary">Badges</h2>
        <div className="flex flex-wrap gap-3">
          <Badge variant="success">Active</Badge>
          <Badge variant="warning">At Risk</Badge>
          <Badge variant="danger">Critical</Badge>
          <Badge variant="indigo">Recommended</Badge>
          <Badge variant="info">Pending</Badge>
          <Badge variant="muted">Archived</Badge>
        </div>
      </section>

      {/* ── Input ───────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 max-w-sm">
        <h2 className="text-xl text-text-primary">Input</h2>
        <Input label="Email address" placeholder="you@example.com" />
        <Input label="With error" error="Something went wrong. Try again." />
        <Input label="With helper" helper="We will send a secure link here." />
      </section>

      {/* ── Toggle ──────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl text-text-primary">Toggle</h2>
        <Toggle
          checked={toggleOn}
          onChange={setToggleOn}
          label="EmotionShield"
          description="Monitor my messages for signs of distress (opt-in)"
        />
      </section>

      {/* ── Skeleton ────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 max-w-sm">
        <h2 className="text-xl text-text-primary">Skeleton</h2>
        <Skeleton variant="title" />
        <Skeleton variant="text" lines={3} />
        <Skeleton variant="card" />
        <Skeleton variant="bar" />
        <div className="flex gap-3">
          <Skeleton variant="avatar" />
          <Skeleton variant="circle" size="w-12 h-12" />
        </div>
      </section>

      {/* ── RiskBadge ───────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-6">
        <h2 className="text-xl text-text-primary">RiskBadge</h2>
        {/* Compact badges — verify: 33=green, 34=amber, 67=red */}
        <div className="flex flex-wrap gap-3 items-center">
          <RiskBadge score={20} size="sm" />
          <RiskBadge score={33} size="sm" />
          <RiskBadge score={34} size="sm" />
          <RiskBadge score={50} size="sm" />
          <RiskBadge score={66} size="sm" />
          <RiskBadge score={67} size="sm" />
          <RiskBadge score={80} size="sm" />
        </div>
        {/* Medium with score */}
        <div className="flex flex-wrap gap-4 items-center">
          <RiskBadge score={34} size="md" showScore showLabel />
          <RiskBadge score={67} size="md" showScore showLabel />
        </div>
        {/* Large with bar + factors */}
        <div className="max-w-xs">
          <RiskBadge
            score={34}
            size="lg"
            showScore
            showBar
            factors={[
              "Child custody complexity adds time",
              "Pune court backlog above average",
            ]}
          />
        </div>
      </section>

      {/* ── TrustBadge ──────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl text-text-primary">TrustBadge</h2>
        {/* Verify: 89=silver not gold, 74=blue not silver, 59=nothing */}
        <div className="flex flex-wrap gap-3 items-center">
          <TrustBadge score={95} size="sm" />
          <TrustBadge score={90} size="sm" />
          <TrustBadge score={89} size="sm" />
          <TrustBadge score={82} size="sm" />
          <TrustBadge score={75} size="sm" />
          <TrustBadge score={74} size="sm" />
          <TrustBadge score={64} size="sm" />
          <TrustBadge score={60} size="sm" />
          <TrustBadge score={59} size="sm" /> {/* renders nothing */}
          <TrustBadge score={40} size="sm" /> {/* renders nothing */}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <TrustBadge score={95} size="md" showScore />
          <TrustBadge score={82} size="md" showScore />
          <TrustBadge score={64} size="md" showScore />
        </div>
      </section>

      {/* ── ErrorCard ───────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 max-w-md">
        <h2 className="text-xl text-text-primary">ErrorCard</h2>
        {/* Soft: spinning icon, muted border, no retry */}
        <ErrorCard type="soft" context="your case update" />
        {/* Hard: amber border, retry button visible */}
        <ErrorCard type="hard" context="your update"
          onRetry={() => alert("Retrying...")} />
        {/* Critical: red border, shield icon, NO retry button */}
        <ErrorCard type="critical" />
      </section>

      {/* ── EmptyState ──────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 max-w-md">
        <h2 className="text-xl text-text-primary">EmptyState</h2>
        <Card>
          <EmptyState screen="decisions" />
        </Card>
        <Card>
          <EmptyState screen="documents" />
        </Card>
        <Card>
          <EmptyState screen="professionals" />
        </Card>
      </section>

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl text-text-primary">Modal</h2>
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Test Modal"
          size="md"
        >
          <p className="text-text-secondary text-sm">
            This modal is focus-trapped. Tab key cycles within it.
            Escape or X button closes it.
          </p>
          <div className="mt-4 flex gap-3">
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Confirm
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </Modal>
      </section>

      {/* ── PrivateMode ─────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl text-text-primary">PrivateMode</h2>
        <p className="text-text-secondary text-sm">
          Shield icon appears bottom-right of the page.
          Tap it or press Ctrl+Shift+P to activate.
          Tap anywhere on black screen to deactivate.
        </p>
      </section>

    </div>
  )
}
