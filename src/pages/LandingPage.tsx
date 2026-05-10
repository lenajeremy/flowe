import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { SavedWorkflow } from '@/lib/workflowApi'

// ── Feature primitives ────────────────────────────────────────

const PRIMITIVES = [
  {
    label: 'Trigger',
    description: 'Start from CRM events, webhooks, schedules, file uploads, or direct API calls from your code.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <path d="M10 2L4 10h6l-2 6 8-10h-6l2-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: 'State',
    description: 'A shared state object every step can read and write — customer, documents, risk score, decision.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <ellipse cx="9" cy="5" rx="6" ry="2.2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M3 5v4c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M3 9v4c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V9" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    label: 'Steps',
    description: 'Every node maps to a clear operation — fetch data, run AI, branch, wait for approval, send action.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <rect x="1.5" y="2" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="11.5" y="7" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1.5" y="12" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6.5 4H9a2 2 0 012 2v.5M9 13.5h1.5a2 2 0 002-2V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'AI Outputs',
    description: 'AI steps return structured data — summary, classification, confidence, next_action — not just free text.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <path d="M9 2l1.5 4H15l-3.6 2.6 1.4 4.4L9 10.5l-3.8 2.5 1.4-4.4L3 6h4.5L9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: 'Actions',
    description: 'Produce real outcomes — send email, update Airtable, create PDFs, post to Slack, open tickets.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <path d="M9 1.5v3M9 13.5v3M1.5 9h3M13.5 9h3M3.7 3.7l2.1 2.1M12.2 12.2l2.1 2.1M3.7 14.3l2.1-2.1M12.2 5.8l2.1-2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Observability',
    description: 'Full execution trace per run — input received, prompt sent, model output, parsed result, action taken.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <ellipse cx="9" cy="9" rx="7" ry="4.5" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
]

// ── Workflow steps (shown as prompt cards) ────────────────────

const STEPS = [
  { n: '01', text: 'Trigger on a new inbound lead from your CRM or webhook' },
  { n: '02', text: 'Fetch company data, enrich with external APIs automatically' },
  { n: '03', text: 'AI step — qualify the lead and score it 0–100' },
  { n: '04', text: 'AI step — generate personalised outreach copy' },
  { n: '05', text: 'Branch on lead score threshold, route to the right team' },
  { n: '06', text: 'Send email or create a review task for a human' },
  { n: '07', text: 'Write results and audit trail back to the CRM' },
]

// ── Code snippet ──────────────────────────────────────────────

const CODE = `const run = await workflowClient.trigger(
  "qualify-inbound-lead",
  {
    input: {
      leadId:    "lead_123",
      companyId: "company_456",
      source:    "signup-form",
    },
  }
)`

function CodeBlock() {
  const lines = CODE.split('\n')
  return (
    <div
      className="overflow-hidden rounded-2xl text-[13px] leading-relaxed"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset',
      }}
    >
      <div
        className="flex items-center gap-1.5 px-4 py-2.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
        <span className="ml-2 text-[11px] text-white/30">trigger.ts</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-white/80">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-4">
            <span className="w-5 flex-shrink-0 select-none text-right text-white/20">
              {i + 1}
            </span>
            <span dangerouslySetInnerHTML={{ __html: highlight(line) }} />
          </div>
        ))}
      </pre>
    </div>
  )
}

function highlight(line: string): string {
  return line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /\b(const|await|return)\b/g,
      '<span style="color:#7dd3fc">$1</span>',
    )
    .replace(
      /"([^"]+)"/g,
      '<span style="color:#86efac">"$1"</span>',
    )
    .replace(
      /\b(workflowClient)\b/g,
      '<span style="color:#c4b5fd">$1</span>',
    )
}

// ── Nav ───────────────────────────────────────────────────────

