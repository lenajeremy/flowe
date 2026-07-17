import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import type { SavedWorkflow } from '@/lib/workflowApi'
import type { NodeType } from '@/types/workflow'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import { useAuthStore } from '@/store/authStore'
import { FloweIcon } from '@/components/FloweIcon'
import { NODE_ICON_PATHS, NODE_LABELS, NODE_DESCRIPTIONS } from '@/lib/nodeColors'

// The landing stays dark by design — it's the brand surface. Colors are
// deliberately fixed (not theme tokens). Structure follows the Linear
// pattern: one voice per screen — a headline, a real product shot, air.

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const finePointer = () =>
  window.matchMedia('(pointer: fine)').matches

// ─── Live aurora — the hero backdrop, rendered rather than drawn ──
// Two passes on one canvas. The sky: three undulating curtains of vertical
// light rays, a sharp green lower edge fading upward through purple into
// pink — how a real aurora hangs, and it happens to be the brand ramp from
// the closing CTA gradient. In front of it: aurora-lit dust. On fine
// pointers the hand blows the dust away — motes scatter outward and along
// the sweep, then each drifts back to its home on a soft spring. The sky
// itself stays untouched; only the dust answers.
// Raw WebGL, no dependencies. The static aurora.jpg stays underneath as
// the instant paint and the fallback for reduced-motion / no-WebGL.
// NB: the hash is sin-free (Hoskins) — sin-based hashes lose precision on
// Apple/Metal GPUs and collapse the whole field into gray noise.
const AURORA_FRAG = `precision highp float;
uniform float u_t;
uniform vec2 u_r;
float hash(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*0.1031);
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);
}
float fbm(vec2 p){
  float v=0.0,a=0.5;
  for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(11.7,-4.3);a*=0.5;}
  return v;
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_r;
  float ar=u_r.x/u_r.y;
  vec2 sp=vec2(uv.x*ar,uv.y);
  float T=u_t*0.06;
  vec3 green=vec3(0.35,0.95,0.6);
  vec3 purple=vec3(0.55,0.4,1.0);
  vec3 pink=vec3(0.95,0.5,1.0);
  vec3 col=vec3(0.0);
  for(int i=0;i<3;i++){
    float fi=float(i);
    float x=sp.x*(1.0+fi*0.35)+fi*7.31;
    float drift=T*(0.5+fi*0.3);
    // shimmering vertical rays across the curtain
    float ray=fbm(vec2(x*2.6+drift,drift*0.7+fi*13.7));
    ray=pow(max(ray,0.0),3.0)*2.4;
    // the curtain's undulating lower edge
    float base=0.36+fi*0.11+0.22*(fbm(vec2(x*0.7-drift*0.8,fi*5.2))-0.5);
    float d=sp.y-base;
    // sharp below, long glow fading upward
    float profile=smoothstep(-0.045,0.01,d)*exp(-max(d,0.0)*2.6);
    // green at the lower edge, purple through the body, pink at the top
    vec3 c=mix(green,purple,smoothstep(-0.02,0.32,d));
    c=mix(c,pink,smoothstep(0.28,0.62,d)*0.7);
    col+=c*ray*profile*(1.05-fi*0.25);
  }
  col*=0.25+0.75*smoothstep(0.0,0.55,uv.y);
  gl_FragColor=vec4(col,1.0);
}`

// Dust pass — one GL point per mote. Position comes from the CPU physics;
// the vertex shader only adds a slow idle wander so dust never sits still.
const DUST_VERT = `precision mediump float;
attribute vec2 a_p;
attribute vec3 a_c;
attribute vec2 a_m;
uniform float u_t;
uniform float u_s;
varying vec3 v_c;
varying float v_tw;
void main(){
  vec2 p=a_p;
  p.x+=sin(u_t*0.31+a_m.y*47.0)*0.006;
  p.y+=cos(u_t*0.24+a_m.y*61.0)*0.005;
  gl_Position=vec4(p*2.0-1.0,0.0,1.0);
  gl_PointSize=max(1.0,a_m.x*u_s);
  v_c=a_c;
  v_tw=0.6+0.4*sin(u_t*(0.6+a_m.y)+a_m.y*40.0);
}`

