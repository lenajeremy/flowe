import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SettingsTabs } from '@/components/SettingsTabs'
import { toast } from 'sonner'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import { MembersSection } from '@/components/MembersSection'

// The in-app billing screen: what plan you're on, what you've used, and the way
// to change either.
//
// Usage is shown as a bar and a percentage, not a credit count. A customer's
// actual question is "am I about to run out", and answering it should not require
// learning what a credit is. The raw figure is still available underneath for
// anyone who wants it.

interface Billing {
  plan: string
  plan_name: string
  status: string
  cancel_at_period_end: boolean
  personal: boolean
  seats: number
  per_seat: boolean
  has_billing_account: boolean
  current_period_end?: string
  usage: {
    included_credits: number
    used_credits: number
    remaining_credits: number
    used_percent: number
    workflows: number
    scheduled_agents: number
  }
  limits: {
    max_workflows: number
    max_scheduled_agents: number
    min_schedule_minutes: number
    run_history_days: number
    max_members: number
    max_tokens_per_call: number
    shared_connections: boolean
  }
}

const longDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

export function BillingPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<Billing | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    apiFetch(`${API}/api/billing`)
      .then((r) => r.json())
      .then((d: Billing) => setData(d))
      .catch(() => toast.error('Could not load your plan'))
  }, [])

  useEffect(() => {
    document.title = 'Billing · Fernary'
    refresh()
  }, [refresh])

  // Stripe redirects back with ?checkout=success. The subscription arrives by
  // webhook, which can land a moment after the redirect, so the page refetches
  // once shortly after rather than showing a stale plan and looking broken.
  useEffect(() => {
    if (params.get('checkout') !== 'success') return
    toast.success('You’re all set — welcome aboard')
    const t = setTimeout(refresh, 2500)
    params.delete('checkout')
    setParams(params, { replace: true })
    return () => clearTimeout(t)
  }, [params, setParams, refresh])

  async function openPortal() {
    setBusy(true)
    try {
      const res = await apiFetch(`${API}/api/billing/portal`, { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (d.url) window.location.href = d.url
      else toast.error(d.error || 'Could not open the billing portal')
    } catch {
      toast.error('Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  const u = data?.usage
  const l = data?.limits
  const nearLimit = (u?.used_percent ?? 0) >= 80

  return (
    <>
      {/* The same measure as Usage. Billing and Usage are one screen split in
          half, reached from the tab row below, and content changing width on
          arrival reads as a different site rather than the next page. */}
      <div className="mx-auto max-w-[860px] px-8 py-10">

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[26px] font-semibold tracking-[-0.01em]">Billing</h1>
          <SettingsTabs />
        </div>

        {!data ? (
          <div className="h-40 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        ) : (
          <>
            {/* Plan */}
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{data.plan_name}</h2>
                    {data.cancel_at_period_end && (
                      <span className="rounded-full border border-[var(--color-border2)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                        Ending
                      </span>
                    )}
                    {data.status === 'past_due' && (
                      <span className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                        style={{ border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
                        Payment failed
                      </span>
                    )}
                  </div>
                  {data.current_period_end && (
                    <p className="mt-1.5 text-[13px] text-[var(--color-muted)]">
                      {data.cancel_at_period_end
                        ? `Your plan ends on ${longDate(data.current_period_end)}. Everything keeps working until then.`
                        : `Renews on ${longDate(data.current_period_end)}`}
                    </p>
                  )}
                  {data.plan === 'free' && (
                    <p className="mt-1.5 text-[13px] text-[var(--color-muted)]">
                      One scheduled agent, running daily. Upgrade to run more, more often.
                    </p>
                  )}
                  {data.per_seat && (
                    <p className="mt-1.5 text-[13px] text-[var(--color-muted)]">
                      {data.seats} {data.seats === 1 ? 'seat' : 'seats'} · each one adds to your AI allowance.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  {data.has_billing_account && (
                    <button onClick={openPortal} disabled={busy}
                      className="pressable h-10 rounded-xl border border-[var(--color-border)] px-4 text-[13px] font-medium hover:border-[var(--color-border2)] disabled:opacity-50">
                      {busy ? 'Opening…' : 'Manage billing'}
                    </button>
                  )}
                  <Link to="/pricing"
                    className="pressable flex h-10 items-center rounded-xl bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-[var(--fern-forest)] hover:opacity-90">
                    {data.plan === 'free' ? 'Upgrade' : 'Change plan'}
                  </Link>
                </div>
              </div>
            </section>

            {/* Usage this period */}
            <section className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[14px] font-semibold">AI usage this period</h3>
                <div className="flex items-baseline gap-3">
                  <Link to="/settings/usage"
                    className="text-[12.5px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]">
                    See every charge
                  </Link>
                  <span className="font-mono text-[12px] text-[var(--color-muted)]">{u!.used_percent}% used</span>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.max(u!.used_percent, 1.5)}%`,
                    background: nearLimit ? '#f59e0b' : 'var(--color-accent)',
                  }} />
              </div>
              <p className="mt-3 text-[13px] text-[var(--color-muted)]">
                {u!.remaining_credits > 0
                  ? <><strong className="text-[var(--color-text)]">{100 - u!.used_percent}% of your allowance left</strong> this period.
                      {/* Carried-over credit means the balance can exceed one
                          period's allowance, so the two figures are shown
                          separately rather than one being derived from the other. */}
                      {u!.remaining_credits > u!.included_credits &&
                        ' You also have credit carried over from earlier.'}
                      {' '}How far that goes depends on the models your agents use.</>
                  : <>You’ve used this period’s allowance. Scheduled agents are paused until it renews.</>}
              </p>
              {/* The honest promise, stated where it matters: we stop rather than
                  billing overage. On a product that acts while you sleep this is
                  the reassurance people are actually looking for. */}
              <p className="mt-2 text-[12.5px] text-[var(--color-subtle)]">
                We never bill overage. If an agent runs out, it stops and tells you.
              </p>
            </section>

            {/* What the plan allows */}
            <section className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <h3 className="text-[14px] font-semibold">Your plan</h3>
              <dl className="mt-4 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                <Row label="Workflows"
                  value={l!.max_workflows === 0
                    ? `${u!.workflows} · unlimited`
                    : `${u!.workflows} of ${l!.max_workflows}`} />
                <Row label="Scheduled agents"
                  value={l!.max_scheduled_agents === 0
                    ? `${u!.scheduled_agents} · unlimited`
                    : `${u!.scheduled_agents} of ${l!.max_scheduled_agents}`} />
                <Row label="Fastest schedule" value={frequencyLabel(l!.min_schedule_minutes)} />
                <Row label="Run history" value={`${l!.run_history_days} days`} />
                <Row label="Team members"
                  value={l!.max_members === 0
                    ? 'Unlimited'
                    : data.per_seat
                      ? `${l!.max_members} (${data.seats} seats)`
                      : String(l!.max_members)} />
                <Row label="Shared connections" value={l!.shared_connections ? 'Included' : 'Team and above'} />
              </dl>
            </section>

            <MembersSection onSeatsChanged={refresh} />

            <p className="mt-5 text-center text-[12.5px] text-[var(--color-subtle)]">
              Invoices, card details and cancellation all live in{' '}
              {data.has_billing_account
                ? <button onClick={openPortal} className="underline hover:text-[var(--color-text)]">the billing portal</button>
                : 'the billing portal, once you have a paid plan'}.
            </p>
          </>
        )}
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--color-border)] pb-2.5">
      <dt className="text-[13px] text-[var(--color-muted)]">{label}</dt>
      <dd className="text-[13px] font-medium">{value}</dd>
    </div>
  )
}

function frequencyLabel(minutes: number): string {
  if (minutes >= 1440) return 'Once a day'
  if (minutes >= 60) return `Every ${minutes / 60} hour${minutes === 60 ? '' : 's'}`
  return `Every ${minutes} minute${minutes === 1 ? '' : 's'}`
}
