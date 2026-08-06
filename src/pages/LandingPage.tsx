import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import type { SavedWorkflow } from '@/lib/workflowApi'
import type { NodeType } from '@/types/workflow'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import { useAuthStore } from '@/store/authStore'
import { FloweIcon } from '@/components/FloweIcon'
import { IntegrationLogo } from '@/components/IntegrationLogo'
import { isIntegration } from '@/lib/integrationLogos'
import { NODE_ICON_PATHS, NODE_LABELS, NODE_DESCRIPTIONS } from '@/lib/nodeColors'
import { RULE } from '@/lib/brandSurface'

// The landing stays dark by design — it's the brand surface. Colors are
// deliberately fixed (not theme tokens). Structure follows the Linear
// pattern: one voice per screen — a headline, a real product shot, air.

// Both are read inside useState initialisers, so they run during render —
// including the build-time prerender, where there is no window. The defaults are
// the common browser case; the client corrects on mount.
const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const finePointer = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(pointer: fine)').matches

// ─── Live aurora — the hero backdrop, rendered rather than drawn ──
// Three undulating curtains of vertical light rays: a sharp green lower
// edge fading upward through purple into pink — how a real aurora hangs,
// and it happens to be the brand ramp from the closing CTA gradient.
// The sky is vapor. A coarse flow field, simulated on the CPU, bends the
// curtains wherever the pointer sweeps; the disturbance diffuses outward
// and dissipates, so the aurora drifts back to the flow it had before.
// Moved, never warped — linear filtering over the blurred field keeps
// every bend broad and continuous.
// Raw WebGL, no dependencies. The static aurora.jpg stays underneath as
// the instant paint and the fallback for reduced-motion / no-WebGL.
// NB: the hash is sin-free (Hoskins) — sin-based hashes lose precision on
// Apple/Metal GPUs and collapse the whole field into gray noise.
// Shader disabled — the static aurora.jpg reads better. Kept for reference.
// const AURORA_FRAG = `precision highp float;
// uniform float u_t;
// uniform vec2 u_r;
// uniform sampler2D u_f;
// float hash(vec2 p){
//   vec3 p3=fract(vec3(p.xyx)*0.1031);
//   p3+=dot(p3,p3.yzx+33.33);
//   return fract((p3.x+p3.y)*p3.z);
// }
// float noise(vec2 p){
//   vec2 i=floor(p),f=fract(p);
//   vec2 u=f*f*(3.0-2.0*f);
//   return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);
// }
// float fbm(vec2 p){
//   float v=0.0,a=0.5;
//   for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(11.7,-4.3);a*=0.5;}
//   return v;
// }
// void main(){
//   vec2 uv=gl_FragCoord.xy/u_r;
//   float ar=u_r.x/u_r.y;
//   // the vapor field — RG: displacement (decode mirrors the JS encode:
//   // v/SCALE*127+128, SCALE=0.15) · B: cavity, the density deficit where a
//   // body has broken through and the cloud material is simply gone
//   vec3 fld=texture2D(u_f,uv).rgb;
//   vec2 disp=(fld.rg-vec2(128.0/255.0))*(255.0/127.0)*0.15;
//   float cav=fld.b;
//   vec2 sp=vec2(uv.x*ar,uv.y);
//   float T=u_t*0.06;
//   vec3 green=vec3(0.30,0.86,0.52);
//   vec3 purple=vec3(0.06,0.66,0.64);
//   vec3 pink=vec3(0.55,0.88,0.34);
//   vec3 col=vec3(0.0);
//   for(int i=0;i<3;i++){
//     float fi=float(i);
//     // deeper curtains sway less — the vapor has depth
//     vec2 w=sp+vec2(disp.x*ar,disp.y)*(1.0-fi*0.25);
//     float x=w.x*(1.0+fi*0.35)+fi*7.31;
//     float drift=T*(0.5+fi*0.3);
//     // shimmering rays with vertical grain — segments stream slowly upward,
//     // and give the vapor's vertical motion something visible to carry
//     float ray=fbm(vec2(x*2.6+drift,w.y*1.4-drift*0.9+fi*13.7));
//     ray=pow(max(ray,0.0),3.0)*2.4;
//     // the curtain's undulating lower edge
//     float base=0.36+fi*0.11+0.22*(fbm(vec2(x*0.7-drift*0.8,fi*5.2))-0.5);
//     float d=w.y-base;
//     // sharp below, long glow fading upward
//     float profile=smoothstep(-0.045,0.01,d)*exp(-max(d,0.0)*2.6);
//     // green at the lower edge, purple through the body, pink at the top
//     vec3 c=mix(green,purple,smoothstep(-0.02,0.32,d));
//     c=mix(c,pink,smoothstep(0.28,0.62,d)*0.7);
//     col+=c*ray*profile*(1.05-fi*0.25);
//   }
//   // the hole the body tore open: dark inside, a compressed glow at the rim
//   col*=(1.0-0.85*cav)*(1.0+1.5*length(disp)*(1.0-cav));
//   col*=0.25+0.75*smoothstep(0.0,0.55,uv.y);
//   gl_FragColor=vec4(col,1.0);
// }`
//
// function AuroraShader() {
//   const ref = useRef<HTMLCanvasElement>(null)
//   const [live, setLive] = useState(false)
//
//   useEffect(() => {
//     if (reducedMotion()) return
//     const canvas = ref.current
//     if (!canvas) return
//     // NB: a canvas only ever has one WebGL context — StrictMode remounts get
//     // this same object back, so it must never be lose-context'd in cleanup.
//     const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false })
//     if (!gl || gl.isContextLost()) return
//
//     const compile = (type: number, src: string) => {
//       const s = gl.createShader(type)!
//       gl.shaderSource(s, src)
//       gl.compileShader(s)
//       return s
//     }
//     const prog = gl.createProgram()!
//     gl.attachShader(prog, compile(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'))
//     gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, AURORA_FRAG))
//     gl.linkProgram(prog)
//     if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
//     gl.useProgram(prog)
//
//     // One fullscreen triangle — no index buffer, no second triangle seam
//     gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
//     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
//     const a = gl.getAttribLocation(prog, 'a')
//     gl.enableVertexAttribArray(a)
//     gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
//     const uT = gl.getUniformLocation(prog, 'u_t')
//     const uR = gl.getUniformLocation(prog, 'u_r')
//     gl.uniform1i(gl.getUniformLocation(prog, 'u_f'), 0)
//
//     // ── Vapor flow field — a coarse displacement grid stepped on the CPU.
//     // The pointer's sweep injects its own velocity into nearby cells; every
//     // step the field diffuses (vapor spreads) and dissipates (the sky
//     // drifts back to the flow it had). Uploaded as a tiny RG texture the
//     // fragment shader samples with linear filtering.
//     const FW = 48, FH = 28
//     const SCALE = 0.15 // max bend, in uv — the sky sways, it never tears
//     let fx = new Float32Array(FW * FH)
//     let fy = new Float32Array(FW * FH)
//     let fd = new Float32Array(FW * FH) // density deficit — the torn-open cavity
//     let scx = new Float32Array(FW * FH) // diffusion scratch
//     let scy = new Float32Array(FW * FH)
//     let scd = new Float32Array(FW * FH)
//     const pix = new Uint8Array(FW * FH * 4)
//     const tex = gl.createTexture()
//     gl.bindTexture(gl.TEXTURE_2D, tex)
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
//
//     // ── Pointer — position + velocity in uv space (y-up). Only a moving
//     // hand stirs the vapor; a still one lets it settle.
//     const ptr = { x: -9, y: -9, vx: 0, vy: 0, on: false }
//     let lastMove = 0
//     const onMove = (e: PointerEvent) => {
//       const r = canvas.getBoundingClientRect()
//       const x = (e.clientX - r.left) / r.width
//       const y = 1 - (e.clientY - r.top) / r.height // GL is y-up
//       const now = performance.now()
//       if (ptr.on && now - lastMove < 120) {
//         // smoothed per-event velocity; stale gaps reset so entries don't kick
//         ptr.vx = ptr.vx * 0.7 + (x - ptr.x) * 0.3
//         ptr.vy = ptr.vy * 0.7 + (y - ptr.y) * 0.3
//       } else {
//         ptr.vx = 0
//         ptr.vy = 0
//       }
//       ptr.x = x
//       ptr.y = y
//       ptr.on = true
//       lastMove = now
//     }
//     const onLeave = () => { ptr.on = false }
//     const host = canvas.parentElement
//     const interactive = finePointer() && host
//     if (interactive) {
//       host.addEventListener('pointermove', onMove)
//       host.addEventListener('pointerleave', onLeave)
//     }
//
//     const stepField = (ar: number) => {
//       // The pointer is a solid body permeating the vapor: a wide plateau
//       // core (not a gaussian point) that drags cloud along its motion and
//       // shoves it radially out of the way, like a ball through smoke.
//       if (ptr.on) {
//         const cvx = Math.max(-0.04, Math.min(0.04, ptr.vx))
//         const cvy = Math.max(-0.04, Math.min(0.04, ptr.vy))
//         const speed = Math.hypot(cvx, cvy)
//         if (speed > 0.0004) {
//           const R = 0.16 // the body's reach — compact, a fist through the vapor
//           for (let cy = 0; cy < FH; cy++) {
//             const dy = (cy + 0.5) / FH - ptr.y
//             for (let cx = 0; cx < FW; cx++) {
//               const dx = ((cx + 0.5) / FW - ptr.x) * ar
//               const d = Math.hypot(dx, dy)
//               if (d > R) continue
//               // full strength across the core, soft skirt at the edge
//               const body = d < R * 0.45 ? 1 : 1 - (d - R * 0.45) / (R * 0.55)
//               const rx = d > 1e-4 ? dx / d : 0
//               const ry = d > 1e-4 ? dy / d : 0
//               const i = cy * FW + cx
//               // parting dominates drag: material moves out of the way,
//               // and the core tears open — cloud is displaced, not painted.
//               // Kept modest so the vapor parts nearby, not across the sky.
//               fx[i] += (cvx * 0.45 + rx * speed * 0.7) * body * 0.9
//               fy[i] += (cvy * 0.45 + ry * speed * 0.7) * body * 0.9
//               fd[i] = Math.min(1, fd[i] + (0.05 + speed * 4) * body)
//             }
//           }
//         }
//       }
//       // diffuse + dissipate — the tear is sharp but shortlived: the sky
//       // finds its old flow again in a beat or two
//       // (α must stay ≤0.25 to keep the explicit step stable)
//       for (let cy = 0; cy < FH; cy++) {
//         const row = cy * FW
//         const up = Math.min(FH - 1, cy + 1) * FW
//         const dn = Math.max(0, cy - 1) * FW
//         for (let cx = 0; cx < FW; cx++) {
//           const i = row + cx
//           const l = row + Math.max(0, cx - 1)
//           const r = row + Math.min(FW - 1, cx + 1)
//           scx[i] = (fx[i] + 0.15 * (fx[l] + fx[r] + fx[up + cx] + fx[dn + cx] - 4 * fx[i])) * 0.97
//           scy[i] = (fy[i] + 0.15 * (fy[l] + fy[r] + fy[up + cx] + fy[dn + cx] - 4 * fy[i])) * 0.97
//           scd[i] = (fd[i] + 0.15 * (fd[l] + fd[r] + fd[up + cx] + fd[dn + cx] - 4 * fd[i])) * 0.97
//         }
//       }
//       ;[fx, scx] = [scx, fx]
//       ;[fy, scy] = [scy, fy]
//       ;[fd, scd] = [scd, fd]
//       // encode around 128 so a resting sky is exactly zero displacement;
//       // the cavity rides in B
//       for (let i = 0; i < FW * FH; i++) {
//         pix[i * 4] = Math.max(0, Math.min(255, Math.round((fx[i] / SCALE) * 127 + 128)))
//         pix[i * 4 + 1] = Math.max(0, Math.min(255, Math.round((fy[i] / SCALE) * 127 + 128)))
//         pix[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(fd[i] * 255)))
//         pix[i * 4 + 3] = 255
//       }
//       gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FW, FH, 0, gl.RGBA, gl.UNSIGNED_BYTE, pix)
//     }
//
//     const fit = () => {
//       // Soft by nature — render below CSS resolution and let it upscale,
//       // but high enough that the curtain rays keep their definition
//       const w = Math.max(1, Math.round(canvas.clientWidth * 0.8))
//       const h = Math.max(1, Math.round(canvas.clientHeight * 0.8))
//       if (canvas.width !== w || canvas.height !== h) {
//         canvas.width = w
//         canvas.height = h
//         gl.viewport(0, 0, w, h)
//       }
//     }
//
//     // Only burn GPU while the hero is on screen and the tab is visible
//     let raf = 0
//     let onScreen = true
//     let pageVisible = !document.hidden
//     const start = performance.now()
//     const frame = () => {
//       raf = 0
//       if (!onScreen || !pageVisible) return
//       fit()
//       stepField(canvas.width / Math.max(1, canvas.height))
//       gl.uniform1f(uT, (performance.now() - start) / 1000)
//       gl.uniform2f(uR, canvas.width, canvas.height)
//       gl.drawArrays(gl.TRIANGLES, 0, 3)
//       setLive(true) // fade in only once a real frame exists
//       raf = requestAnimationFrame(frame)
//     }
//     const play = () => {
//       if (!raf && onScreen && pageVisible) raf = requestAnimationFrame(frame)
//     }
//     const io = new IntersectionObserver(([entry]) => {
//       onScreen = entry.isIntersecting
//       play()
//     })
//     io.observe(canvas)
//     const onVis = () => {
//       pageVisible = !document.hidden
//       play()
//     }
//     document.addEventListener('visibilitychange', onVis)
//
//     play()
//     return () => {
//       io.disconnect()
//       document.removeEventListener('visibilitychange', onVis)
//       if (interactive) {
//         host.removeEventListener('pointermove', onMove)
//         host.removeEventListener('pointerleave', onLeave)
//       }
//       if (raf) cancelAnimationFrame(raf)
//     }
//   }, [])
//
//   return (
//     <canvas
//       ref={ref}
//       aria-hidden
//       className="pointer-events-none absolute inset-0 h-full w-full"
//       style={{ opacity: live ? 0.9 : 0, transition: 'opacity 1600ms var(--ease-out)' }}
//     />
//   )
// }

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

