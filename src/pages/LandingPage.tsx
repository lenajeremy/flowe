import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import type { SavedWorkflow } from '@/lib/workflowApi'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import { useAuthStore } from '@/store/authStore'
import { FloweIcon } from '@/components/FloweIcon'

// The landing stays dark by design — it's the brand surface. Colors are
// deliberately fixed (not theme tokens). Structure follows the Linear
// pattern: one voice per screen — a headline, a real product shot, air.

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ─── In-view hook — fires once, slightly before the element lands ──
function useInView<T extends HTMLElement>(rootMargin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null)
  // Reduced-motion users see content immediately — no reveal choreography
  const [inView, setInView] = useState(() => reducedMotion())

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { rootMargin },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [rootMargin, inView])

  return [ref, inView] as const
}

// ─── Reveal — rise + fade as the section scrolls into view ─────
function Reveal({ children, delay = 0, y = 28 }: {
  children: React.ReactNode
  delay?: number
  y?: number
}) {
  const [ref, inView] = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : `translateY(${y}px)`,
        transition: `opacity 700ms var(--ease-out) ${delay}ms, transform 700ms var(--ease-out) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ─── Scroll-lit statement — words brighten as you read down ────
function ScrollStatement({ lead, rest }: { lead: string; rest: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const words = rest.split(' ')
  const [lit, setLit] = useState(() => (reducedMotion() ? rest.split(' ').length : 0))

  useEffect(() => {
    if (reducedMotion()) return
    let raf = 0
    function onScroll() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = ref.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const vh = window.innerHeight
        // 0 when the block enters at 88% of the viewport, 1 by 38%
        const p = Math.min(1, Math.max(0, (vh * 0.88 - r.top) / (vh * 0.5)))
        setLit(Math.round(p * words.length))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [words.length])

  return (
    <p ref={ref} className="max-w-4xl text-[1.7rem] font-semibold sm:text-[2.2rem]"
      style={{ letterSpacing:'-0.025em', lineHeight:1.25 }}>
      <span className="text-white">{lead} </span>
      {words.map((w, i) => (
        <span key={i} style={{
          color: i < lit ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.22)',
          transition: 'color 260ms ease',
        }}>{w} </span>
      ))}
    </p>
  )
}

// ─── Frame — every product shot lives in the same quiet chrome ──
function Shot({ src, alt }: { src: string; alt: string }) {
  const [hover, setHover] = useState(false)
  return (
    <div className="overflow-hidden rounded-2xl"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border:`1px solid ${hover ? 'rgba(160,140,255,0.28)' : 'rgba(255,255,255,0.08)'}`,
        background:'#0a0a0d',
        boxShadow: hover
          ? '0 40px 120px rgba(0,0,0,0.5), 0 0 80px rgba(160,140,255,0.07)'
          : '0 40px 120px rgba(0,0,0,0.5)',
        transition:'border-color 300ms var(--ease-out), box-shadow 300ms var(--ease-out)',
      }}>
      <img src={src} alt={alt} className="block w-full" loading="lazy" />
    </div>
  )
}

// ─── Numbered section — Linear's 1.0 / 2.0 / 3.0 grammar ───────
function NumberedSection({ index, name, title, sub, shot, alt }: {
  index: string
  name: string
  title: React.ReactNode
  sub: string
  shot: string
  alt: string
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28">
      <Reveal>
        <div className="mb-14 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          <h2 className="text-[2.1rem] font-bold sm:text-[2.6rem]" style={{ letterSpacing:'-0.03em', lineHeight:1.08 }}>
            {title}
          </h2>
          <div className="flex flex-col gap-6 lg:pt-2">
            <p className="text-[16px] leading-relaxed text-white/55 sm:text-[17px]">{sub}</p>
            <div className="group flex cursor-default items-center gap-2.5 font-[var(--font-mono)] text-[13px]">
              <span className="text-white/30">{index}</span>
              <span className="text-white/55 transition-colors duration-200 group-hover:text-white">{name}</span>
              <span className="text-white/30 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-1 group-hover:text-white/60">→</span>
            </div>
          </div>
        </div>
      </Reveal>
      <Reveal delay={120} y={40}>
        <Shot src={shot} alt={alt} />
      </Reveal>
    </section>
  )
}

// ─── Nav ──────────────────────────────────────────────────────
function Nav({ onOpen }: { onOpen: () => void }) {
  const navigate = useNavigate()
  return (
    <header style={{ position:'sticky', top:0, zIndex:50, backdropFilter:'blur(20px) saturate(160%)', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(5,5,8,0.72)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 text-white">
          <FloweIcon size={22} />
          <span className="text-[15px] font-semibold" style={{ letterSpacing:'-0.01em' }}>Flowe</span>
        </button>
        <button onClick={onOpen}
          className="pressable rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:opacity-90">
          Open app
        </button>
      </div>
    </header>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate()
  const authStatus = useAuthStore((s) => s.status)
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    if (authStatus !== 'authed') {
      navigate('/login')
      return
    }
    setCreating(true)
    try {
      const res = await apiFetch(`${API}/api/workflows`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ name:'New Workflow', nodes:[], edges:[] }),
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
    <div className="min-h-screen text-white" style={{ fontFamily:'var(--font-sans)', background:'#050507' }}>
      <Nav onOpen={() => navigate('/workflows')} />

      {/* ── Hero — one voice: the headline ── */}
      <section className="relative overflow-hidden">
        <img src="/aurora.jpg" alt="" aria-hidden
          className="aurora-drift pointer-events-none absolute inset-x-0 top-0 h-full w-full object-cover"
          style={{ opacity:0.75 }} />
        <div className="pointer-events-none absolute inset-0"
          style={{ background:'linear-gradient(to bottom, rgba(5,5,7,0.2), rgba(5,5,7,0.6) 60%, #050507)' }} />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-24 lg:pb-20 lg:pt-36">
          <h1 className="rise-in max-w-4xl text-[2.9rem] font-bold sm:text-[4rem] lg:text-[4.6rem]"
            style={{ lineHeight:1.02, letterSpacing:'-0.035em' }}>
            Automation for people,
            <br />
            not just developers
          </h1>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <p className="rise-in max-w-md text-[16px] leading-relaxed text-white/55 sm:text-[17px]" style={{ animationDelay:'80ms' }}>
              Describe what you want in plain English. Flowe builds the workflow and runs it on your schedule.
            </p>
            <div className="rise-in flex items-center gap-3" style={{ animationDelay:'140ms' }}>
              <button onClick={handleCreate} disabled={creating}
                className="pressable rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50">
                {creating ? 'Creating…' : 'Start for free'}
              </button>
              <button onClick={() => navigate('/workflows')}
                className="pressable rounded-full px-6 py-2.5 text-sm font-semibold text-white/60 hover:text-white"
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)' }}>
                Open app
              </button>
            </div>
          </div>
        </div>

        {/* The product — one shot, full width */}
        <div className="relative mx-auto max-w-6xl px-6 pb-8">
          <div className="rise-in" style={{ animationDelay:'180ms' }}>
            <Shot src="/product-editor.jpg" alt="The Flowe workflow editor" />
          </div>
        </div>
      </section>

      {/* ── Statement — words light up as you scroll ── */}
      <section className="mx-auto max-w-6xl px-6 py-32">
        <ScrollStatement
          lead="A new way to automate."
          rest="No drag-and-drop tutorials, no configuration rabbit holes. Tell Flowe what you want — it designs the workflow, wires the tools, and keeps it running."
        />
      </section>

      {/* ── 1.0 Build ── */}
      <NumberedSection
        index="1.0" name="Build"
        title={<>Describe it once.<br />Watch it build.</>}
        sub="The AI builder turns a sentence into a working pipeline — triggers, models, branches and all. Refine it through conversation."
        shot="/shot-build.jpg" alt="Building a workflow by describing it to Flowe AI"
      />

      {/* ── 2.0 Run ── */}
      <NumberedSection
        index="2.0" name="Run"
        title={<>Every step,<br />fully visible.</>}
        sub="Runs stream live and every output is saved. When something fails, you see exactly where and why — no digging through logs."
        shot="/shot-run.jpg" alt="A completed run with the output of every step"
      />

      {/* ── 3.0 Approve ── */}
      <NumberedSection
        index="3.0" name="Approve"
        title={<>AI drafts.<br />You decide.</>}
        sub="Drop a review step anywhere. The workflow pauses, emails you the draft, and waits for one tap — approve or reject, from any device."
        shot="/shot-approve.jpg" alt="A run paused for human approval"
      />

      {/* ── Capabilities — three quiet columns ── */}
      <section className="mx-auto max-w-6xl px-6 py-28" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {[
            ['Any frontier model', 'Claude, GPT, Gemini and Grok — pick per node, switch anytime.'],
            ['Connected to the web', 'AI nodes search and read live pages. No stale answers.'],
            ['Works with your tools', 'Notion, Linear, email, webhooks, and any HTTP API.'],
          ].map(([title, body], i) => (
            <Reveal key={title} delay={i * 90} y={20}>
              <div className="mb-2 text-[15px] font-semibold" style={{ letterSpacing:'-0.01em' }}>{title}</div>
              <p className="text-[14px] leading-relaxed text-white/40">{body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Close — full-stop CTA ── */}
      <section className="px-6 py-36 text-center">
        <Reveal y={36}>
          <h2 className="mx-auto mb-10 max-w-3xl text-[2.6rem] font-bold sm:text-[3.4rem]"
            style={{ letterSpacing:'-0.035em', lineHeight:1.05 }}>
            Describe it once.
            <br />
            <span style={{
              background:'linear-gradient(100deg, #c7baff 0%, #f2a7ff 60%, #8ef0b0 115%)',
              WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent',
            }}>It runs forever.</span>
          </h2>
        </Reveal>
        <Reveal delay={150} y={20}>
          <div className="flex items-center justify-center gap-3">
            <button onClick={handleCreate} disabled={creating}
              className="pressable rounded-full bg-white px-7 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50">
              {creating ? 'Creating…' : 'Get started'}
            </button>
            <button onClick={() => navigate('/login')}
              className="pressable rounded-full px-7 py-3 text-sm font-semibold text-white/60 hover:text-white"
              style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)' }}>
              Sign in
            </button>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-2.5">
            <FloweIcon size={20} />
            <span className="text-sm font-semibold text-white">Flowe</span>
          </div>
          <p className="text-[12px] text-white/25">Automation for everyone — not just engineers.</p>
        </div>
      </footer>
    </div>
  )
}