function Nav({ onOpen }: { onOpen: () => void }) {
  const navigate = useNavigate()
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.7)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
              <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z" stroke="black" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className="text-[15px] font-semibold">workflow-ai</span>
        </button>

        <nav className="hidden md:flex items-center gap-7">
          {['Features', 'Docs', 'Pricing'].map((item) => (
            <span key={item} className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors">
              {item}
            </span>
          ))}
        </nav>

        <button
          onClick={onOpen}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:opacity-90"
          style={{ boxShadow: '0 0 20px rgba(255,255,255,0.15)' }}
        >
          Open app
        </button>
      </div>
    </header>
  )
}

// ── Hero visual ───────────────────────────────────────────────

const HERO_STEPS = [
  { label: 'Trigger: new lead received',     status: 'done'    },
  { label: 'Fetch CRM & company data',        status: 'done'    },
  { label: 'AI — qualify & score the lead',   status: 'running' },
  { label: 'Branch on score threshold',       status: 'pending' },
  { label: 'Send personalised outreach',      status: 'pending' },
]

function HeroVisual() {
  return (
    /* Outer: looks like a dark app screenshot frame */
    <div
      className="overflow-hidden rounded-3xl p-5"
      style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 2px 40px rgba(0,0,0,0.6)',
      }}
    >
      {/* Inner card — elevated dark surface */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-bold text-white leading-tight">Qualify inbound lead</p>
            <p className="mt-0.5 text-[12px] text-white/35">workflow · 5 steps</p>
          </div>
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-amber-400"
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.18)' }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            Running
          </span>
        </div>

        {/* Step list */}
        <div className="flex flex-col">
          {HERO_STEPS.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2.5"
              style={i < HERO_STEPS.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : {}}
            >
              <div
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={
                  step.status === 'done'
                    ? { background: 'rgba(52,211,153,0.12)', color: '#34d399' }
                    : step.status === 'running'
                    ? { background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.18)' }
                }
              >
                {step.status === 'done' ? '✓' : step.status === 'running' ? '●' : '○'}
              </div>
              <span
                className="text-[13px] leading-snug"
                style={{ color: step.status === 'pending' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.75)' }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="mt-4 flex items-center justify-between pt-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="text-[11px] text-white/25">Scoring in progress…</span>
          <span className="text-[12px] font-semibold text-white/40">2 / 5 done</span>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Workflow', nodes: [], edges: [] }),
      })
      const wf = await res.json() as SavedWorkflow
      navigate(`/workflow/${wf.id}`)
    } catch {
      navigate('/workflows')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'var(--font-sans)' }}>
      <Nav onOpen={() => navigate('/workflows')} />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">

          {/* Left: heading + CTA */}
          <div>
            {/* Badge */}
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] text-white/50"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              AI workflow builder for businesses
            </div>

            <h1 className="mb-6 text-[3.25rem] font-bold leading-[1.08] tracking-tight text-white lg:text-[4.25rem]">
              Orchestrate AI workflows your way
            </h1>

            <p className="mb-10 max-w-lg text-[1.0625rem] leading-relaxed text-white/50">
              Connect data sources, run structured AI steps, branch on decisions,
              trigger real actions — and inspect every run from input to output.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {/* Primary CTA */}
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:opacity-90 disabled:opacity-50"
                style={{ boxShadow: '0 0 24px rgba(255,255,255,0.18)' }}
              >
                {creating ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
                    <circle cx="6" cy="6" r="4.5" stroke="black" strokeWidth="1.5" strokeOpacity="0.3"/>
                    <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M5.5 1v9M1 5.5h9" stroke="black" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                )}
                New workflow
              </button>

              {/* Secondary CTA */}
              <button
                onClick={() => navigate('/workflows')}
                className="rounded-full px-6 py-3 text-sm font-semibold text-white/70 transition-all hover:text-white"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(255,255,255,0.18)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'
                  ;(e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(255,255,255,0.1)'
                }}
              >
                View all workflows
              </button>
            </div>
          </div>

          {/* Right: dark gradient visual */}
          <HeroVisual />
        </div>
      </section>

      {/* ── Category pills ── */}
      <div className="mx-auto max-w-6xl px-6 pb-20">
        <div className="flex flex-wrap gap-2">
          {['Lead qualification', 'Document review', 'Content generation', 'Data enrichment', 'Support triage'].map((tag) => (
            <span
              key={tag}
              className="cursor-pointer rounded-full px-4 py-2 text-sm text-white/40 transition-all hover:text-white"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Primitives ── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-[2.25rem] font-bold tracking-tight text-white lg:text-[2.75rem]">
          Everything a repeatable<br />AI operation needs
        </h2>
        <p className="mb-12 max-w-xl text-white/40">
          Six primitives that give your AI workflows structure, reliability, and full observability.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRIMITIVES.map((p) => (
            <div
              key={p.label}
              className="group cursor-default rounded-2xl p-6 transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = 'rgba(255,255,255,0.06)'
                el.style.border = '1px solid rgba(255,255,255,0.14)'
                el.style.boxShadow = '0 0 40px rgba(255,255,255,0.03)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = 'rgba(255,255,255,0.03)'
                el.style.border = '1px solid rgba(255,255,255,0.07)'
                el.style.boxShadow = ''
              }}
            >
              <div className="mb-4 text-white/30 transition-colors group-hover:text-white/60">{p.icon}</div>
              <h3 className="mb-2 text-base font-semibold text-white">{p.label}</h3>
              <p className="text-[13px] leading-relaxed text-white/40">{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Workflow steps as prompt cards ── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-[2.25rem] font-bold tracking-tight text-white lg:text-[2.75rem]">
            More ways to build workflows
          </h2>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 pl-6 pr-6" style={{ scrollbarWidth: 'none' }}>
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="group relative flex w-72 flex-shrink-0 cursor-pointer flex-col justify-between rounded-2xl p-5 transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = 'rgba(255,255,255,0.07)'
                el.style.border = '1px solid rgba(255,255,255,0.15)'
                el.style.boxShadow = '0 0 30px rgba(255,255,255,0.03)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = 'rgba(255,255,255,0.04)'
                el.style.border = '1px solid rgba(255,255,255,0.08)'
                el.style.boxShadow = ''
              }}
            >
              <p className="mb-8 text-[14px] leading-relaxed text-white/75">{s.text}</p>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-all"
                style={{ boxShadow: '0 0 12px rgba(255,255,255,0.12)' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 8L8 2M8 2H4M8 2v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trigger from code ── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">
              Programmatic trigger
            </p>
            <h2 className="mb-4 text-[1.75rem] font-bold tracking-tight text-white">
              Trigger from anywhere in your stack
            </h2>
            <p className="mb-8 text-[14px] leading-relaxed text-white/40">
              Start a workflow run directly from application code — inside product flows,
              backend jobs, internal tools, or third-party integrations.
            </p>

            <ul className="flex flex-col gap-3">
              {[
                'Start by workflow ID or slug',
                'Pass structured input data',
                'Sync or async execution modes',
                'Auth, rate limits, idempotency built-in',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/50">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-white/60">
                    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <CodeBlock />
          </div>
        </div>
      </section>

      {/* ── Bottom CTA card ── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div
          className="flex flex-col items-start justify-between gap-6 rounded-2xl px-8 py-8 sm:flex-row sm:items-center"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 0 60px rgba(255,255,255,0.02) inset',
          }}
        >
          <h2 className="text-[1.75rem] font-bold text-white">
            Start building your first workflow
          </h2>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:opacity-90 disabled:opacity-50"
            style={{ boxShadow: '0 0 24px rgba(255,255,255,0.18)' }}
          >
            {creating ? 'Creating…' : 'New workflow'}
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
                <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
                  <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z" stroke="black" strokeWidth="1.5"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-white">workflow-ai</span>
            </div>

            <div className="flex gap-12">
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/25">Product</p>
                {['Features', 'Docs', 'Changelog'].map((l) => (
                  <span key={l} className="cursor-pointer text-sm text-white/40 transition-colors hover:text-white">{l}</span>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/25">Legal</p>
                {['Privacy', 'Terms'].map((l) => (
                  <span key={l} className="cursor-pointer text-sm text-white/40 transition-colors hover:text-white">{l}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[12px] text-white/20">
              workflow-ai · AI should be one step inside a workflow engine, not the workflow itself.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