const DUST_FRAG = `precision mediump float;
varying vec3 v_c;
varying float v_tw;
void main(){
  vec2 d=gl_PointCoord-0.5;
  float a=exp(-dot(d,d)*14.0)*0.5*v_tw;
  gl_FragColor=vec4(v_c*a,1.0);
}`

function AuroraShader() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (reducedMotion()) return
    const canvas = ref.current
    if (!canvas) return
    // NB: a canvas only ever has one WebGL context — StrictMode remounts get
    // this same object back, so it must never be lose-context'd in cleanup.
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false })
    if (!gl || gl.isContextLost()) return

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const link = (vert: string, frag: string) => {
      const p = gl.createProgram()!
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vert))
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag))
      gl.linkProgram(p)
      return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null
    }

    // ── Sky pass — one fullscreen triangle, no index buffer, no seam
    const sky = link('attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}', AURORA_FRAG)
    if (!sky) return
    const skyBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aSky = gl.getAttribLocation(sky, 'a')
    const uT = gl.getUniformLocation(sky, 'u_t')
    const uR = gl.getUniformLocation(sky, 'u_r')

    // ── Dust pass — motes with homes; physics lives on the CPU
    const dust = link(DUST_VERT, DUST_FRAG)
    if (!dust) return
    const N = 700
    const px = new Float32Array(N), py = new Float32Array(N) // position (uv, y-up)
    const vx = new Float32Array(N), vy = new Float32Array(N) // velocity
    const hx = new Float32Array(N), hy = new Float32Array(N) // home
    const posArr = new Float32Array(N * 2)
    const meta = new Float32Array(N * 5) // r g b · size · phase
    for (let i = 0; i < N; i++) {
      const x = Math.random()
      const y = Math.random()
      hx[i] = px[i] = x
      hy[i] = py[i] = y
      // each mote wears the curtain colour of its altitude
      const t = y + (Math.random() - 0.5) * 0.25
      let r = 0.55, g = 0.4, b = 1.0 // purple
      if (t < 0.38) { r = 0.35; g = 0.95; b = 0.6 } // green
      else if (t > 0.72) { r = 0.95; g = 0.5; b = 1.0 } // pink
      meta[i * 5] = r; meta[i * 5 + 1] = g; meta[i * 5 + 2] = b
      meta[i * 5 + 3] = 1 + Math.random() * 2.4 // size
      meta[i * 5 + 4] = Math.random() // phase
    }
    const posBuf = gl.createBuffer()
    const metaBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, metaBuf)
    gl.bufferData(gl.ARRAY_BUFFER, meta, gl.STATIC_DRAW)
    const aP = gl.getAttribLocation(dust, 'a_p')
    const aC = gl.getAttribLocation(dust, 'a_c')
    const aM = gl.getAttribLocation(dust, 'a_m')
    const uTd = gl.getUniformLocation(dust, 'u_t')
    const uS = gl.getUniformLocation(dust, 'u_s')

    // ── Pointer — position + velocity in uv space. Dust inside the radius
    // is blown outward and inherits the sweep; springs bring it home.
    const ptr = { x: -9, y: -9, vx: 0, vy: 0, on: false }
    let lastMove = 0
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = 1 - (e.clientY - r.top) / r.height // GL is y-up
      const now = performance.now()
      if (ptr.on && now - lastMove < 120) {
        // smoothed per-event velocity; stale gaps reset so entries don't kick
        ptr.vx = ptr.vx * 0.7 + (x - ptr.x) * 0.3
        ptr.vy = ptr.vy * 0.7 + (y - ptr.y) * 0.3
      } else {
        ptr.vx = 0
        ptr.vy = 0
      }
      ptr.x = x
      ptr.y = y
      ptr.on = true
      lastMove = now
    }
    const onLeave = () => { ptr.on = false }
    const host = canvas.parentElement
    const interactive = finePointer() && host
    if (interactive) {
      host.addEventListener('pointermove', onMove)
      host.addEventListener('pointerleave', onLeave)
    }

    const fit = () => {
      // Soft by nature — render below CSS resolution and let it upscale,
      // but high enough that the curtain rays keep their definition
      const w = Math.max(1, Math.round(canvas.clientWidth * 0.8))
      const h = Math.max(1, Math.round(canvas.clientHeight * 0.8))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }

    // Only burn GPU while the hero is on screen and the tab is visible
    let raf = 0
    let onScreen = true
    let pageVisible = !document.hidden
    const start = performance.now()
    const frame = () => {
      raf = 0
      if (!onScreen || !pageVisible) return
      fit()
      const t = (performance.now() - start) / 1000
      const ar = canvas.width / Math.max(1, canvas.height)

      // sky
      gl.disable(gl.BLEND)
      gl.useProgram(sky)
      gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf)
      gl.enableVertexAttribArray(aSky)
      gl.vertexAttribPointer(aSky, 2, gl.FLOAT, false, 0, 0)
      gl.uniform1f(uT, t)
      gl.uniform2f(uR, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      // dust physics — a puff outward scaled by sweep speed, spring home,
      // air drag. Spring and drag are tuned near critical damping so the
      // return is one smooth settle, not a wobble.
      const R = 0.18, R2 = R * R
      const sweep = Math.min(0.06, Math.hypot(ptr.vx, ptr.vy))
      for (let i = 0; i < N; i++) {
        if (ptr.on) {
          const dx = (px[i] - ptr.x) * ar
          const dy = py[i] - ptr.y
          const d2 = dx * dx + dy * dy
          if (d2 < R2) {
            const d = Math.sqrt(d2) + 1e-4
            const f = 1 - d / R
            const kick = f * f * (0.0011 + sweep * 0.05)
            vx[i] += (dx / d) * kick + ptr.vx * f * f * 0.16
            vy[i] += (dy / d) * kick + ptr.vy * f * f * 0.16
          }
        }
        vx[i] += (hx[i] - px[i]) * 0.0011
        vy[i] += (hy[i] - py[i]) * 0.0011
        vx[i] *= 0.93
        vy[i] *= 0.93
        px[i] += vx[i]
        py[i] += vy[i]
        posArr[i * 2] = px[i]
        posArr[i * 2 + 1] = py[i]
      }

      // dust — additive: motes are light, they never darken the sky
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE)
      gl.useProgram(dust)
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
      gl.bufferData(gl.ARRAY_BUFFER, posArr, gl.DYNAMIC_DRAW)
      gl.enableVertexAttribArray(aP)
      gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, metaBuf)
      gl.enableVertexAttribArray(aC)
      gl.vertexAttribPointer(aC, 3, gl.FLOAT, false, 20, 0)
      gl.enableVertexAttribArray(aM)
      gl.vertexAttribPointer(aM, 2, gl.FLOAT, false, 20, 12)
      gl.uniform1f(uTd, t)
      gl.uniform1f(uS, canvas.height / 560) // point size tracks resolution
      gl.drawArrays(gl.POINTS, 0, N)

      setLive(true) // fade in only once a real frame exists
      raf = requestAnimationFrame(frame)
    }
    const play = () => {
      if (!raf && onScreen && pageVisible) raf = requestAnimationFrame(frame)
    }
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      play()
    })
    io.observe(canvas)
    const onVis = () => {
      pageVisible = !document.hidden
      play()
    }
    document.addEventListener('visibilitychange', onVis)

    play()
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      if (interactive) {
        host.removeEventListener('pointermove', onMove)
        host.removeEventListener('pointerleave', onLeave)
      }
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: live ? 0.9 : 0, transition: 'opacity 1600ms var(--ease-out)' }}
    />
  )
}

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

