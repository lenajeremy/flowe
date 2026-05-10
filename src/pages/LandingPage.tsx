import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { SavedWorkflow } from '@/lib/workflowApi'

// ── Feature primitives ────────────────────────────────────────

const PRIMITIVES = [
  {
    label: 'Trigger',
    description: 'Start from CRM events, webhooks, schedules, file uploads, or direct API calls from your code.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M10 2L4 10h6l-2 6 8-10h-6l2-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#f59e0b',
  },
  {
    label: 'State',
    description: 'A shared state object every step can read and write — customer, documents, risk score, decision.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <ellipse cx="9" cy="5" rx="6" ry="2.2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M3 5v4c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M3 9v4c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V9" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    color: '#8b5cf6',
  },
  {
    label: 'Steps',
    description: 'Every node maps to a clear operation — fetch data, run AI, branch, wait for approval, send action.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1.5" y="2" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="11.5" y="7" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1.5" y="12" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6.5 4H9a2 2 0 012 2v.5M9 13.5h1.5a2 2 0 002-2V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    color: '#3b82f6',
  },
  {
    label: 'AI Outputs',
    description: 'AI steps return structured data — summary, classification, confidence, next_action — not just free text.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2l1.5 4H15l-3.6 2.6 1.4 4.4L9 10.5l-3.8 2.5 1.4-4.4L3 6h4.5L9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#10b981',
  },
  {
    label: 'Actions',
    description: 'Produce real outcomes — send email, update Airtable, create PDFs, post to Slack, open tickets.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 1.5v3M9 13.5v3M1.5 9h3M13.5 9h3M3.7 3.7l2.1 2.1M12.2 12.2l2.1 2.1M3.7 14.3l2.1-2.1M12.2 5.8l2.1-2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    color: '#ef4444',
  },
  {
    label: 'Observability',
    description: 'Full execution trace per run — input received, prompt sent, model output, parsed result, action taken.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <ellipse cx="9" cy="9" rx="7" ry="4.5" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    color: '#06b6d4',
  },
]

// ── Nav ───────────────────────────────────────────────────────

function Nav({ onOpen }: { onOpen: () => void }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-canvas)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 text-[var(--color-text)]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[var(--color-accent)]">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z"
                stroke="white" strokeWidth="1.35"/>
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">workflow-ai</span>
        </button>

        <nav className="flex items-center gap-1">
          <button
            onClick={() => navigate('/workflows')}
            className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
          >
            Workflows
          </button>
          <button
            onClick={onOpen}
            className="ml-1 flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Open app
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 9L9 2M9 2H4M9 2v5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </nav>
      </div>
    </header>
  )
}

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
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] leading-relaxed">
      <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <span className="ml-2 text-[11px] text-[var(--color-muted)]">trigger.ts</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[var(--color-text)]">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-4">
            <span className="w-5 flex-shrink-0 select-none text-right text-[var(--color-muted)]/50">
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
  // very minimal syntax colouring via inline spans
  return line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /\b(const|await|return)\b/g,
      '<span style="color:var(--color-accent)">$1</span>',
    )
    .replace(
      /"([^"]+)"/g,
      '<span style="color:#10b981">"$1"</span>',
    )
    .replace(
      /\b(workflowClient)\b/g,
      '<span style="color:#8b5cf6">$1</span>',
    )
}

// ── Example workflow steps ────────────────────────────────────

const STEPS = [
  { n: '01', text: 'Trigger on a new inbound lead' },
  { n: '02', text: 'Fetch CRM and company data' },
  { n: '03', text: 'AI step — qualify the lead & score it' },
  { n: '04', text: 'AI step — generate personalised outreach' },
  { n: '05', text: 'Branch on lead score threshold' },
  { n: '06', text: 'Send email or create a review task' },
  { n: '07', text: 'Write results back to the CRM' },
]

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
    <div
      className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)]"
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      <Nav onOpen={() => navigate('/workflows')} />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-24 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-[11px] font-medium text-[var(--color-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          AI workflow builder for businesses
        </div>

        <h1 className="mx-auto mb-5 max-w-3xl text-balance text-[3.25rem] font-bold leading-[1.1] tracking-tight text-[var(--color-text)]">
          Orchestrate models, data,&nbsp;and actions in one place
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--color-muted)]">
          AI should be one step inside a workflow engine, not the workflow itself.
          Connect data sources, run structured AI steps, branch on decisions, trigger
          real actions — and inspect every run from input to output.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {creating ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
                <circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
                <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            )}
            New workflow
          </button>
          <button
            onClick={() => navigate('/workflows')}
            className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-border2)] hover:bg-[var(--color-elevated)]"
          >
            View all workflows
          </button>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-[var(--color-border)]" />
      </div>

      {/* ── Primitives ── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            Six primitives
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Everything a repeatable AI operation needs
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRIMITIVES.map((p) => (
            <div
              key={p.label}
              className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-border2)] hover:bg-[var(--color-elevated)]"
            >
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-[9px]"
                style={{ background: p.color + '18', color: p.color }}
              >
                {p.icon}
              </div>
              <h3 className="mb-1.5 text-sm font-semibold text-[var(--color-text)]">{p.label}</h3>
              <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-[var(--color-border)]" />
      </div>

      {/* ── Example workflow + trigger code ── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">

          {/* Left — example workflow */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Example workflow
            </p>
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-[var(--color-text)]">
              Qualify inbound leads, automatically
            </h2>
            <p className="mb-8 text-[13px] leading-relaxed text-[var(--color-muted)]">
              Instead of chaining raw text outputs between prompts, each step reads
              from and writes to a shared state object — making the system easy to
              debug, test, and extend.
            </p>

            <ol className="flex flex-col gap-0">
              {STEPS.map((s, i) => (
                <li key={s.n} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-semibold text-[var(--color-muted)]">
                      {s.n}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="my-1 h-5 w-px bg-[var(--color-border)]" />
                    )}
                  </div>
                  <p className="pt-0.5 text-[13px] text-[var(--color-text)]">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Right — code + description */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Programmatic trigger
            </p>
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-[var(--color-text)]">
              Trigger from anywhere in your stack
            </h2>
            <p className="mb-6 text-[13px] leading-relaxed text-[var(--color-muted)]">
              Workflows are not limited to the UI. Start a run directly from application
              code — inside product flows, backend jobs, internal tools, or third-party integrations.
            </p>

            <CodeBlock />

            <ul className="mt-6 flex flex-col gap-2">
              {[
                'Start by workflow ID or slug',
                'Pass structured input data',
                'Sync or async execution modes',
                'Auth, rate limits, idempotency',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[13px] text-[var(--color-muted)]">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-[var(--color-accent)]">
                    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-[var(--color-border)]" />
      </div>

      {/* ── Bottom CTA ── */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h2 className="mb-3 text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Ready to build your first workflow?
        </h2>
        <p className="mb-8 text-[13px] text-[var(--color-muted)]">
          Start with a blank canvas or pick up where you left off.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {creating ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
                <circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
                <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            )}
            New workflow
          </button>
          <button
            onClick={() => navigate('/workflows')}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-border2)] hover:bg-[var(--color-elevated)]"
          >
            Browse workflows
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-[var(--color-muted)]">
            <div className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[var(--color-accent)]">
              <svg width="12" height="12" viewBox="0 0 18 18" fill="none">
                <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z"
                  stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <span className="text-xs font-medium">workflow-ai</span>
          </div>
          <p className="text-[11px] text-[var(--color-muted)]">
            AI should be one step inside a workflow engine.
          </p>
        </div>
      </footer>
    </div>
  )
}
