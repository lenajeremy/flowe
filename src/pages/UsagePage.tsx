import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import { getToken } from '@/lib/tokenStore'
import { FloweIcon } from '@/components/FloweIcon'
import { UserMenu } from '@/components/ui/UserMenu'

// The usage report.
//
// Built to be checked, not just glanced at. Every line names the workflow, the run
// and the step it paid for, alongside the model and the raw token counts — so the
// answer to "why did this cost that" is on the row rather than requiring a support
// conversation. Both figures come from the same ledger the balance is derived from,
// so this page cannot disagree with the bill.
//
// The run id is a link, because the useful next question after "this was
// expensive" is always "show me what it did".

interface Tokens {
  input: number
  output: number
  cached: number
  cache_write: number
  total: number
}

interface Row {
  id: string
  at: string
  kind: 'spend' | 'grant'
  reason: string
  label: string
  credits: number
  workflow_id?: string
  workflow_name?: string
  run_id?: string
  node_id?: string
  node_label?: string
  op?: string
  surface?: string
  provider?: string
  model?: string
  tokens?: Tokens
}

interface Breakdown {
  key: string
  label: string
  credits: number
  calls: number
  tokens?: number
}

interface UsageData {
  period: { label: string; from: string | null; to: string }
  included_credits: number
  rows: Row[]
  total_rows: number
  limit: number
  offset: number
  summary: {
    spent: number
    granted: number
    by_reason: Breakdown[]
    by_workflow: Breakdown[]
    by_model: Breakdown[]
  }
}

const PERIODS = [
  { id: 'current', label: 'This period' },
  { id: 'previous', label: 'Last period' },
  { id: 'all', label: 'All time' },
] as const

const KINDS = [
  { id: '', label: 'Everything' },
  { id: 'spend', label: 'Charges' },
  { id: 'grant', label: 'Credits' },
] as const

const num = (n: number) => n.toLocaleString()

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

