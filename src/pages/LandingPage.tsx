import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { SavedWorkflow } from '@/lib/workflowApi'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import { useAuthStore } from '@/store/authStore'

const C = {
  schedule: '#8b5cf6',
  webhook:  '#f59e0b',
  llm:      '#3b82f6',
  branch:   '#f97316',
  loop:     '#14b8a6',
  email:    '#f59e0b',
  approval: '#ec4899',
  http:     '#22c55e',
  notion:   '#ffffff',
  linear:   '#5e6ad2',
}

// ─── Animated canvas ──────────────────────────────────────────
type NodeState = 'idle' | 'running' | 'done'

function MockCanvas() {
  const W = 520, H = 420
  const NW = 190, NH = 54

  const layout = [
    { id:0, label:'Every Monday 9am',    sub:'Scheduled trigger', color:C.schedule, x:16,  y:158 },
    { id:1, label:'Search the web',      sub:'AI · web_search',   color:C.llm,      x:274, y:16  },
    { id:2, label:'Read top articles',   sub:'AI · read_url',     color:C.llm,      x:274, y:94  },
    { id:3, label:'Summarise findings',  sub:'AI · Claude',       color:C.llm,      x:274, y:172 },
    { id:4, label:'Write newsletter',    sub:'AI · GPT-4o',       color:C.llm,      x:274, y:250 },
    { id:5, label:'Human review',        sub:'Approval',          color:C.approval, x:274, y:328 },
  ]

  const [states, setStates] = useState<NodeState[]>(Array(6).fill('idle'))
  const [animating, setAnimating] = useState(false)

  function handleRun() {
    if (animating) return
    setAnimating(true)
    setStates(Array(6).fill('idle'))
    const timings = [[0,550],[700,850],[1650,950],[2700,800],[3600,1050],[4750,750]]
    timings.forEach(([start, dur], i) => {
      setTimeout(() => {
        setStates(prev => { const s = [...prev] as NodeState[]; s[i] = 'running'; return s })
        setTimeout(() => {
          setStates(prev => { const s = [...prev] as NodeState[]; s[i] = 'done'; return s })
          if (i === timings.length - 1) setAnimating(false)
        }, dur)
      }, start)
    })
  }

  function rm(n: typeof layout[0]) { return { x: n.x + NW,     y: n.y + NH / 2 } }
  function lm(n: typeof layout[0]) { return { x: n.x,          y: n.y + NH / 2 } }
  function bm(n: typeof layout[0]) { return { x: n.x + NW / 2, y: n.y + NH     } }
  function tm(n: typeof layout[0]) { return { x: n.x + NW / 2, y: n.y          } }
  function edgeStroke(id: number) {
    return states[id] === 'done' ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)'
  }

  return (
    <div style={{
      position:'relative', width:'100%', borderRadius:18,
      border:'1px solid rgba(255,255,255,0.08)', background:'#0d0d0f',
      backgroundImage:'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
      backgroundSize:'24px 24px', overflow:'hidden',
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display:'block' }} preserveAspectRatio="xMidYMid meet">
        {layout.slice(1).map((target, i) => {
          const src = rm(layout[0]), dst = lm(target)
          const cx1 = src.x + (dst.x - src.x) * 0.6
          const cx2 = dst.x - (dst.x - src.x) * 0.25
          return <path key={`t${i}`} d={`M${src.x},${src.y} C${cx1},${src.y} ${cx2},${dst.y} ${dst.x},${dst.y}`}
            stroke={edgeStroke(0)} strokeWidth="1.5" fill="none" style={{ transition:'stroke 0.4s' }} />
        })}
        {layout.slice(1, -1).map((node, i) => {
          const next = layout[i + 2], src = bm(node), dst = tm(next)
          return <path key={`v${i}`} d={`M${src.x},${src.y} C${src.x},${src.y+18} ${dst.x},${dst.y-18} ${dst.x},${dst.y}`}
            stroke={edgeStroke(node.id)} strokeWidth="1.5" fill="none" style={{ transition:'stroke 0.4s' }} />
        })}
        {layout.map((n) => {
          const st = states[n.id], cx = n.x + NW - 16, cy = n.y + NH / 2
          return (
            <g key={n.id}>
              {st === 'running' && (
                <rect x={n.x-3} y={n.y-3} width={NW+6} height={NH+6} rx={13} fill="none" stroke={n.color} strokeWidth="1.5">
                  <animate attributeName="opacity" values="0.15;0.65;0.15" dur="1s" repeatCount="indefinite"/>
                  <animate attributeName="stroke-width" values="1;2.5;1" dur="1s" repeatCount="indefinite"/>
                </rect>
              )}
              <rect x={n.x} y={n.y} width={NW} height={NH} rx={10}
                fill={st === 'idle' ? 'rgba(14,14,18,0.98)' : 'rgba(20,20,26,0.99)'}
                stroke={st === 'running' ? `${n.color}70` : st === 'done' ? `${n.color}40` : 'rgba(255,255,255,0.08)'}
                strokeWidth="1" style={{ transition:'stroke 0.35s, fill 0.35s' }}
              />
              <rect x={n.x} y={n.y+8} width={3} height={NH-16} rx={2}
                fill={n.color} opacity={st === 'idle' ? 0.3 : 1} style={{ transition:'opacity 0.35s' }} />
              <text x={n.x+16} y={n.y+23} fontSize={12} fontWeight="600" fontFamily="inherit"
                fill={st === 'idle' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.9)'} style={{ transition:'fill 0.35s' }}>
                {n.label}
              </text>
              <text x={n.x+16} y={n.y+39} fontSize={10} fontFamily="inherit"
                fill={st === 'idle' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.3)'} style={{ transition:'fill 0.35s' }}>
                {n.sub}
              </text>
              {st === 'done' && (<>
                <circle cx={cx} cy={cy} r={6} fill="rgba(52,211,153,0.15)" stroke="#34d399" strokeWidth="1.2"/>
                <path d={`M${cx-3},${cy} l2.2,2.2 l4,-4`} stroke="#34d399" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
              </>)}
              {st === 'running' && (
                <circle cx={cx} cy={cy} r={5.5} fill="none" stroke={n.color} strokeWidth="1.5"
                  strokeDasharray="8 16" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="0.75s" repeatCount="indefinite"/>
                </circle>
              )}
            </g>
          )
        })}
      </svg>

      <button onClick={handleRun} disabled={animating} style={{
        position:'absolute', bottom:14, right:14, zIndex:2,
        display:'flex', alignItems:'center', gap:6,
        background: animating ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)',
        border:'1px solid rgba(255,255,255,0.13)', borderRadius:8, padding:'6px 13px',
        fontSize:11, fontWeight:600,
        color: animating ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.8)',
        cursor: animating ? 'default' : 'pointer', backdropFilter:'blur(8px)', transition:'all 0.2s',
      }}>
        {animating ? (<>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="animate-spin">
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25"/>
            <path d="M8.5 5A3.5 3.5 0 0 0 5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Running…
        </>) : (<>
          <svg width="9" height="10" viewBox="0 0 9 10" fill="none">
            <path d="M1.5 1.5l6 3.5-6 3.5V1.5z" fill="currentColor"/>
          </svg>
          {states.some(s => s === 'done') ? 'Run again' : 'Run'}
        </>)}
      </button>

      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:36, zIndex:1,
        background:'linear-gradient(to bottom, transparent, rgba(13,13,15,0.65))', pointerEvents:'none',
      }}/>
    </div>
  )
}