// ─── Section rhythm — one scale for the whole page. Every content band
// gets the same vertical beat and the same heading scale, so the page
// stops drifting between py-28/32/36. Tracking tightens as type grows.
const SECTION = 'mx-auto max-w-6xl px-6 py-24 sm:py-32'
const H2 = 'text-[2.05rem] font-bold sm:text-[2.6rem]'
const H2_STYLE = { letterSpacing: '-0.03em', lineHeight: 1.08 } as const
const LEAD = 'text-[16px] leading-relaxed text-white/55 sm:text-[17px]'
const HEAD_GAP = 'mb-14 sm:mb-16'
const EYEBROW = 'font-mono text-[12px] uppercase tracking-[0.14em] text-white/35'

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
        border:`1px solid ${hover ? 'rgba(20,184,134,0.34)' : 'rgba(255,255,255,0.08)'}`,
        background:'#0a0a0d',
        boxShadow: hover
          ? '0 40px 120px rgba(0,0,0,0.5), 0 0 80px rgba(20,184,134,0.10)'
          : '0 40px 120px rgba(0,0,0,0.5)',
        transition:'border-color 300ms var(--ease-out), box-shadow 300ms var(--ease-out)',
      }}>
      <img src={src} alt={alt} className="block w-full" loading="lazy" />
    </div>
  )
}