export function UsagePage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<string>('current')
  const [kind, setKind] = useState<string>('')
  const [offset, setOffset] = useState(0)
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    const q = new URLSearchParams({ period, offset: String(offset), limit: '100' })
    if (kind) q.set('kind', kind)
    apiFetch(`${API}/api/usage?${q}`)
      .then((r) => r.json())
      .then((d: UsageData) => setData(d))
      .catch(() => toast.error('Could not load your usage'))
      .finally(() => setLoading(false))
  }, [period, kind, offset])

  useEffect(() => {
    document.title = 'Usage · Fernary'
    load()
  }, [load])

  // The export needs the bearer token, which a plain <a download> cannot send —
  // so it is fetched and handed to the browser as a blob.
  async function exportCsv() {
    try {
      const res = await fetch(`${API}/api/usage/export.csv?period=${period}`, {
        headers: { Authorization: `Bearer ${getToken() ?? ''}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const name = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]
        ?? 'fernary-usage.csv'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not export your usage')
    }
  }

  const s = data?.summary
  const pageEnd = Math.min((data?.offset ?? 0) + (data?.rows.length ?? 0), data?.total_rows ?? 0)

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] font-sans text-[var(--color-text)]">
      <div className="mx-auto max-w-[1180px] px-8 py-12">

        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')}
              className="pressable flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border2)]"
              title="Home">
              <FloweIcon size={18} />
            </button>
            <h1 className="text-[26px] font-semibold tracking-[-0.01em]">Usage</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/settings/billing"
              className="text-[13px] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]">
              Billing
            </Link>
            <Link to="/workflows"
              className="text-[13px] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]">
              Workflows
            </Link>
            <span className="h-5 w-px bg-[var(--color-border)]" />
            <UserMenu />
          </div>
        </div>

        <p className="mb-7 max-w-2xl text-[13.5px] leading-relaxed text-[var(--color-muted)]">
          Every charge, itemised — which workflow, which run, which step, and the exact
          tokens behind it. These are the same records your balance is calculated from,
          so nothing here is an estimate.
        </p>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Segmented options={PERIODS} value={period}
            onChange={(v) => { setPeriod(v); setOffset(0) }} />
          <Segmented options={KINDS} value={kind}
            onChange={(v) => { setKind(v); setOffset(0) }} />
          <div className="flex-1" />
          <button onClick={exportCsv}
            className="pressable flex h-9 items-center gap-2 rounded-xl border border-[var(--color-border)] px-3.5 text-[12.5px] font-medium hover:border-[var(--color-border2)]">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8m0 0 3-3m-3 3L5 7M3 13h10" stroke="currentColor"
                strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Totals */}
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Stat label={`Used · ${data?.period.label ?? ''}`} value={s ? num(s.spent) : '—'}
            sub={data ? `of ${num(data.included_credits)} included` : ''} />
          <Stat label="Credits added" value={s ? num(s.granted) : '—'}
            sub="allowances, top-ups and refunds" />
          <Stat label="Charges" value={data ? num(data.total_rows) : '—'}
            sub="itemised entries in this window" />
        </div>

        {/* Breakdowns — each sums to the Used figure above, deliberately, so the
            page can be reconciled rather than merely read. */}
        {s && (
          <div className="mb-6 grid gap-3 lg:grid-cols-3">
            <BreakdownCard title="By type" rows={s.by_reason} total={s.spent} />
            <BreakdownCard title="By workflow" rows={s.by_workflow} total={s.spent} />
            <BreakdownCard title="By model" rows={s.by_model} total={s.spent} />
          </div>
        )}

        {/* Ledger */}
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[11px] uppercase tracking-wider text-[var(--color-subtle)]">
                  <Th>When</Th>
                  <Th>What</Th>
                  <Th>Workflow</Th>
                  <Th>Step</Th>
                  <Th>Model</Th>
                  <Th right>Tokens</Th>
                  <Th right>Credits</Th>
                  <Th>Run</Th>
                </tr>
              </thead>
              <tbody>
                {loading && !data ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-border)]">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="h-3.5 animate-pulse rounded bg-[var(--color-hover)]" />
                      </td>
                    </tr>
                  ))
                ) : data?.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[var(--color-muted)]">
                      Nothing charged in this window.
                    </td>
                  </tr>
                ) : (
                  data?.rows.map((r) => <LedgerRow key={r.id} row={r} />)
                )}
              </tbody>
            </table>
          </div>

          {data && data.total_rows > data.limit && (
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
              <span className="font-mono text-[11.5px] text-[var(--color-muted)]">
                {data.offset + 1}–{pageEnd} of {num(data.total_rows)}
              </span>
              <div className="flex gap-2">
                <button disabled={data.offset === 0}
                  onClick={() => setOffset(Math.max(0, data.offset - data.limit))}
                  className="pressable h-8 rounded-lg border border-[var(--color-border)] px-3 text-[12px] disabled:opacity-40">
                  Previous
                </button>
                <button disabled={pageEnd >= data.total_rows}
                  onClick={() => setOffset(data.offset + data.limit)}
                  className="pressable h-8 rounded-lg border border-[var(--color-border)] px-3 text-[12px] disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-5 text-[12.5px] text-[var(--color-subtle)]">
          Structural steps — inputs, outputs, branches, loops and approvals — cost
          nothing, so they never appear here.
        </p>
      </div>
    </div>
  )
}

// ─── row ──────────────────────────────────────────────────────
function LedgerRow({ row: r }: { row: Row }) {
  const isGrant = r.kind === 'grant'
  return (
    <tr className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-hover)]">
      <Td><span className="whitespace-nowrap text-[var(--color-muted)]">{when(r.at)}</span></Td>
      <Td>
        <span className="inline-flex items-center gap-1.5">
          <Dot reason={r.reason} />
          {r.label}
        </span>
        {r.op && <div className="font-mono text-[11px] text-[var(--color-subtle)]">{r.op}</div>}
      </Td>
      <Td>
        {r.workflow_id ? (
          <Link to={`/workflow/${r.workflow_id}`}
            className="text-[var(--color-text)] underline decoration-[var(--color-border2)] underline-offset-2 hover:decoration-[var(--color-text)]">
            {r.workflow_name || 'Workflow'}
          </Link>
        ) : (
          <span className="text-[var(--color-subtle)]">
            {r.surface === 'builder' ? 'AI builder' : r.surface === 'agent' ? 'Chat' : '—'}
          </span>
        )}
      </Td>
      <Td>
        {r.node_label || r.node_id
          ? <span className="text-[var(--color-muted)]">{r.node_label || r.node_id}</span>
          : <span className="text-[var(--color-subtle)]">—</span>}
      </Td>
      <Td>
        {r.model
          ? <span className="font-mono text-[11.5px]">{r.model}</span>
          : r.provider
            ? <span className="font-mono text-[11.5px] text-[var(--color-muted)]">{r.provider}</span>
            : <span className="text-[var(--color-subtle)]">—</span>}
      </Td>
      <Td right>
        {r.tokens ? (
          // The split matters: cached input is a fraction of the price of
          // uncached, so a big total with a big cached share is cheap.
          <span title={`${num(r.tokens.input)} in · ${num(r.tokens.output)} out`
            + (r.tokens.cached ? ` · ${num(r.tokens.cached)} cached` : '')}>
            {num(r.tokens.total)}
          </span>
        ) : (
          <span className="text-[var(--color-subtle)]">—</span>
        )}
      </Td>
      <Td right>
        <span className={`font-mono tabular-nums ${isGrant ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>
          {isGrant ? `+${num(r.credits)}` : num(r.credits)}
        </span>
      </Td>
      <Td>
        {r.run_id ? (
          <Link to={`/run/${r.run_id}`} title={r.run_id}
            className="font-mono text-[11px] text-[var(--color-muted)] underline decoration-[var(--color-border2)] underline-offset-2 hover:text-[var(--color-text)]">
            {r.run_id.slice(0, 8)}
          </Link>
        ) : (
          <span className="text-[var(--color-subtle)]">—</span>
        )}
      </Td>
    </tr>
  )
}

const REASON_COLOR: Record<string, string> = {
  llm_usage: 'var(--fern-emerald)',
  integration_op: '#60a5fa',
  email_send: '#c084fc',
  web_tool: '#fbbf24',
}

function Dot({ reason }: { reason: string }) {
  return (
    <span aria-hidden="true" className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: REASON_COLOR[reason] ?? 'var(--color-border2)' }} />
  )
}

// ─── bits ─────────────────────────────────────────────────────
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-4 py-2.5 font-medium ${right ? 'text-right' : ''}`}>{children}</th>
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`px-4 py-2.5 align-top text-[12.5px] ${right ? 'text-right' : ''}`}>{children}</td>
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="text-[12px] text-[var(--color-muted)]">{label}</div>
      <div className="mt-1.5 font-mono text-[24px] tabular-nums tracking-[-0.02em]">{value}</div>
      {sub && <div className="mt-0.5 text-[11.5px] text-[var(--color-subtle)]">{sub}</div>}
    </div>
  )
}

function BreakdownCard({ title, rows, total }: { title: string; rows: Breakdown[]; total: number }) {
  const top = rows.slice(0, 5)
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      {top.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-[var(--color-subtle)]">Nothing yet.</p>
      ) : (
        <ul className="mt-3.5 flex flex-col gap-2.5">
          {top.map((b) => {
            const pct = total > 0 ? Math.round((b.credits / total) * 100) : 0
            return (
              <li key={b.key || b.label}>
                <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="truncate" title={b.label}>{b.label}</span>
                  <span className="shrink-0 font-mono tabular-nums text-[var(--color-muted)]">
                    {num(b.credits)}
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--color-border)]">
                  <div className="h-full rounded-full bg-[var(--color-accent)]"
                    style={{ width: `${Math.max(pct, 1)}%` }} />
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--color-subtle)]">
                  {pct}% · {num(b.calls)} {b.calls === 1 ? 'call' : 'calls'}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Segmented<T extends readonly { id: string; label: string }[]>(
  { options, value, onChange }: { options: T; value: string; onChange: (v: string) => void },
) {
  return (
    <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`pressable h-8 rounded-[9px] px-3 text-[12.5px] transition-colors ${
            value === o.id
              ? 'bg-[var(--color-hover2)] font-medium text-[var(--color-text)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
