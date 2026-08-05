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

interface PersonSpend {
  user_id: string
  name: string
  credits: number
  calls: number
  tokens: number
  limit?: number
  percent?: number
  /** Of their monthly share, always this period — unlike `credits`, which follows
   *  the selected window. */
  remaining?: number
  custom_limit?: boolean
}

interface Row {
  id: string
  at: string
  user_id?: string
  user_name?: string
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
  is_admin: boolean
  member_count: number
  viewing_user: string
  my_allocation: {
    limit: number
    spent: number
    remaining: number
    percent: number
    custom: boolean
  }
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
    by_user?: PersonSpend[]
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

// Rows per page. Was 100, which meant the pager below the table — gated on there
// being more than one page — never appeared for anybody, and reading your charges
// was scrolling a single slab of a hundred rows. A page you can take in at once is
// the point of paging it at all.
const PAGE_SIZE = 25

const num = (n: number) => n.toLocaleString()

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

export function UsagePage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<string>('current')
  const [kind, setKind] = useState<string>('')
  const [person, setPerson] = useState<string>('')
  const [offset, setOffset] = useState(0)
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    const q = new URLSearchParams({ period, offset: String(offset), limit: String(PAGE_SIZE) })
    if (kind) q.set('kind', kind)
    if (person) q.set('user_id', person)
    apiFetch(`${API}/api/usage?${q}`)
      .then((r) => r.json())
      .then((d: UsageData) => setData(d))
      .catch(() => toast.error('Could not load your usage'))
      .finally(() => setLoading(false))
  }, [period, kind, person, offset])

  useEffect(() => {
    document.title = 'Usage · Fernary'
    load()
  }, [load])

  // The export needs the bearer token, which a plain <a download> cannot send —
  // so it is fetched and handed to the browser as a blob.
  async function exportCsv() {
    try {
      // Same filters as the table. The button sits beside them, so exporting a
      // different set of rows from the ones on screen is a quiet way to be wrong.
      const q = new URLSearchParams({ period })
      if (kind) q.set('kind', kind)
      if (person) q.set('user_id', person)
      const res = await fetch(`${API}/api/usage/export.csv?${q}`, {
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
  // Nothing per-person is worth showing in a one-person organisation: the
  // breakdown would list only you, the filter would have a single option, and the
  // Member column would repeat one name down every row. Gated on membership rather
  // than on who has spent, so a team where only one person has been active still
  // gets the view.
  const hasTeammates = (data?.member_count ?? 1) > 1

  // Whose numbers are on screen. The rows are already scoped by the server — a
  // member only ever sees their own — so the TOTAL has to be measured against the
  // same scope. Showing one person's spend "of 160,000 included" compared their
  // 698 against the whole organization's allowance, which reads as though they
  // had barely touched a budget they cannot actually spend.
  const viewingEveryone = Boolean(data?.is_admin) && !person
  const viewedPerson = person
    ? data?.summary.by_user?.find((u) => u.user_id === person)
    : undefined
  const scopeLimit = viewingEveryone
    ? (data?.included_credits ?? 0)
    : person
      ? (viewedPerson?.limit ?? 0)
      : (data?.my_allocation.limit ?? 0)
  const scopeLabel = viewingEveryone
    ? 'Organization used'
    : person
      ? `${viewedPerson?.name ?? 'Member'} used`
      : 'You used'
  // Allowances are monthly. Measuring a window that is not this month against one
  // compares two different things: "all time · 698 of your 80,000 share" invites the
  // reader to work out a percentage that means nothing, and on an account older than
  // a month it would understate spend badly.
  const scopeSub = period !== 'current'
    ? 'credits in this window'
    : scopeLimit <= 0
      ? 'of your included credits'
      : viewingEveryone
        ? `of ${num(scopeLimit)} included`
        : person
          ? `of their ${num(scopeLimit)} share`
          : `of your ${num(scopeLimit)} share`

  // Taken from the allocation rather than subtracting the window's spend from the
  // share: a share is monthly, so "all time" spend against it would go negative on
  // any account older than a month.
  const scopeRemaining = person
    ? (viewedPerson?.remaining ?? 0)
    : (data?.my_allocation.remaining ?? 0)

  // Grants belong to the organization and carry no member, so a per-person view can
  // only ever return an empty list — the filter was a control that did nothing.
  const canSeeGrants = viewingEveryone
  const grantView = kind === 'grant' && canSeeGrants
  const kinds = canSeeGrants ? KINDS : KINDS.filter((k) => k.id !== 'grant')

  // Switching to a person takes the grant filter away with it, so the page cannot be
  // left showing a tab that is no longer offered.
  const selectPerson = (id: string) => {
    setPerson(id)
    setOffset(0)
    if (id && kind === 'grant') setKind('')
  }

  const entryLabel = kind === 'grant' ? 'Credit entries' : kind === 'spend' ? 'Charges' : 'Entries'
  const emptyText = kind === 'grant'
    ? 'No credits added in this window.'
    : kind === 'spend'
      ? 'Nothing charged in this window.'
      : 'Nothing recorded in this window.'
  // A one-person org has no separate "share" — the org allowance IS that person's,
  // so both cards would say the same thing twice.
  const showOwnShare = (data?.my_allocation.limit ?? 0) > 0 && !person && hasTeammates
  const showPerPerson = Boolean(data?.is_admin) && hasTeammates
  // The Member column only exists in that view, so the empty/loading rows have to
  // span the same width or the table visibly jumps.
  const columns = showPerPerson ? 9 : 8
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
          <Segmented options={kinds} value={kind}
            onChange={(v) => { setKind(v); setOffset(0) }} />
          {/* Only an admin gets this. A plain member's view is already restricted
              to themselves by the server, so a picker would be a control that
              cannot change anything. */}
          {showPerPerson && (s?.by_user?.length ?? 0) > 0 && (
            <select value={person} onChange={(e) => selectPerson(e.target.value)}
              className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-[12.5px] outline-none">
              <option value="">Everyone</option>
              {s!.by_user!.filter((u) => u.user_id).map((u) => (
                <option key={u.user_id} value={u.user_id}>{u.name}</option>
              ))}
            </select>
          )}
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

        {/* Totals. Every card here is measured in the same scope as the rows below —
            an organization figure beside a personal one is how "used 698 of 160,000,
            79,302 left" happened, three numbers that cannot all be about one person. */}
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          {grantView ? (
            <Stat label={`Credits added · ${data?.period.label ?? ''}`}
              value={s ? num(s.granted) : '—'}
              sub="allowances, top-ups and refunds" />
          ) : (
            <Stat label={`${scopeLabel} · ${data?.period.label ?? ''}`}
              value={s ? num(s.spent) : '—'}
              sub={data ? scopeSub : ''} />
          )}
          {grantView ? (
            <Stat label={scopeLabel} value={s ? num(s.spent) : '—'}
              sub={data ? scopeSub : ''} />
          ) : viewingEveryone ? (
            <Stat label="Credits added" value={s ? num(s.granted) : '—'}
              sub="allowances, top-ups and refunds" />
          ) : (
            // A member cannot see grants, so the org's total added would be the one
            // number on the page that was not theirs. What is left of their own share
            // is the question they came to ask anyway.
            <Stat label={person ? 'Left of their share' : 'Left of your share'}
              value={data ? num(scopeRemaining) : '—'}
              sub={period === 'current' ? 'this period' : 'as of now'} />
          )}
          <Stat label={entryLabel} value={data ? num(data.total_rows) : '—'}
            sub="itemised entries in this window" />
        </div>

        {/* Your own share. Shown to everyone including admins, because "how much of
            MY allowance is left" is a different question from "what is the org
            spending" and people ask it more often. */}
        {data && showOwnShare && (
          <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[13px] font-semibold">
                Your allowance
                {/* Named because this card is always the current period, whatever
                    window is selected above — the two sat side by side showing
                    different spans of the same number with nothing to say so. */}
                <span className="ml-2 text-[11.5px] font-normal text-[var(--color-subtle)]">
                  this period
                </span>
                {data.my_allocation.custom && (
                  <span className="ml-2 font-mono text-[10.5px] uppercase tracking-wider text-[var(--color-subtle)]">
                    set by your admin
                  </span>
                )}
              </h3>
              <span className="font-mono text-[12px] text-[var(--color-muted)]">
                {num(data.my_allocation.spent)} of {num(data.my_allocation.limit)}
              </span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
              <div className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(data.my_allocation.percent, 1.5)}%`,
                  background: data.my_allocation.percent >= 80 ? '#f59e0b' : 'var(--color-accent)',
                }} />
            </div>
            <p className="mt-2 text-[12.5px] text-[var(--color-subtle)]">
              {data.my_allocation.remaining > 0
                ? `${num(data.my_allocation.remaining)} left. Your share is ring-fenced, so a busy colleague cannot spend it.`
                : 'You have used your share. Your organization\u2019s owner can raise your limit.'}
            </p>
          </div>
        )}

        {/* Who spent what — admin only, and about spend, so it has no place in a
            view filtered to credits. */}
        {showPerPerson && !grantView && (s?.by_user?.length ?? 0) > 0 && (
          <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="text-[13px] font-semibold">Spend by teammate</h3>
            <ul className="mt-3.5 flex flex-col gap-3">
              {s!.by_user!.map((u) => {
                const share = u.limit && u.limit > 0
                  ? Math.min((u.credits / u.limit) * 100, 100)
                  : (s!.spent > 0 ? (u.credits / s!.spent) * 100 : 0)
                const pct = Math.round(share)
                const pctLabel = pct === 0 && u.credits > 0 ? '<1%' : `${pct}%`
                return (
                  <li key={u.user_id || 'unattributed'}>
                    <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                      <button
                        onClick={() => u.user_id && selectPerson(u.user_id)}
                        disabled={!u.user_id}
                        className={`truncate text-left ${u.user_id ? 'hover:text-[var(--color-accent)]' : 'cursor-default text-[var(--color-subtle)]'}`}>
                        {u.name}
                      </button>
                      <span className="shrink-0 font-mono tabular-nums text-[var(--color-muted)]">
                        {num(u.credits)}{u.limit ? ` / ${num(u.limit)}` : ''}
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div className="h-full rounded-full"
                        style={{ width: `${Math.max(share, 1)}%`,
                          background: pct >= 100 ? '#f59e0b' : 'var(--color-accent)' }} />
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--color-subtle)]">
                      {u.limit ? `${pctLabel} of their share` : `${pctLabel} of org spend`}
                      {' · '}{num(u.calls)} {u.calls === 1 ? 'call' : 'calls'}
                      {u.custom_limit ? ' · custom limit' : ''}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Breakdowns — each sums to the headline figure above, deliberately, so the
            page can be reconciled rather than merely read. They follow the charges/
            credits filter: describing spend while the table listed credits put a
            three-card itemisation of charges directly above the words "no credits
            added", and only one of them could be answering the question asked. */}
        {s && (grantView ? (
          <div className="mb-6">
            {/* Grants have no workflow and no model — there is nothing to say about a
                monthly allowance except where it came from. */}
            <BreakdownCard title="Where credits came from" rows={s.by_reason} total={s.granted} />
          </div>
        ) : (
          <div className="mb-6 grid gap-3 lg:grid-cols-3">
            <BreakdownCard title="By type" rows={s.by_reason} total={s.spent} />
            <BreakdownCard title="By workflow" rows={s.by_workflow} total={s.spent} />
            <BreakdownCard title="By model" rows={s.by_model} total={s.spent} />
          </div>
        ))}

        {/* Ledger */}
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[11px] uppercase tracking-wider text-[var(--color-subtle)]">
                  <Th>When</Th>
                  <Th>What</Th>
                  {showPerPerson && <Th>Member</Th>}
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
                      <td colSpan={columns} className="px-4 py-3">
                        <div className="h-3.5 animate-pulse rounded bg-[var(--color-hover)]" />
                      </td>
                    </tr>
                  ))
                ) : data?.rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns} className="px-4 py-12 text-center text-[13px] text-[var(--color-muted)]">
                      {emptyText}
                    </td>
                  </tr>
                ) : (
                  data?.rows.map((r) => <LedgerRow key={r.id} row={r} showMember={showPerPerson} />)
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
function LedgerRow({ row: r, showMember }: { row: Row; showMember: boolean }) {
  const isGrant = r.kind === 'grant'
  return (
    <tr className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-hover)]">
      <Td><span className="whitespace-nowrap text-[var(--color-muted)]">{when(r.at)}</span></Td>
      <Td>
        <span className="inline-flex items-center gap-1.5">
          <Dot reason={r.reason} />
          {r.label}
        </span>
        {/* A non-AI charge stores its node type where a model would go. It belongs
            here, under what kind of work it was — in the Model column it read as the
            name of a model, which "emailSend" plainly is not. */}
        {(r.op || (!r.model && r.provider)) && (
          <div className="font-mono text-[11px] text-[var(--color-subtle)]">{r.op || r.provider}</div>
        )}
      </Td>
      {showMember && (
        <Td>
          {r.user_name
            ? <span className="text-[var(--color-muted)]">{r.user_name}</span>
            : <span className="text-[var(--color-subtle)]">—</span>}
        </Td>
      )}
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
            const share = total > 0 ? (b.credits / total) * 100 : 0
            const pct = Math.round(share)
            // A 2-credit line among 698 rounded to a flat "0%", which reads as a row
            // that cost nothing sitting next to a figure saying it did not.
            const pctLabel = pct === 0 && b.credits > 0 ? '<1%' : `${pct}%`
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
                    style={{ width: `${Math.max(share, 1)}%` }} />
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--color-subtle)]">
                  {pctLabel} · {num(b.calls)} {b.calls === 1 ? 'call' : 'calls'}
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