// ─── Numbered section — Linear's 1.0 / 2.0 / 3.0 grammar ───────
function NumberedSection({ id, index, name, title, sub, shot, alt }: {
  id?: string
  index: string
  name: string
  title: React.ReactNode
  sub: string
  shot: string
  alt: string
}) {
  return (
    <section id={id} className={`${SECTION} ${id ? 'scroll-mt-20' : ''}`}>
      <Reveal>
        <div className={`${HEAD_GAP} grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start`}>
          <h2 className={H2} style={H2_STYLE}>
            {title}
          </h2>
          <div className="flex flex-col gap-6 lg:pt-2">
            <p className={LEAD}>{sub}</p>
            <div className="group flex cursor-default items-center gap-2.5 font-mono text-[13px]">
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
// The house accent: Fernary's UI green, used wherever nothing more
// specific owns the color.
const ACCENT = '#16C08A'

function Glyph({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" style={{ overflow:'visible' }}>
      <path d={d} stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Marks for claims no single node owns: a quiet check for the hero's trust
// statements, and a gauge that stops short of the end for metering.
const CHECK_PATH = 'M2.5 8.2l3.2 3.1 7.8-7.5'
const GAUGE_PATH = 'M2.5 12a5.5 5.5 0 1111 0M8 12l3.3-3.5'

// Brand accents — the dark-theme --na-* values, fixed here because the
// landing never re-themes. Keeps the wall in the same ink as the canvas.
const NODE_TINTS: Partial<Record<NodeType, string>> = {
  slack:'#36c5f0', gmail:'#ea4335', outlook:'#2a8fe8', notion:'#e5e4e5',
  linear:'#5e6ad2', github:'#e5e4e5', gitlab:'#fc6d26', googlecalendar:'#4285f4',
  googledrive:'#1fa463', googledocs:'#4c8bf5', googlesheets:'#0f9d58',
  stripe:'#635bff', shopify:'#96bf48',
  jira:'#4c9aff', confluence:'#4c9aff', bitbucket:'#4c9aff',
  googlemeet:'#ffb443', googleslides:'#ffc93d', googleforms:'#a768e8',
  googletasks:'#4c9aff', googlechat:'#34c98a', googlekeep:'#ffd94d',
  granola:'#d6cbb8', resend:'#e5e4e5', sendgrid:'#3368fa', kit:'#ff6154', airtable:'#ffb340', clickup:'#b388ff',
  typeform:'#e5e4e5', calendly:'#4c9aff', dropbox:'#3d8bff', netlify:'#32e6e2', supabase:'#3ecf8e', gumroad:'#ff90e8',
  googlesearchconsole:'#4c9aff', googlecontacts:'#4c9aff',
  hubspot:'#ff7a59', front:'#e5e4e5',
}

// ─── Integrations — the tools Fernary can drive, one quiet wall ──
const INTEGRATIONS: NodeType[] = [
  'gmail', 'googlecalendar', 'googledrive', 'googledocs', 'googlesheets', 'googleslides',
  'googleforms', 'googlemeet', 'googlechat', 'googletasks', 'googlekeep', 'outlook',
  'slack', 'notion', 'linear', 'github', 'gitlab', 'jira',
  'confluence', 'bitbucket', 'stripe', 'shopify', 'granola', 'resend', 'sendgrid', 'kit', 'airtable', 'clickup', 'typeform', 'calendly', 'dropbox', 'netlify', 'supabase', 'gumroad', 'googlesearchconsole', 'googlecontacts', 'hubspot', 'front',
]

// Sixteen familiar tools trigger recognition faster than a 38-logo wall. The
// full catalogue still drives the honest breadth count and capability copy.
const FEATURED_INTEGRATIONS: NodeType[] = [
  'gmail', 'slack', 'notion', 'linear',
  'github', 'googlesheets', 'googledrive', 'googlecalendar',
  'stripe', 'hubspot', 'shopify', 'airtable',
  'front', 'jira', 'calendly', 'typeform',
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
      {/* The real logo, not a glow-tinted glyph — no drop-shadow, since a
          coloured halo behind someone else's mark misrepresents it. */}
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center"
        style={{
          opacity: hover ? 1 : 0.9,
          transition:'opacity 260ms var(--ease-out)',
        }}>
        <IntegrationLogo type={type} size={24} onDark />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-white">{NODE_LABELS[type]}</div>
        {/* What the connector can reach — a capability label, not prose */}
        <div className="truncate font-mono text-[10.5px] text-white/40">{NODE_DESCRIPTIONS[type]}</div>
      </div>
    </div>
  )
}

function Integrations() {
  return (
    <section id="integrations" className={`${SECTION} scroll-mt-20`} style={RULE}>
      <Reveal>
        <div className={`${HEAD_GAP} grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start`}>
          <h2 className={H2} style={H2_STYLE}>
            Your tools are<br />already waiting.
          </h2>
          <div className="flex flex-col gap-6 lg:pt-2">
            <p className={LEAD}>
              {INTEGRATIONS.length} connected apps and more than 800 read-and-write actions.
              One workflow can read a Stripe charge, update a Sheet, file a Linear issue,
              and post the result to Slack. Connect an account once, then use it anywhere.
            </p>
            <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-white/35">
              A few you can put to work today
            </p>
          </div>
        </div>
      </Reveal>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {FEATURED_INTEGRATIONS.map((type, i) => (
          <Reveal key={type} delay={(i % 4) * 60} y={16}>
            <IntegrationTile type={type} />
          </Reveal>
        ))}
      </div>
      <Reveal delay={120} y={16}>
        <div className="mt-8 flex flex-col gap-3 rounded-xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.02)' }}>
          <p className="text-[14px] text-white/55">
            <span className="font-semibold text-white">And {INTEGRATIONS.length - FEATURED_INTEGRATIONS.length} more.</span>{' '}
            Plus any service with an API.
          </p>
          <a href="#examples" className="group inline-flex items-center gap-2 text-[13.5px] font-medium text-white/65 hover:text-white">
            See what they can do
            <span aria-hidden className="transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-1">→</span>
          </a>
        </div>
      </Reveal>
    </section>
  )
}

// ─── Build-by-chat — the AI builder, shown as a real conversation.
// Once scrolled into view the built workflow *runs*, on loop: each step
// lights up in its node accent, completes with a check, and the cycle
// restarts — the same live-run feel as the product. Reduced motion gets
// the finished state (all steps checked) with no loop.
// Tints are the brand ramp (amber → teal → green → the tool's own blue),
// not the app's node accents: the mock is a brand surface, and the page
// carries no violet or magenta.
const BUILD_STEPS: Array<{ type: NodeType; name: string; detail: string; tint: string }> = [
  { type:'scheduledTrigger', name:'Scheduled', detail:'Every weekday · 9:00 AM', tint:'#F5A524' },
  { type:'linear', name:'Linear', detail:'List new issues', tint:'#0FA3A3' },
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
          style={{ background:'rgba(20,184,134,0.16)', border:'1px solid rgba(20,184,134,0.28)' }}>
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
              {/* Integration steps show the real logo. It carries its own
                  colour, so state reads through opacity instead of the tint +
                  glow the drawn glyphs get. */}
              {isIntegration(s.type) ? (
                <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center"
                  style={{
                    opacity: state === 'todo' ? 0.35 : 1,
                    transition:'opacity 400ms var(--ease-out)',
                  }}>
                  <IntegrationLogo type={s.type} size={16} onDark />
                </div>
              ) : (
                <div style={{
                  color: state === 'todo' ? 'rgba(255,255,255,0.3)' : s.tint,
                  filter: state === 'running' ? `drop-shadow(0 0 5px ${s.tint})` : 'none',
                  transition:'color 400ms var(--ease-out), filter 400ms var(--ease-out)',
                }}>
                  <Glyph d={NODE_ICON_PATHS[s.type]} size={16} />
                </div>
              )}
              <span className="text-[12.5px] font-medium"
                style={{ color: state === 'todo' ? 'rgba(255,255,255,0.5)' : '#fff', transition:'color 400ms var(--ease-out)' }}>
                {s.name}
              </span>
              {/* Machine voice: a schedule, a model name, a channel — what the
                  system reports back, not what a person wrote. */}
              <span className="ml-auto font-mono text-[11px] text-white/40">{s.detail}</span>
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
    <section className={SECTION} style={RULE}>
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center lg:gap-16">
        <Reveal>
          <div>
            {/* Framed as revision, not conversation: per BRAND.md §9 the promise
                is unattended work, so the chat is a way to change the thing, not
                the thing itself. */}
            <span className={`mb-5 block ${EYEBROW}`}>Change it</span>
            <h2 className={H2} style={H2_STYLE}>
              Changed your mind?<br />Say so.
            </h2>
            <p className={`mt-6 max-w-md ${LEAD}`}>
              The builder sits behind a button on every screen. Add a step, swap an
              integration, or reshape the whole thing by asking. It edits the workflow
              in place while you watch, and the next run picks up the change.
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

// ─── Memory — a store the scheduled run keeps writing to.
// Continues the standup workflow the chat mock just built: what it
// remembers is which issues it has already posted, so tomorrow's digest
// doesn't repeat today's. One timer drives it — odd beats are a fresh
// write (tinted), even beats rest — so there are no nested timeouts to
// unwind. Reduced motion gets the store at rest.
const DATA_TINT = '#2dd4bf'
const SCOPES = ['Run', 'Workflow', 'Account'] as const

function MemoryMock() {
  const [ref, inView] = useInView<HTMLDivElement>()
  const [beat, setBeat] = useState(0)
  const [flat, setFlat] = useState(false)
  const [poses] = useState(() => finePointer() && !reducedMotion())

  useEffect(() => {
    if (!inView || reducedMotion()) return
    const id = setInterval(() => setBeat((b) => b + 1), 1300)
    return () => clearInterval(id)
  }, [inView])

  const writes = Math.ceil(beat / 2)
  const fresh = beat % 2 === 1
  const rows = [
    { key:'issues_posted', value: String(418 + writes), live: true },
    { key:'last_issue', value: `LIN-${2181 + writes}`, live: true },
    { key:'digests_sent', value:'41', live: false },
  ]

  return (
    <div ref={ref}
      onMouseEnter={() => setFlat(true)}
      onMouseLeave={() => setFlat(false)}
      className="rounded-2xl p-5 sm:p-6"
      style={{
        border:'1px solid rgba(255,255,255,0.08)', background:'#0a0a0d', boxShadow:'0 40px 120px rgba(0,0,0,0.5)',
        // Leans the other way from the chat mock — it sits on the other side
        // of the page, so the two lean toward each other rather than parallel
        transform: poses && !flat ? 'perspective(1400px) rotateY(5deg) rotateX(2deg)' : 'none',
        transition:'transform 600ms var(--ease-out)',
      }}>
      <div className="mb-4 flex items-center gap-2.5 border-b border-white/[0.06] pb-4">
        <span style={{ color: DATA_TINT }}><Glyph d={NODE_ICON_PATHS.data} size={16} /></span>
        <span className="font-mono text-[12px] font-semibold text-white/80">standup-memory</span>
        <span className="ml-auto font-mono text-[10.5px] text-white/35">Key–Value</span>
      </div>

      {/* The three scopes, with this store's own selected — the model reads
          faster as a row of choices than as a sentence */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/30">Scope</span>
        {SCOPES.map((s) => {
          const on = s === 'Account'
          return (
            <span key={s} className="rounded-full px-2.5 py-1 font-mono text-[10.5px]"
              style={{
                border:`1px solid ${on ? `color-mix(in srgb, ${DATA_TINT} 45%, transparent)` : 'rgba(255,255,255,0.08)'}`,
                background: on ? `color-mix(in srgb, ${DATA_TINT} 10%, transparent)` : 'transparent',
                color: on ? '#fff' : 'rgba(255,255,255,0.4)',
              }}>
              {s}
            </span>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-xl" style={{ border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.02)' }}>
        {rows.map((r, i) => {
          const lit = fresh && r.live
          return (
            <div key={r.key} className="flex items-center gap-3 px-3.5 py-2.5"
              style={{
                borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                background: lit ? `color-mix(in srgb, ${DATA_TINT} 6%, transparent)` : 'transparent',
                opacity: inView ? 1 : 0,
                transform: inView ? 'none' : 'translateY(8px)',
                transition: `background 500ms var(--ease-out), opacity 500ms var(--ease-out) ${180 + i * 90}ms, transform 500ms var(--ease-out) ${180 + i * 90}ms`,
              }}>
              <span className="font-mono text-[11.5px] text-white/45">{r.key}</span>
              <span className="ml-auto font-mono text-[12px] tabular-nums"
                style={{ color: lit ? DATA_TINT : '#fff', transition:'color 500ms var(--ease-out)' }}>
                {r.value}
              </span>
            </div>
          )
        })}
      </div>

      <p className="mt-4 flex items-center gap-2 font-mono text-[10.5px] text-white/35">
        <span className={fresh ? 'pulse-dot' : undefined}
          style={{ width:6, height:6, borderRadius:999, background: fresh ? DATA_TINT : 'rgba(255,255,255,0.2)' }} />
        Written by the 9:00 run · kept until you clear it
      </p>
    </div>
  )
}

function MemoryBand() {
  return (
    <section className={SECTION} style={RULE}>
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center lg:gap-16">
        {/* Mock second on a phone so the claim is read before the evidence,
            first on a wide screen so the page stops alternating text-left */}
        <div className="order-2 lg:order-1">
          <Reveal delay={120} y={34}>
            <MemoryMock />
          </Reveal>
        </div>
        <div className="order-1 lg:order-2">
          <Reveal>
            <div>
              <span className={`mb-5 block ${EYEBROW}`}>Memory</span>
              <h2 className={H2} style={H2_STYLE}>
                It remembers what<br />it already did.
              </h2>
              <p className={`mt-6 max-w-md ${LEAD}`}>
                Today&rsquo;s digest doesn&rsquo;t repeat yesterday&rsquo;s. Give a workflow somewhere to
                keep a counter, a list of what it has already seen, or a running note, scoped
                to one run, one workflow, or your whole account. The builder offers to set one
                up when a job needs it, and asks first.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ─── Capabilities — the breadth, at a glance. Each icon wears the
// accent of the node that owns the capability inside the app.
const CAPABILITIES: Array<{ icon: string; tint: string; title: string; body: string }> = [
  { icon: NODE_ICON_PATHS.llm, tint:'#70f17b', title:'Any frontier model', body:'Claude, GPT, Gemini and Grok. Choose per step, switch whenever.' },
  { icon: NODE_ICON_PATHS.httpRequest, tint:'#51b4fb', title:'Reads the live web', body:'Steps search and read today’s pages, so an answer is never last month’s.' },
  { icon: NODE_ICON_PATHS.scheduledTrigger, tint:'#F5A524', title:'Runs on your clock', body:'On a schedule you set, or the moment a webhook hits it.' },
  { icon: NODE_ICON_PATHS.humanApproval, tint:'#f94b4b', title:'Waits for your yes', body:'One tap approves. Anything you ignore simply never ships.' },
  { icon: NODE_ICON_PATHS.branch, tint:'#64f4bf', title:'Branches and loops', body:'Real control flow. Fork on a condition, iterate across a list.' },
  { icon: GAUGE_PATH, tint:'#0FA3A3', title:'It stops, it doesn’t bill', body:'Every charge itemised, and no overage, ever. It stops instead.' },
]

function Capabilities() {
  return (
    <section className={SECTION} style={RULE}>
      <Reveal>
        <h2 className={`${HEAD_GAP} max-w-2xl ${H2}`} style={H2_STYLE}>
          Everything it needs<br />to run without you.
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 gap-x-12 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
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
            {/* Mono ordinal, same counting language as the 1.0 / 2.0 sections
                above — it makes the grid read as an enumerated spec sheet. */}
            <div className="mb-2 flex items-baseline gap-2.5">
              <span className="font-mono text-[11px] tabular-nums text-white/25">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[15px] font-semibold" style={{ letterSpacing:'-0.01em' }}>{c.title}</span>
            </div>
            <p className="text-[14px] leading-relaxed text-white/45">{c.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ─── A day of it — the outcome, written in the past tense ──────
// The most persuasive thing on the page: not what the product does, but what
// already happened because of it. Every entry is one of the workflows that
// actually ships in the demo account, so the copy and the screenshots agree,
// and each one quietly demonstrates a different capability — approval,
// deduplication by memory, schedule, webhook-free unattended running.
type DayEntry = {
  when: string
  moment: string
  title: string
  ask: string
  tools: NodeType[]
  result: string
}

// Grouped by who is being spared the work, because the objection is never "can
// it automate" — it is "would it do *my* job". Every scenario is buildable from
// the connectors on the wall above, so nothing here promises an integration we
// do not have.
const DAY: Array<{ role: string; entries: DayEntry[] }> = [
  {
    role: 'Founder',
    entries: [
      {
        when: '08:00',
        moment: 'Before standup',
        title: 'Weekly AI digest',
        ask: 'Find this week’s top AI news, summarise it, and email the team once I’ve read it.',
        tools: ['llm', 'gmail'],
        result: 'Drafted and held. You approved it at 08:12, and it went out to the team.',
      },
      {
        when: '09:00',
        moment: 'Monday only',
        title: 'Revenue snapshot',
        ask: 'Every Monday, pull last week’s Stripe charges and refunds into the metrics sheet and tell me what moved.',
        tools: ['stripe', 'googlesheets'],
        result: 'Sheet updated, 3 lines written. Net revenue up 12% on the week before.',
      },
      {
        when: '17:30',
        moment: 'End of day',
        title: 'Standup summary',
        ask: 'Summarise today’s Linear activity and post it to #standup.',
        tools: ['linear', 'slack'],
        result: 'Posted to #standup with 4 items flagged.',
      },
      {
        when: 'Hourly',
        moment: 'All day, quietly',
        title: 'Release watch',
        ask: 'Watch this repo for new releases and post them to the engineering channel.',
        tools: ['github', 'slack'],
        result: 'shopify-api@9.7.1 posted. It remembered the version, so it won’t post it twice.',
      },
    ],
  },
  {
    role: 'Sales',
    entries: [
      {
        when: 'On new deal',
        moment: 'The moment it lands',
        title: 'Brief me before the call',
        ask: 'When a deal reaches proposal in HubSpot, read the company’s site and write me a one-page brief in Notion.',
        tools: ['hubspot', 'llm', 'notion'],
        result: 'Brief written and linked on the deal. Ready 4 minutes after the stage changed.',
      },
      {
        when: '07:30',
        moment: 'Before the day starts',
        title: 'Meeting prep, done',
        ask: 'Each morning, take today’s Calendly bookings and put last contact and open deals next to each name.',
        tools: ['calendly', 'hubspot', 'gmail'],
        result: '6 meetings prepped and emailed to you as one list.',
      },
    ],
  },
  {
    role: 'Marketing',
    entries: [
      {
        when: 'Monday 06:00',
        moment: 'Weekly',
        title: 'Search performance, read for you',
        ask: 'Pull last week’s Search Console numbers, compare them to the week before, and flag anything that moved more than 20%.',
        tools: ['googlesearchconsole', 'googlesheets', 'slack'],
        result: '2 queries flagged. One page lost 34% of impressions after a title change.',
      },
      {
        when: 'On publish',
        moment: 'Every new post',
        title: 'Newsletter draft from the blog',
        ask: 'When a post goes live, draft the newsletter version in Kit and hold it for me.',
        tools: ['llm', 'kit'],
        result: 'Draft waiting in Kit. Nothing sends until you press send.',
      },
    ],
  },
  {
    role: 'Support',
    entries: [
      {
        when: 'On new message',
        moment: 'All day',
        title: 'Triage the shared inbox',
        ask: 'Read new Front conversations, tag them by topic, and file anything that looks like a bug in Linear.',
        tools: ['front', 'linear'],
        result: '11 tagged, 2 filed as bugs. Duplicates of ones already filed were left alone.',
      },
      {
        when: 'On response',
        moment: 'As feedback arrives',
        title: 'Feedback that goes somewhere',
        ask: 'Turn each Typeform response into a Linear issue, and post the harsh ones to #product.',
        tools: ['typeform', 'linear', 'slack'],
        result: '9 issues created. 1 posted to #product for a closer look.',
      },
    ],
  },
  {
    role: 'Engineering',
    entries: [
      {
        when: 'On failure',
        moment: 'Within a minute',
        title: 'Failed deploy, filed',
        ask: 'If a Netlify deploy fails, open a Linear issue with the build log and post it to #eng.',
        tools: ['netlify', 'linear', 'slack'],
        result: 'Issue opened with the failing step quoted. Posted to #eng 40 seconds after the build died.',
      },
      {
        when: 'Friday 16:00',
        moment: 'Weekly',
        title: 'Release notes, drafted',
        ask: 'Collect this week’s merged pull requests and write release notes in Confluence for me to check.',
        tools: ['github', 'llm', 'confluence'],
        result: '23 PRs read, notes drafted in Confluence. Waiting on your review.',
      },
    ],
  },
  {
    role: 'Operations',
    entries: [
      {
        when: '08:00',
        moment: 'Every weekday',
        title: 'Unshipped order chaser',
        ask: 'Check Shopify for orders that haven’t shipped in three days and draft a polite update for each one.',
        tools: ['shopify', 'gmail'],
        result: '4 drafts written and held for approval. Orders it had already chased were skipped.',
      },
      {
        when: 'On failed charge',
        moment: 'As it happens',
        title: 'Recover the payment',
        ask: 'When a Stripe payment fails, write the customer a short note with the update link, but let me read it first.',
        tools: ['stripe', 'gmail'],
        result: '3 notes drafted and held. You approved 2 and rewrote 1.',
      },
    ],
  },
]

function ToolMarks({ tools }: { tools: NodeType[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {tools.map((t) =>
        isIntegration(t) ? (
          <span key={t} className="flex h-[18px] w-[18px] items-center justify-center">
            <IntegrationLogo type={t} size={18} onDark />
          </span>
        ) : (
          <span key={t} style={{ color: NODE_TINTS[t] ?? ACCENT }}>
            <Glyph d={NODE_ICON_PATHS[t]} size={16} />
          </span>
        ),
      )}
    </div>
  )
}

function DayCard({ d }: { d: DayEntry }) {
  return (
    <div className="flex h-full flex-col rounded-xl p-5"
      style={{ border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.015)' }}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="rounded-full px-2.5 py-1 font-mono text-[10.5px] tabular-nums text-white/70"
          style={{ border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.03)' }}>
          {d.when}
        </span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/30">{d.moment}</span>
        <span className="ml-auto"><ToolMarks tools={d.tools} /></span>
      </div>
      <div className="text-[15px] font-semibold" style={{ letterSpacing:'-0.01em' }}>{d.title}</div>
      {/* What you typed, in your voice — quoted, because a person wrote it */}
      <p className="mt-2.5 text-[13.5px] italic leading-relaxed text-white/40">&ldquo;{d.ask}&rdquo;</p>
      <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">Example result</div>
      <p className="mt-2 flex items-start gap-2 text-[13.5px] leading-relaxed text-white/75">
        <span className="mt-[3px] flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
            <path d="M2.5 7l3 3 5-6.5" stroke="#3dd68c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {d.result}
      </p>
    </div>
  )
}

function DayInTheLife({ onGetStarted }: { onGetStarted: () => void }) {
  const [role, setRole] = useState(0)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])
  const active = DAY[role]

  // Arrow keys move between tabs, which is what a tablist is expected to do
  // once you have told screen readers that is what this is.
  function onKey(e: React.KeyboardEvent) {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (role + delta + DAY.length) % DAY.length
    setRole(next)
    tabs.current[next]?.focus()
  }

  return (
    <section id="examples" className={`${SECTION} scroll-mt-20`} style={RULE}>
      <Reveal>
        <div className={`${HEAD_GAP} grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start`}>
          <div>
            <span className={`mb-5 block ${EYEBROW}`}>Example workflows</span>
            <h2 className={H2} style={H2_STYLE}>
              Pick the work<br />you want back.
            </h2>
          </div>
          <div className="flex flex-col gap-6 lg:pt-2">
            <p className={LEAD}>
              Choose your team, then see the sentence someone could type and the result
              Fernary could leave waiting. Every example uses tools and actions available today.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Pick your job, see your own day. The objection is never "can it automate
          something" — it is "would it do the thing *I* keep redoing". */}
      <Reveal>
        <div role="tablist" aria-label="Work by role" onKeyDown={onKey}
          className="mb-10 flex flex-wrap items-center gap-2 border-b border-white/[0.07] pb-px">
          {DAY.map((r, i) => {
            const on = i === role
            return (
              <button key={r.role} role="tab" aria-selected={on} tabIndex={on ? 0 : -1}
                ref={(el) => { tabs.current[i] = el }}
                onClick={() => setRole(i)}
                className="relative px-3.5 py-2.5 text-[13.5px] font-medium transition-colors duration-200"
                style={{ color: on ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                {r.role}
                {/* The underline sits on the section rule, so the active tab
                    reads as attached to the panel below it. */}
                <span aria-hidden className="absolute inset-x-2 -bottom-px h-px"
                  style={{ background: on ? ACCENT : 'transparent', transition:'background 200ms var(--ease-out)' }} />
              </button>
            )
          })}
        </div>
      </Reveal>

      {/* Keyed on the role so switching tabs replays the entrance, which is the
          cheapest way to make the swap feel like new content rather than a
          text substitution. */}
      <div key={active.role} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {active.entries.map((d, i) => (
          <Reveal key={d.title} delay={(i % 2) * 90} y={20}>
            <DayCard d={d} />
          </Reveal>
        ))}
      </div>
      <Reveal delay={120} y={16}>
        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-xl p-6 sm:flex-row sm:items-center"
          style={{ border:'1px solid rgba(22,192,138,0.22)', background:'rgba(22,192,138,0.055)' }}>
          <div>
            <p className="text-[16px] font-semibold text-white">Already have a job in mind?</p>
            <p className="mt-1 text-[14px] text-white/45">Start with the sentence. The builder handles the blank canvas.</p>
          </div>
          <button onClick={onGetStarted}
            className="pressable shrink-0 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black hover:opacity-90">
            Build one like this
          </button>
        </div>
      </Reveal>
    </section>
  )
}

// ─── Hero copy ────────────────────────────────────────────────
// The claim is the *recurring* work, not automation in general. "The thing I
// redo every Monday" is a pain people recognise in themselves; "automation" is
// a category they have already made up their mind about. Per BRAND.md §9 the
// promise is what happens while you are not there, so the sentence has to end
// on the repetition, not on the building.
const HERO_LEAD = 'The AI that does the work'
const HERO_TURN = 'you keep redoing.'

// The brand ramp lands on the differentiated half of the promise and returns
// in the closing CTA. Each line animates as one block so the text can wrap on a
// narrow screen without the spacing and clipping problems of per-word spans.
const HERO_ACCENT = {
  background: 'linear-gradient(100deg, #8FE06A 0%, #16C08A 55%, #0FA3A3 115%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
} as const

// Three positive trust claims: how it starts, when it becomes live, and where
// human judgement stays in control.
const HERO_PROOF = ['Built from one sentence', 'Draft until you publish', 'Approval before action']

// ─── Nav ──────────────────────────────────────────────────────
export function Nav({ onGetStarted, onOpen, isAuthed }: {
  onGetStarted?: () => void
  onOpen: () => void
  isAuthed?: boolean
}) {
  const navigate = useNavigate()
  const start = onGetStarted ?? onOpen
  const go = (to: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigate(to)
  }

  return (
    <header style={{ position:'sticky', top:0, zIndex:50, backdropFilter:'blur(20px) saturate(160%)', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(5,5,8,0.72)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <a href="/" onClick={go('/')} aria-label="Fernary home"
          className="flex items-center gap-2.5 text-[15px] font-semibold leading-none text-white">
          <span aria-hidden="true">
            <FloweIcon size={22} />
          </span>
          <span style={{ letterSpacing:'-0.01em' }}>Fernary</span>
        </a>

        <nav aria-label="Landing page" className="hidden items-center gap-6 md:flex">
          <a href="/#how-it-works" className="text-[13px] text-white/50 transition-colors duration-200 hover:text-white">How it works</a>
          <a href="/#examples" className="text-[13px] text-white/50 transition-colors duration-200 hover:text-white">Examples</a>
          <a href="/#integrations" className="text-[13px] text-white/50 transition-colors duration-200 hover:text-white">Integrations</a>
          <a href="/pricing" onClick={go('/pricing')} className="text-[13px] text-white/50 transition-colors duration-200 hover:text-white">Pricing</a>
        </nav>

        <div className="flex items-center gap-2.5">
          <button onClick={isAuthed ? onOpen : () => navigate('/login')}
            className="hidden px-3 py-2 text-[13px] font-medium text-white/55 transition-colors duration-200 hover:text-white sm:block">
            {isAuthed ? 'Open app' : 'Sign in'}
          </button>
          <button onClick={start}
            className="pressable rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black hover:opacity-90 sm:px-5">
            {isAuthed ? 'New workflow' : 'Start free'}
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── Footer ───────────────────────────────────────────────────
// Socials drawn in the same 16px stroke idiom as every other glyph on the
// page, so the row doesn't import three foreign logo styles.
const SOCIALS: Array<{ label: string; href: string; d: string }> = [
  { label:'Fernary on X', href:'https://x.com/fernaryai', d:'M3.2 3.2l9.6 9.6M12.8 3.2L3.2 12.8' },
  { label:'Fernary on Instagram', href:'https://instagram.com/fernaryai',
    d:'M5 2.6h6a2.4 2.4 0 012.4 2.4v6a2.4 2.4 0 01-2.4 2.4H5A2.4 2.4 0 012.6 11V5A2.4 2.4 0 015 2.6zM8 5.6a2.4 2.4 0 100 4.8 2.4 2.4 0 000-4.8zM11.2 4.75h.05' },
  { label:'Fernary on LinkedIn', href:'https://www.linkedin.com/company/fernaryai',
    d:'M3.9 6.4v6.2M3.9 3.7v.05M7.7 12.6V6.4M7.7 9c0-1.4 1-2.6 2.3-2.6 1.4 0 2.4 1.1 2.4 2.7v3.5' },
]

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-white/30">{title}</div>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </div>
  )
}

function FooterLink({ children, href, onClick }: {
  children: React.ReactNode
  href: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <li>
      <a href={href} onClick={onClick}
        className="text-[13.5px] text-white/45 transition-colors duration-200 hover:text-white">
        {children}
      </a>
    </li>
  )
}

export function Footer({ onGetStarted }: { onGetStarted: () => void }) {
  const navigate = useNavigate()
  // Real hrefs so the links are crawlable and middle-clickable; the click
  // handler keeps the SPA from doing a full reload.
  const go = (to: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigate(to)
  }

  return (
    <footer style={RULE}>
      <div className="mx-auto max-w-6xl px-6 pb-10 pt-16 sm:pt-20">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-[2.2fr_repeat(3,1fr)]">
          <div className="col-span-2 lg:col-span-1 lg:pr-10">
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true"><FloweIcon size={22} /></span>
              <span className="text-[15px] font-semibold text-white" style={{ letterSpacing:'-0.01em' }}>Fernary</span>
            </div>
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-white/40">
              The automation system for AI you can actually leave running.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="flex h-8 w-8 items-center justify-center text-white/35 transition-colors duration-200 hover:text-white">
                  <Glyph d={s.d} size={16} />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Product">
            <FooterLink href="#how-it-works">How it works</FooterLink>
            <FooterLink href="#examples">Examples</FooterLink>
            <FooterLink href="#integrations">Integrations</FooterLink>
            <FooterLink href="/pricing" onClick={go('/pricing')}>Pricing</FooterLink>
          </FooterCol>

          <FooterCol title="Account">
            <FooterLink href="/workflows" onClick={go('/workflows')}>Open app</FooterLink>
            <FooterLink href="/login" onClick={go('/login')}>Sign in</FooterLink>
            <FooterLink href="/login" onClick={(e) => { e.preventDefault(); onGetStarted() }}>Start free</FooterLink>
          </FooterCol>

          <FooterCol title="Legal">
            <FooterLink href="/privacy" onClick={go('/privacy')}>Privacy</FooterLink>
            <FooterLink href="/terms" onClick={go('/terms')}>Terms</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-14 flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between" style={RULE}>
          <p className="font-mono text-[11.5px] text-white/25">© 2026 Fernary</p>
          <p className="font-mono text-[11.5px] text-white/25">fernary.com</p>
        </div>
      </div>
    </footer>
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
      <Nav
        onGetStarted={handleCreate}
        onOpen={() => navigate('/workflows')}
        isAuthed={authStatus === 'authed'}
      />

      {/* ── Hero — one voice: the headline ── */}
      <section className="relative overflow-hidden">
        <img src="/aurora.jpg" alt="" aria-hidden
          className="aurora-drift pointer-events-none absolute inset-x-0 top-0 h-full w-full object-cover"
          style={{ opacity:0.7, filter:'hue-rotate(188deg) saturate(0.82)' }} />
        {/* <AuroraShader /> */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background:'linear-gradient(to bottom, rgba(5,5,7,0.2), rgba(5,5,7,0.6) 60%, #050507)' }} />

        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-20 sm:pt-24 lg:pb-16 lg:pt-32">
          <p className="rise-in mb-6 font-mono text-[11px] uppercase tracking-[0.15em] text-white/45"
            style={{ animationDelay:'20ms' }}>
            AI workflow automation for recurring work
          </p>
          <h1 className="max-w-5xl text-[clamp(2.45rem,7vw,4.6rem)] font-bold"
            style={{ lineHeight:1.02, letterSpacing:'-0.035em' }}>
            <span className="rise-in block" style={{ animationDelay:'80ms' }}>{HERO_LEAD}</span>{' '}
            <span className="rise-in block" style={{ ...HERO_ACCENT, animationDelay:'160ms' }}>
              {HERO_TURN}
            </span>
          </h1>

          <div className="mt-8 max-w-2xl">
            <p className="rise-in max-w-xl text-[16px] leading-relaxed text-white/60 sm:text-[18px]"
              style={{ animationDelay:'240ms' }}>
              Describe one recurring job. Fernary builds the workflow, runs it on your
              schedule, and waits for your approval wherever judgement matters.
            </p>
            <div className="rise-in mt-7 flex flex-wrap items-center gap-3" style={{ animationDelay:'320ms' }}>
              <button onClick={handleCreate} disabled={creating}
                className="pressable rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50">
                {creating ? 'Creating…' : 'Start free'}
              </button>
              <a href="#examples"
                className="pressable rounded-full px-6 py-3 text-sm font-semibold text-white/70 hover:text-white"
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)' }}>
                See example workflows
              </a>
              <span className="w-full pt-1 text-[12px] text-white/30">Free plan · no card required</span>
            </div>
            <ul className="rise-in mt-6 flex flex-wrap items-center gap-x-5 gap-y-2" style={{ animationDelay:'400ms' }}>
              {HERO_PROOF.map((claim) => (
                <li key={claim} className="flex items-center gap-1.5 text-[12.5px] text-white/45">
                  <span aria-hidden style={{ color:ACCENT }}><Glyph d={CHECK_PATH} size={11} /></span>
                  {claim}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* The product — one shot, full width */}
        <div className="relative mx-auto max-w-6xl px-6 pb-8">
          <div className="rise-in" style={{ animationDelay:'480ms' }}>
            <Shot src="/product-editor.jpg" alt="The Fernary workflow editor" />
          </div>
        </div>
      </section>

      {/* ── Statement — words light up as you scroll ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <ScrollStatement
          lead="You already know the work."
          rest="It’s the same twenty minutes every Monday, the same five tabs, the same copy and paste. Describe it once and it stops being your job."
        />
      </section>

      {/* ── 1.0 Build ── */}
      <NumberedSection
        id="how-it-works"
        index="1.0" name="Build"
        title={<>Say it once.<br />It&rsquo;s built.</>}
        sub="The builder reads the tools you connected, picks the steps, and explains what it made. The canvas is there when you want to change something by hand, but you never start from a blank one."
        shot="/shot-build.jpg" alt="Building a workflow by describing it to Fernary AI"
      />

      {/* ── 2.0 Run ── */}
      <NumberedSection
        index="2.0" name="Run"
        title={<>It runs without you.<br />You see everything.</>}
        sub="Set the schedule once. Every step and every output stays in one trace, so if something breaks you see exactly where, why, and what it was holding at the time."
        shot="/shot-run.jpg" alt="A completed run with the output of every step"
      />

      {/* ── 3.0 Approve ── */}
      <NumberedSection
        index="3.0" name="Approve"
        title={<>It waits for<br />your yes.</>}
        sub="Put a review step before anything consequential. The run pauses and brings you the draft. Approve and it continues. Ignore it and nothing ships."
        shot="/shot-approve.jpg" alt="A run paused for human approval"
      />

      {/* ── Integrations — the tools Fernary drives ── */}
      <Integrations />

      {/* ── Example work, by role — prompt to outcome ── */}
      <DayInTheLife onGetStarted={handleCreate} />

      {/* ── Build by chat — the AI builder ── */}
      <ChatBand />

      {/* ── Memory — state that outlives the run ── */}
      <MemoryBand />

      {/* ── Capabilities — the breadth, at a glance ── */}
      <Capabilities />

      {/* ── Close — full-stop CTA ── */}
      <section className="px-6 py-20 text-center sm:py-28">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl px-6 py-20 sm:py-24"
          style={{
            border:'1px solid rgba(22,192,138,0.18)',
            background:'radial-gradient(circle at 50% 115%, rgba(22,192,138,0.16), transparent 48%), rgba(255,255,255,0.015)',
          }}>
          <Reveal y={36}>
            <h2 className="mx-auto mb-6 max-w-3xl text-[2.5rem] font-bold sm:text-[3.4rem]"
              style={{ letterSpacing:'-0.035em', lineHeight:1.05 }}>
              Give Fernary one job.
              <br />
              <span style={HERO_ACCENT}>Get the time back every run.</span>
            </h2>
            <p className="mx-auto mb-9 max-w-xl text-[16px] leading-relaxed text-white/50 sm:text-[17px]">
              Start with the report, inbox, or copy-and-paste job already in your head.
              Describe it, review what Fernary builds, and publish when you&rsquo;re ready.
            </p>
          </Reveal>
          <Reveal delay={120} y={20}>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={handleCreate} disabled={creating}
                className="pressable rounded-full bg-white px-7 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50">
                {creating ? 'Creating…' : 'Start free'}
              </button>
              <a href="/pricing" onClick={(e) => { e.preventDefault(); navigate('/pricing') }}
                className="pressable rounded-full px-7 py-3 text-sm font-semibold text-white/65 hover:text-white"
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)' }}>
                View pricing
              </a>
              <span className="w-full pt-1 text-[12px] text-white/30">Free plan · no card required</span>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer onGetStarted={handleCreate} />
    </div>
  )
}
