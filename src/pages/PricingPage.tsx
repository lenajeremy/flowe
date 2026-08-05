import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import { useAuthStore } from '@/store/authStore'
import { Nav, Footer } from '@/pages/LandingPage'
import { RULE } from '@/lib/brandSurface'

// The pricing page.
//
// Plans are fetched from the server rather than written here, because the server
// generates them from the same limits table it enforces. A hardcoded page is the
// one that eventually promises "5 workflows" while the API refuses the fourth.
//
// Plan FEATURES are the story. Credits are the internal meter and the wrong thing
// to sell: buyers want to know what this costs per month, and a meter that varies
// with how chatty the LLM was on Tuesday produces bill anxiety. On an unattended
// product that is worse than on an interactive one — the failure mode is not
// churn, it is that people quietly stop publishing schedules.
//
// Stays on the dark brand surface, matching the landing page it is reached from.

interface Plan {
  id: string
  name: string
  tagline: string
  price_usd: number
  interval: string
  cta: string
  features: string[]
  highlight: boolean
  self_serve: boolean
}

export function PricingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Pricing · Fernary'
    window.scrollTo(0, 0)
    fetch(`${API}/api/billing/plans`)
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => setError('Could not load pricing. Refresh to try again.'))
      .finally(() => setLoading(false))
  }, [])

  // Free and Business never reach Stripe: free needs no payment, and Business is
  // sold by conversation. Anyone not signed in goes to login first — checkout
  // needs an account to attach the subscription to.
  const choose = async (plan: Plan) => {
    setError('')
    if (plan.id === 'free') {
      navigate(user ? '/workflows' : '/login')
      return
    }
    if (!plan.self_serve) {
      window.location.href = 'mailto:hello@fernary.com?subject=Fernary%20Business%20plan'
      return
    }
    if (!user) {
      // Come back here after signing in, so the intent isn't lost.
      navigate(`/login?next=${encodeURIComponent('/pricing')}`)
      return
    }
    setBusy(plan.id)
    try {
      const res = await apiFetch(`${API}/api/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        setError(data.error || 'Could not start checkout. Please try again.')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ background: '#050508', color: '#fff', minHeight: '100vh' }}>
      <Nav onOpen={() => navigate(user ? '/workflows' : '/login')} />

      <main className="mx-auto max-w-6xl px-6">
        <section className="pt-16 pb-12 text-center sm:pt-24 sm:pb-16">
          <h2 className="mx-auto max-w-2xl text-[34px] font-semibold leading-[1.1] sm:text-[46px]"
            style={{ letterSpacing: '-0.03em' }}>
            Simple pricing for agents<br />that run without you
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-white/45">
            Start free, with every integration included. Upgrade when you want your
            agents running on a schedule.
          </p>
          {/* Adaptive Pricing converts at checkout, so the figures here are the
              USD reference. Saying so up front avoids the "why is this a different
              number" support ticket. */}
          <p className="mt-4 font-mono text-[11.5px] text-white/25">
            Prices in USD · shown in your local currency at checkout
          </p>
        </section>

        {error && (
          <div className="mx-auto mb-8 max-w-xl rounded-xl px-4 py-3 text-center text-[13.5px]"
            style={{ border: '1px solid rgba(248,113,113,0.28)', background: 'rgba(248,113,113,0.08)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        <section className="grid gap-4 pb-4 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <PlanSkeleton key={i} />)
            : plans.map((p) => (
                <PlanCard key={p.id} plan={p} busy={busy === p.id} onChoose={() => choose(p)} />
              ))}
        </section>

        <p className="pb-16 pt-6 text-center text-[12.5px] text-white/30">
          Every plan includes the full node library, unlimited manual runs, and approval
          steps on any action. Cancel any time.
        </p>

        <FaqSection />
      </main>

      <Footer onGetStarted={() => navigate(user ? '/workflows' : '/login')} />
    </div>
  )
}

// ─── Plan card ────────────────────────────────────────────────
function PlanCard({ plan, busy, onChoose }: { plan: Plan; busy: boolean; onChoose: () => void }) {
  const featured = plan.highlight
  return (
    <div className="relative flex flex-col rounded-2xl p-6"
      style={{
        // The highlighted plan gets a brighter edge and a lift rather than a
        // different colour, so the card set still reads as one row.
        border: featured ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(255,255,255,0.07)',
        background: featured ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.015)',
        boxShadow: featured ? '0 1px 40px rgba(255,255,255,0.05)' : 'none',
      }}>
      {featured && (
        <span className="absolute -top-2.5 left-6 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-black"
          style={{ background: '#fff', letterSpacing: '0.08em' }}>
          Most popular
        </span>
      )}

      <h3 className="text-[15px] font-semibold" style={{ letterSpacing: '-0.01em' }}>{plan.name}</h3>
      <p className="mt-1.5 min-h-[36px] text-[13px] leading-snug text-white/40">{plan.tagline}</p>

      <div className="mt-5 flex items-baseline gap-1.5">
        {plan.price_usd < 0 ? (
          <span className="text-[26px] font-semibold" style={{ letterSpacing: '-0.02em' }}>Let&rsquo;s talk</span>
        ) : (
          <>
            <span className="text-[36px] font-semibold leading-none" style={{ letterSpacing: '-0.03em' }}>
              ${plan.price_usd}
            </span>
            {plan.interval && <span className="text-[13px] text-white/35">/{plan.interval}</span>}
          </>
        )}
      </div>

      <button onClick={onChoose} disabled={busy}
        className="pressable mt-6 w-full rounded-full px-4 py-2.5 text-[13.5px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={featured
          ? { background: '#fff', color: '#000' }
          : { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.10)' }}>
        {busy ? 'Opening checkout…' : plan.cta}
      </button>

      <ul className="mt-7 flex flex-col gap-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13px] leading-snug text-white/65">
            <Check />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" width={15} height={15} fill="none" aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 1.5, color: 'rgba(255,255,255,0.4)' }}>
      <path d="M3.2 8.4l3 3 6.6-7" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlanSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl p-6"
      style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}>
      {[16, 40, 32, 12, 12, 12].map((h, i) => (
        <div key={i} className="rounded"
          style={{ height: h, width: i === 1 ? '55%' : '100%', background: 'rgba(255,255,255,0.05)' }} />
      ))}
    </div>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────
// The questions people actually ask before paying for something unattended. The
// spend-cap answer is the important one: on a product that acts while you sleep,
// "what stops it running up a bill" is the real objection, and the honest answer
// (it stops, it does not overspend and invoice you) is a selling point.
const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'What happens if an agent uses up my plan?',
    a: 'It stops and tells you. We never bill overage — no surprise invoice, and nothing keeps running up a cost you did not agree to. You can upgrade or wait for your allowance to renew.',
  },
  {
    q: 'What counts as a scheduled agent?',
    a: 'A workflow you have published with a schedule attached, so it runs on its own. Manual runs, webhooks and API triggers are unlimited on every plan and never count toward it.',
  },
  {
    q: 'Do I need my own AI keys?',
    a: 'No. Every plan includes AI usage. If you would rather bring your own provider key, get in touch — we can set that up on Business.',
  },
  {
    q: 'Are approvals a paid feature?',
    a: 'Never. Any step can pause for your approval on every plan, including free. It is the thing that makes an unattended agent safe to trust, so charging for it would be backwards.',
  },
  {
    q: 'Can I change plan later?',
    a: 'Any time, in both directions. Upgrades apply immediately; if you cancel you keep everything until the end of the period you have already paid for.',
  },
  {
    q: 'Which currency am I charged in?',
    a: 'Yours, where we can. Prices are set in US dollars and converted at checkout using the current rate, so you see and pay a local amount.',
  },
]

function FaqSection() {
  return (
    <section className="pb-20 pt-14" style={RULE}>
      <h3 className="pt-14 text-center text-[22px] font-semibold" style={{ letterSpacing: '-0.02em' }}>
        Questions
      </h3>
      <div className="mx-auto mt-9 grid max-w-4xl gap-x-12 gap-y-8 sm:grid-cols-2">
        {FAQS.map((f) => (
          <div key={f.q}>
            <h4 className="text-[13.5px] font-semibold text-white/85">{f.q}</h4>
            <p className="mt-2 text-[13px] leading-relaxed text-white/45">{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
