import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlanStore } from '@/store/planStore'

/**
 * The org's tier, shown in the app header when it is a paid one.
 *
 * Nothing renders on Free. A badge saying "FREE" on every screen is a permanent
 * nag rather than information, and the upgrade path is already on the billing page
 * and the pricing page. The badge exists to confirm a paid plan is active — which
 * is the thing people actually want to see after paying.
 */
export function PlanBadge() {
  const navigate = useNavigate()
  const plan = usePlanStore((s) => s.plan)
  const planName = usePlanStore((s) => s.planName)
  const cancelling = usePlanStore((s) => s.cancelAtPeriodEnd)
  const load = usePlanStore((s) => s.load)

  useEffect(() => { void load() }, [load])

  if (!plan || plan === 'free') return null

  return (
    <button
      onClick={() => navigate('/settings/billing')}
      title={cancelling ? `${planName} — ends at the end of this period` : `${planName} plan`}
      className="pressable flex h-6 items-center rounded-full px-2 font-mono text-[10.5px] uppercase tracking-wider transition-opacity hover:opacity-80"
      style={{
        // Filled while the plan is live; outlined once it is winding down, so
        // "cancelled but still working" is visible without a second element.
        background: cancelling ? 'transparent' : 'var(--color-accent)',
        color: cancelling ? 'var(--color-muted)' : 'var(--fern-forest)',
        border: cancelling ? '1px dashed var(--color-border2)' : 'none',
        letterSpacing: '0.09em',
      }}
    >
      {planName}
    </button>
  )
}