// ─── AI Builder mock ──────────────────────────────────────────
function AIChatMock() {
  return (
    <div style={{ background:'rgba(10,10,12,0.97)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#3b82f6' }} />
        <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.5)', letterSpacing:'0.06em' }}>AI Builder</span>
      </div>
      <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:12, padding:'8px 12px', maxWidth:'80%', fontSize:12, color:'rgba(255,255,255,0.8)', lineHeight:1.5 }}>
            Every Friday, find the top AI news from this week, write a short summary, and email it to my team
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'rgba(255,255,255,0.3)' }}>
          <div style={{ width:14, height:14, borderRadius:'50%', background:'rgba(59,130,246,0.15)', flexShrink:0 }} className="animate-pulse"/>
          Searching the web, reading articles...
        </div>
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'10px 12px', fontSize:12, color:'rgba(255,255,255,0.65)', lineHeight:1.6 }}>
          Done! Every Friday at 5pm, an AI searches for this week's top AI news, reads the full articles, writes a short digest, then emails it to your team automatically.
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:8, padding:'5px 10px', fontSize:11, color:'#34d399', alignSelf:'flex-start' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5L5 9l4.5-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Workflow applied to canvas
        </div>
      </div>
    </div>
  )
}

// ─── Execution panel mock ─────────────────────────────────────
function ExecPanel() {
  const events = [
    { done:true,  label:'8am trigger fired',      note:'Monday, 9 Jun' },
    { done:true,  label:'Fetched Notion database', note:'12 pages found' },
    { done:true,  label:'AI summarised content',   note:'3 key takeaways' },
    { done:false, label:'Sending email digest',    note:null },
  ]
  return (
    <div style={{ background:'rgba(10,10,12,0.97)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.5)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Live Run</span>
        <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#fbbf24', background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:20, padding:'2px 8px' }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:'#fbbf24', display:'inline-block' }} className="animate-pulse"/>
          Running
        </span>
      </div>
      <div style={{ padding:'8px 0' }}>
        {events.map((ev,i) => (
          <div key={i} style={{ padding:'8px 14px', borderBottom: i < events.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: ev.note ? 3 : 0 }}>
              {ev.done ? (
                <span style={{ width:16, height:16, borderRadius:'50%', background:'rgba(52,211,153,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="#34d399" strokeWidth="1.3" strokeLinecap="round"/></svg>
                </span>
              ) : (
                <span style={{ width:16, height:16, borderRadius:'50%', background:'rgba(59,130,246,0.15)', flexShrink:0 }} className="animate-pulse"/>
              )}
              <span style={{ fontSize:12, color: ev.done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.9)', fontWeight: ev.done ? 400 : 500 }}>{ev.label}</span>
            </div>
            {ev.note && <div style={{ marginLeft:24, fontSize:10, color:'rgba(255,255,255,0.28)' }}>{ev.note}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Approval mock ────────────────────────────────────────────
function ApprovalMock() {
  return (
    <div style={{ background:'rgba(10,10,12,0.97)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'12px 14px', background:'rgba(236,72,153,0.07)', borderBottom:'1px solid rgba(236,72,153,0.15)' }}>
        <div style={{ fontSize:11, fontWeight:600, color:'#ec4899', marginBottom:4 }}>Your review is needed</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:10 }}>The AI drafted this post. Approve to send it — or reject to discard.</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.04)', borderRadius:6, padding:'8px 10px', marginBottom:10, lineHeight:1.65 }}>
          Three things I learned shipping AI features this year — and why human oversight still matters more than the model you pick…
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <div style={{ flex:1, background:'#10b981', borderRadius:7, padding:'6px 0', textAlign:'center', fontSize:11, fontWeight:600, color:'white' }}>Approve &amp; Send</div>
          <div style={{ flex:1, background:'rgba(239,68,68,0.7)', borderRadius:7, padding:'6px 0', textAlign:'center', fontSize:11, fontWeight:600, color:'white' }}>Reject</div>
        </div>
      </div>
      {[
        { label:'Fetched top 5 posts', note:'from Notion database' },
        { label:'AI summarised each one', note:'3 sentences per post' },
        { label:'Drafted LinkedIn post', note:'waiting for your approval' },
      ].map((c,i) => (
        <div key={i} style={{ padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>{c.label}</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>{c.note}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────
function Nav({ onOpen }: { onOpen: () => void }) {
  const navigate = useNavigate()
  return (
    <header style={{ position:'sticky', top:0, zIndex:50, backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.8)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
              <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z" stroke="black" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className="text-[15px] font-semibold">workflow-ai</span>
        </button>
        <button onClick={onOpen}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:opacity-90"
          style={{ boxShadow:'0 0 20px rgba(255,255,255,0.15)' }}>
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
    <div className="min-h-screen bg-black text-white" style={{ fontFamily:'var(--font-sans)' }}>
      <Nav onOpen={() => navigate('/workflows')} />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="mb-4 text-[2.25rem] font-bold leading-[1.1] tracking-tight sm:text-[2.75rem] lg:text-[3.25rem]">
              Automation for people,<br className="hidden sm:block" />
              <span style={{ color:'rgba(255,255,255,0.4)' }}>not just developers</span>
            </h1>
            <p className="mb-8 max-w-md text-[15px] leading-relaxed text-white/50">
              Describe what you want to automate. AI designs and builds the workflow for you — then runs it automatically, on your schedule.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={handleCreate} disabled={creating}
                className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-all hover:opacity-90 disabled:opacity-50"
                style={{ boxShadow:'0 0 24px rgba(255,255,255,0.15)' }}>
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
                Start for free
              </button>
              <button onClick={() => navigate('/workflows')}
                className="rounded-full px-6 py-2.5 text-sm font-semibold text-white/50 transition-all hover:text-white"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}>
                View my workflows
              </button>
            </div>
          </div>

          <div>
            <MockCanvas />
            <p className="mt-3 text-center text-[11px] text-white/20">Weekly research pipeline — AI searches, reads, and writes. You just approve.</p>
          </div>
        </div>
      </section>

      {/* ── Three types of workflows ── */}
      <section className="mx-auto max-w-6xl px-6 py-16" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <p className="mb-10 text-[11px] font-semibold uppercase tracking-widest text-white/30">Workflow types</p>
        <div className="grid grid-cols-1 gap-px sm:grid-cols-3" style={{ background:'rgba(255,255,255,0.06)', borderRadius:16, overflow:'hidden' }}>
          {[
            {
              color: C.llm,
              label: 'AI-built',
              heading: 'Describe it, done.',
              body: 'Type what you want in plain English. The AI figures out the steps, picks the right tools, and builds the workflow on the canvas — ready to run.',
            },
            {
              color: C.schedule,
              label: 'Scheduled',
              heading: 'Set it and forget it.',
              body: 'Workflows that run on their own — every morning, every Monday, every hour. No reminders, no manual triggers. Just results.',
            },
            {
              color: C.webhook,
              label: 'On-demand',
              heading: 'Trigger from anywhere.',
              body: 'Share a link, connect a form, or fire it from another tool. The workflow kicks off instantly and handles the rest.',
            },
          ].map((t) => (
            <div key={t.label} style={{ background:'#0a0a0c', padding:'28px 28px 32px' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:16,
                background:`${t.color}15`, border:`1px solid ${t.color}30`,
                borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600, color:t.color }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:t.color, display:'inline-block' }}/>
                {t.label}
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:'rgba(255,255,255,0.9)', marginBottom:10, lineHeight:1.3 }}>{t.heading}</div>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.38)', lineHeight:1.65 }}>{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Builder ── */}
      <section className="mx-auto max-w-6xl px-6 py-16" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">AI Builder</p>
            <h2 className="mb-4 text-[1.35rem] font-bold tracking-tight sm:text-[1.6rem]">
              Your first workflow in under a minute
            </h2>
            <p className="mb-6 text-[14px] leading-relaxed text-white/40">
              No drag and drop required. Tell the AI what you want to automate —
              it reasons through the steps, picks the right tools, and places everything on the canvas.
              Refine it through conversation. The AI remembers what you built.
            </p>
            <div className="flex flex-col gap-3">
              {[
                ['Every Monday, search for the top news in my industry and email me a digest', 'Web Search + AI + Email'],
                ['Every morning at 8am, pull my top Notion pages and email me a summary', 'Notion + Email + Schedule'],
                ['Review every AI-drafted post before it gets sent anywhere', 'AI + Human Approval + Email'],
              ].map(([prompt, tags]) => (
                <div key={prompt} className="rounded-xl px-4 py-3"
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-[12px] text-white/55 mb-1.5">"{prompt}"</div>
                  <div className="text-[10px] text-white/25">{tags}</div>
                </div>
              ))}
            </div>
          </div>
          <AIChatMock />
        </div>
      </section>

      {/* ── Internet-connected AI ── */}
      <section className="mx-auto max-w-6xl px-6 py-16" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Internet access</p>
            <h2 className="mb-4 text-[1.35rem] font-bold tracking-tight sm:text-[1.6rem]">
              AI that can actually read the internet
            </h2>
            <p className="mb-6 text-[14px] leading-relaxed text-white/40">
              Every AI node in your workflow has access to the live web. It can search for current information,
              open URLs, and read full page content — including JavaScript-rendered pages, documentation sites, and blog posts.
              No manual copy-pasting. No stale knowledge cutoffs.
            </p>
            <div className="flex flex-col gap-3">
              {[
                { tool:'web_search', desc:'Searches the web and returns the top results with titles, URLs, and excerpts' },
                { tool:'read_url', desc:'Opens any URL and reads the full content — including client-side rendered pages' },
              ].map((t) => (
                <div key={t.tool} className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <code className="shrink-0 rounded px-2 py-0.5 text-[11px] font-mono mt-0.5"
                    style={{ background:'rgba(59,130,246,0.12)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.2)' }}>
                    {t.tool}
                  </code>
                  <p className="text-[12px] text-white/40 leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:'rgba(10,10,12,0.97)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#3b82f6' }} />
              <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.5)', letterSpacing:'0.06em' }}>AI Node · Live run</span>
            </div>
            <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { tool:'web_search', query:'"top AI tools" site:news', status:'done', result:'8 results found' },
                { tool:'read_url', query:'techcrunch.com/2025/ai-roundup', status:'done', result:'4 200 words read' },
                { tool:'read_url', query:'venturebeat.com/ai/weekly', status:'running', result:null },
              ].map((s, i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                    <code style={{ fontSize:10, color:'#60a5fa', background:'rgba(59,130,246,0.1)', padding:'2px 7px', borderRadius:5 }}>{s.tool}</code>
                    {s.status === 'done'
                      ? <span style={{ fontSize:10, color:'#34d399' }}>✓ {s.result}</span>
                      : <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', display:'flex', alignItems:'center', gap:4 }}>
                          <span style={{ width:5, height:5, borderRadius:'50%', background:'#3b82f6', display:'inline-block', animation:'pulse 1s infinite' }}/>
                          reading…
                        </span>
                    }
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', fontFamily:'monospace' }}>{s.query}</div>
                </div>
              ))}
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', paddingTop:4 }}>
                Synthesising findings into newsletter draft…
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live execution ── */}
      <section className="mx-auto max-w-6xl px-6 py-16" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Runs</p>
            <h2 className="mb-4 text-[1.35rem] font-bold tracking-tight sm:text-[1.6rem]">
              See every step, as it happens
            </h2>
            <p className="text-[14px] leading-relaxed text-white/40">
              Every run streams live. Each step lights up, shows what it produced, and hands off to the next.
              Full history is saved automatically so you can see exactly what ran and when.
            </p>
          </div>
          <ExecPanel />
        </div>
      </section>

      {/* ── Human approval ── */}
      <section className="mx-auto max-w-6xl px-6 py-16" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <ApprovalMock />
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Human in the loop</p>
            <h2 className="mb-4 text-[1.35rem] font-bold tracking-tight sm:text-[1.6rem]">
              AI drafts it. You decide.
            </h2>
            <p className="text-[14px] leading-relaxed text-white/40">
              Drop a review step anywhere. The workflow pauses, emails you what the AI produced,
              and waits. One tap to approve and it continues — or reject and it stops.
              No login needed, works on any device.
            </p>
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section className="mx-auto max-w-6xl px-6 py-16" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Integrations</p>
        <h2 className="mb-2 text-[1.35rem] font-bold tracking-tight sm:text-[1.6rem]">Works with your tools</h2>
        <p className="mb-10 text-[14px] text-white/40">Connect once, use in any workflow.</p>

        <div className="flex flex-wrap gap-2.5 mb-10">
          {[
            { name:'Notion', color:C.notion },
            { name:'Linear', color:C.linear },
            { name:'Email', color:C.email },
            { name:'Claude AI', color:C.llm },
            { name:'GPT-4o', color:'#10b981' },
            { name:'Web Search', color:'#f97316' },
            { name:'Web Reader', color:'#8b5cf6' },
            { name:'Webhooks', color:C.webhook },
            { name:'HTTP', color:C.http },
            { name:'Any API', color:'rgba(255,255,255,0.3)' },
          ].map((t) => (
            <div key={t.name} style={{
              display:'flex', alignItems:'center', gap:7,
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
              borderRadius:8, padding:'7px 13px', fontSize:13, fontWeight:500,
              color:'rgba(255,255,255,0.7)',
            }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:t.color, flexShrink:0 }}/>
              {t.name}
            </div>
          ))}
          <div style={{
            display:'flex', alignItems:'center',
            background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.08)',
            borderRadius:8, padding:'7px 13px', fontSize:13,
            color:'rgba(255,255,255,0.25)',
          }}>
            + more coming
          </div>
        </div>

        {/* Integration details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { color:C.notion,   name:'Notion',      actions:'Create pages · Query databases · Append content' },
            { color:C.linear,   name:'Linear',      actions:'Create issues · List & filter · Post comments' },
            { color:C.email,    name:'Email',        actions:'Send to anyone · Dynamic content · AI-triggered' },
            { color:'#f97316',  name:'Web Search',  actions:'Search any topic · Real-time results · Powered by Brave' },
            { color:'#8b5cf6',  name:'Web Reader',  actions:'Read any URL · Works on JS-rendered pages · Returns clean markdown' },
          ].map((t) => (
            <div key={t.name} className="rounded-xl p-4"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderLeft:`2px solid ${t.color}` }}>
              <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.8)', marginBottom:5 }}>{t.name}</div>
              <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.3)', lineHeight:1.7 }}>{t.actions}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="mx-auto max-w-6xl px-6 py-16" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Use cases</p>
        <h2 className="mb-2 text-[1.35rem] font-bold tracking-tight sm:text-[1.6rem]">What people are building</h2>
        <p className="mb-10 text-[14px] text-white/40 max-w-lg">From simple daily tasks to multi-step AI pipelines.</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { color:'#f97316',  name:'Web research digest',      desc:'Search for the week\'s top news in any topic, read the full articles, and get a clean summary in your inbox.' },
            { color:C.llm,      name:'Competitor monitoring',    desc:'Automatically read competitor blogs and release notes, summarise what changed, and notify your team.' },
            { color:C.notion,   name:'Notion automations',       desc:'Auto-create pages, log entries, or update databases on a schedule.' },
            { color:C.linear,   name:'Issue triage',             desc:'Incoming requests become Linear issues — categorised by AI, assigned automatically.' },
            { color:C.approval, name:'Approval flows',           desc:'AI drafts it, you review it, then it goes out — no accidental sends.' },
            { color:C.schedule, name:'Scheduled reports',        desc:'Aggregate data from multiple sources and deliver a clean summary, on time.' },
          ].map((n) => (
            <div key={n.name} className="rounded-xl p-5"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:n.color, flexShrink:0 }}/>
                <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.8)' }}>{n.name}</span>
              </div>
              <p style={{ fontSize:12.5, color:'rgba(255,255,255,0.35)', lineHeight:1.65 }}>{n.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl px-8 py-8 sm:flex-row sm:items-center"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)' }}>
          <div>
            <h2 className="text-[1.35rem] font-bold text-white sm:text-[1.5rem]">Start your first workflow today</h2>
            <p className="mt-1 text-sm text-white/35">Describe what you want to automate. The AI handles the rest.</p>
          </div>
          <button onClick={handleCreate} disabled={creating}
            className="flex-shrink-0 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-all hover:opacity-90 disabled:opacity-50"
            style={{ boxShadow:'0 0 24px rgba(255,255,255,0.15)' }}>
            {creating ? 'Creating…' : 'Get started →'}
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
                <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z" stroke="black" strokeWidth="1.5"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">workflow-ai</span>
          </div>
          <p className="text-[12px] text-white/20">Automation for everyone — not just engineers.</p>
        </div>
      </footer>
    </div>
  )
}