// ─── Stroke glyph — shares the app's icon-path language ──
const ACCENT = '#a08cff'

function Glyph({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" style={{ overflow:'visible' }}>
      <path d={d} stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// A 2×2 grid mark for the "integrations" capability (no single node owns it)
const GRID_PATH = 'M2 2.5h4.5v4.5H2zM9.5 2.5H14v4.5H9.5zM2 9.5h4.5v4.5H2zM9.5 9.5H14v4.5H9.5z'

// Brand accents — the dark-theme --na-* values, fixed here because the
// landing never re-themes. Keeps the wall in the same ink as the canvas.
const NODE_TINTS: Partial<Record<NodeType, string>> = {
  slack:'#36c5f0', gmail:'#ea4335', outlook:'#2a8fe8', notion:'#e5e4e5',
  linear:'#5e6ad2', github:'#e5e4e5', gitlab:'#fc6d26', googlecalendar:'#4285f4',
  googledrive:'#1fa463', googledocs:'#4c8bf5', googlesheets:'#0f9d58',
  stripe:'#635bff', shopify:'#96bf48',
}

// ─── Integrations — the tools Flowe can drive, one quiet wall ──
const INTEGRATIONS: NodeType[] = [
  'slack', 'gmail', 'outlook', 'notion', 'linear', 'github', 'gitlab',
  'googlecalendar', 'googledrive', 'googledocs', 'googlesheets', 'stripe', 'shopify',
]

function IntegrationTile({ type }: { type: NodeType }) {
  const [hover, setHover] = useState(false)
  const tint = NODE_TINTS[type] ?? ACCENT
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center gap-3 rounded-xl px-4 py-3.5"
      style={{
        border:`1px solid ${hover ? `color-mix(in srgb, ${tint} 45%, transparent)` : 'rgba(255,255,255,0.08)'}`,
        background: hover ? `color-mix(in srgb, ${tint} 7%, transparent)` : 'rgba(255,255,255,0.015)',
        transition:'border-color 260ms var(--ease-out), background 260ms var(--ease-out)',
      }}>
      <div style={{
        color: tint,
        opacity: hover ? 1 : 0.85,
        filter: hover ? `drop-shadow(0 0 6px color-mix(in srgb, ${tint} 60%, transparent))` : 'none',
        transition:'opacity 260ms var(--ease-out), filter 260ms var(--ease-out)',
      }}>
        <Glyph d={NODE_ICON_PATHS[type]} size={19} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-white">{NODE_LABELS[type]}</div>
        <div className="truncate text-[11px] text-white/40">{NODE_DESCRIPTIONS[type]}</div>
      </div>
    </div>
  )
}

function Integrations() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
      <Reveal>
        <div className="mb-14 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          <h2 className="text-[2.1rem] font-bold sm:text-[2.6rem]" style={{ letterSpacing:'-0.03em', lineHeight:1.08 }}>
            Plugs into the tools<br />you already run.
          </h2>
          <div className="flex flex-col gap-6 lg:pt-2">
            <p className="text-[16px] leading-relaxed text-white/55 sm:text-[17px]">
              Thirteen integrations and hundreds of read-and-write actions — messaging, mail, code, docs, spreadsheets and commerce. Connect an account once, then reach for it in any workflow.
            </p>
            <div className="group flex cursor-default items-center gap-2.5 font-[var(--font-mono)] text-[13px]">
              <span className="text-white/30">4.0</span>
              <span className="text-white/55 transition-colors duration-200 group-hover:text-white">Connect</span>
              <span className="text-white/30 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-1 group-hover:text-white/60">→</span>
            </div>
          </div>
        </div>
      </Reveal>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {INTEGRATIONS.map((type, i) => (
          <Reveal key={type} delay={(i % 4) * 60} y={16}>
            <IntegrationTile type={type} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ─── Build-by-chat — the AI builder, shown as a real conversation.
// Once scrolled into view the built workflow *runs*, on loop: each step
// lights up in its node accent, completes with a check, and the cycle
// restarts — the same live-run feel as the product. Reduced motion gets
// the finished state (all steps checked) with no loop.
const BUILD_STEPS: Array<{ type: NodeType; name: string; detail: string; tint: string }> = [
  { type:'scheduledTrigger', name:'Scheduled', detail:'Every weekday · 9:00 AM', tint:'#ff8ce8' },
  { type:'linear', name:'Linear', detail:'List new issues', tint:'#5e6ad2' },
  { type:'llm', name:'Summarize', detail:'Claude Opus', tint:'#70f17b' },
  { type:'slack', name:'Slack', detail:'Post to #standup', tint:'#36c5f0' },
]

function StepStatus({ state, tint }: { state: 'todo' | 'running' | 'done'; tint: string }) {
  if (state === 'done') {
    return (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
        <path d="M2.5 7l3 3 5-6.5" stroke="#3dd68c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (state === 'running') {
    return <span className="pulse-dot" style={{ width:7, height:7, borderRadius:999, background:tint, boxShadow:`0 0 8px ${tint}` }} />
  }
  return <span style={{ width:7, height:7, borderRadius:999, border:'1px solid rgba(255,255,255,0.2)' }} />
}

function ChatMock() {
  const [ref, inView] = useInView<HTMLDivElement>()
  // -1 idle · 0..n-1 that step is executing · n every step is done
  const [active, setActive] = useState(() => (reducedMotion() ? BUILD_STEPS.length : -1))
  const [flat, setFlat] = useState(false)
  const [poses] = useState(() => finePointer() && !reducedMotion())

  useEffect(() => {
    if (!inView || reducedMotion()) return
    let i = -1
    const id = setInterval(() => {
      i += 1
      // n phases of work, then the finished state holds two beats
      const phase = i % (BUILD_STEPS.length + 2)
      setActive(Math.min(phase, BUILD_STEPS.length))
    }, 1000)
    return () => clearInterval(id)
  }, [inView])

  const running = inView && active >= 0 && active < BUILD_STEPS.length

  return (
    <div ref={ref}
      onMouseEnter={() => setFlat(true)}
      onMouseLeave={() => setFlat(false)}
      className="rounded-2xl p-5 sm:p-6"
      style={{
        border:'1px solid rgba(255,255,255,0.08)', background:'#0a0a0d', boxShadow:'0 40px 120px rgba(0,0,0,0.5)',
        // Rests at a slight 3D angle, levels out under the cursor
        transform: poses && !flat ? 'perspective(1400px) rotateY(-5deg) rotateX(2deg)' : 'none',
        transition:'transform 600ms var(--ease-out)',
      }}>
      <div className="mb-5 flex items-center gap-2 border-b border-white/[0.06] pb-4">
        <FloweIcon size={16} />
        <span className="text-[12px] font-semibold text-white/80">AI builder</span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-white/35">
          <span className={running ? 'pulse-dot' : undefined}
            style={{ width:6, height:6, borderRadius:999, background: running ? ACCENT : '#8ef0b0' }} />
          {active < 0 ? 'Ready' : running ? 'Running' : 'Done'}
        </span>
      </div>

      {/* what you type */}
      <div className="mb-5 flex justify-end">
        <p className="max-w-[82%] rounded-2xl rounded-br-md px-4 py-2.5 text-[13px] leading-relaxed text-white"
          style={{ background:'rgba(160,140,255,0.16)', border:'1px solid rgba(160,140,255,0.22)' }}>
          Every weekday at 9am, summarize new Linear issues and post them to #standup.
        </p>
      </div>

      {/* what it builds — and how it runs */}
      <p className="mb-3 text-[13px] leading-relaxed text-white/70">Done — here's your workflow:</p>
      <div className="overflow-hidden rounded-xl" style={{ border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.02)' }}>
        {BUILD_STEPS.map((s, i) => {
          const state = active > i ? 'done' : active === i ? 'running' : 'todo'
          return (
            <div key={s.name} className="flex items-center gap-3 px-3.5 py-2.5"
              style={{
                borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                background: state === 'running' ? `color-mix(in srgb, ${s.tint} 5%, transparent)` : 'transparent',
                // Rows land one after another once the mock scrolls in
                opacity: inView ? 1 : 0,
                transform: inView ? 'none' : 'translateY(8px)',
                transition: `background 400ms var(--ease-out), opacity 500ms var(--ease-out) ${180 + i * 90}ms, transform 500ms var(--ease-out) ${180 + i * 90}ms`,
              }}>
              <div style={{
                color: state === 'todo' ? 'rgba(255,255,255,0.3)' : s.tint,
                filter: state === 'running' ? `drop-shadow(0 0 5px ${s.tint})` : 'none',
                transition:'color 400ms var(--ease-out), filter 400ms var(--ease-out)',
              }}>
                <Glyph d={NODE_ICON_PATHS[s.type]} size={16} />
              </div>
              <span className="text-[12.5px] font-medium"
                style={{ color: state === 'todo' ? 'rgba(255,255,255,0.5)' : '#fff', transition:'color 400ms var(--ease-out)' }}>
                {s.name}
              </span>
              <span className="ml-auto text-[11.5px] text-white/40">{s.detail}</span>
              <StepStatus state={state} tint={s.tint} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChatBand() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <div>
            <span className="mb-5 block font-[var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-white/35">Build by chat</span>
            <h2 className="text-[2.1rem] font-bold sm:text-[2.6rem]" style={{ letterSpacing:'-0.03em', lineHeight:1.08 }}>
              Talk to it like<br />a teammate.
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-white/55 sm:text-[17px]">
              The AI builder rides along on the canvas and sits behind a button on every screen. Ask it to add a step, wire up an integration, or reshape the whole flow — in plain language. It edits the workflow in place while you watch.
            </p>
          </div>
        </Reveal>
        <Reveal delay={120} y={34}>
          <ChatMock />
        </Reveal>
      </div>
    </section>
  )
}

// ─── Capabilities — the breadth, at a glance. Each icon wears the
// accent of the node that owns the capability inside the app.
const CAPABILITIES: Array<{ icon: string; tint: string; title: string; body: string }> = [
  { icon: NODE_ICON_PATHS.llm, tint:'#70f17b', title:'Any frontier model', body:'Claude, GPT, Gemini and Grok — choose per step, switch whenever.' },
  { icon: NODE_ICON_PATHS.httpRequest, tint:'#51b4fb', title:'Live web access', body:'AI steps search and read current pages, so answers never go stale.' },
  { icon: GRID_PATH, tint:'#a08cff', title:'13 integrations', body:'Slack, Gmail, Notion, GitHub, Stripe, Google Workspace and more.' },
  { icon: NODE_ICON_PATHS.scheduledTrigger, tint:'#ff8ce8', title:'Triggers on your terms', body:'Run on a schedule, or fire instantly from an incoming webhook.' },
  { icon: NODE_ICON_PATHS.humanApproval, tint:'#f94b4b', title:'Human in the loop', body:'Pause for a one-tap approval before anything important ships.' },
  { icon: NODE_ICON_PATHS.branch, tint:'#64f4bf', title:'Branch & loop', body:'Real control flow — fork on conditions, iterate across a list.' },
]

function Capabilities() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
      <Reveal>
        <h2 className="mb-14 max-w-2xl text-[2.1rem] font-bold sm:text-[2.6rem]" style={{ letterSpacing:'-0.03em', lineHeight:1.08 }}>
          Everything the<br />workflow needs.
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((c, i) => (
          <Reveal key={c.title} delay={(i % 3) * 90} y={20}>
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg"
              style={{
                border:`1px solid color-mix(in srgb, ${c.tint} 25%, transparent)`,
                background:`color-mix(in srgb, ${c.tint} 6%, transparent)`,
                color: c.tint,
              }}>
              <Glyph d={c.icon} size={18} />
            </div>
            <div className="mb-2 text-[15px] font-semibold" style={{ letterSpacing:'-0.01em' }}>{c.title}</div>
            <p className="text-[14px] leading-relaxed text-white/45">{c.body}</p>
          </Reveal>
        ))}
      </div>
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
        <AuroraShader />
        <div className="pointer-events-none absolute inset-0"
          style={{ background:'linear-gradient(to bottom, rgba(5,5,7,0.2), rgba(5,5,7,0.6) 60%, #050507)' }} />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-24 lg:pb-20 lg:pt-36">
          {/* Each word rises out of a blur, left to right — one gesture,
              then the sub, buttons and shot follow through. */}
          <h1 className="max-w-4xl text-[2.9rem] font-bold sm:text-[4rem] lg:text-[4.6rem]"
            style={{ lineHeight:1.02, letterSpacing:'-0.035em' }}>
            {[['Automation', 'for', 'people,'], ['not', 'just', 'developers']].map((line, li) => (
              <span key={li} className="block">
                {/* NB: the separator below is U+00A0 — a plain space would be
                    trimmed as trailing whitespace inside the inline-block */}
                {line.map((word, wi) => (
                  <span key={word} className="word-in" style={{ animationDelay:`${(li * 3 + wi) * 90}ms` }}>
                    {word}{wi < line.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <p className="rise-in max-w-md text-[16px] leading-relaxed text-white/55 sm:text-[17px]" style={{ animationDelay:'480ms' }}>
              Describe what you want in plain English. Flowe builds the workflow and runs it on your schedule.
            </p>
            <div className="rise-in flex items-center gap-3" style={{ animationDelay:'600ms' }}>
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
          <div className="rise-in" style={{ animationDelay:'680ms' }}>
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

      {/* ── Integrations — the tools Flowe drives ── */}
      <Integrations />

      {/* ── Build by chat — the AI builder ── */}
      <ChatBand />

      {/* ── Capabilities — the breadth, at a glance ── */}
      <Capabilities />

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
