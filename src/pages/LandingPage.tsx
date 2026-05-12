import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { SavedWorkflow } from '@/lib/workflowApi'
import { API } from '@/lib/config'

// ─── colours ──────────────────────────────────────────────────
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

function Dot({ color }: { color: string }) {
  return <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:color, flexShrink:0 }} />
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}>
      <path d="M2.5 7l3 3 6-6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Mock canvas ──────────────────────────────────────────────

type NodeState = 'idle' | 'running' | 'done'

function MockCanvas() {
  const W = 520, H = 420
  const NW = 190, NH = 54

  const layout = [
    { id:0, label:'Every Monday 9am', sub:'Scheduled trigger', color:C.schedule, x:16,  y:158 },
    { id:1, label:'Fetch top stories', sub:'Web request',       color:C.http,     x:274, y:16  },
    { id:2, label:'Summarise with AI', sub:'AI · Claude',       color:C.llm,      x:274, y:94  },
    { id:3, label:'For each story',    sub:'Loop',              color:C.loop,     x:274, y:172 },
    { id:4, label:'Write post draft',  sub:'AI · Claude',       color:C.llm,      x:274, y:250 },
    { id:5, label:'Human review',      sub:'Approval',          color:C.approval, x:274, y:328 },
  ]

  const [states, setStates] = useState<NodeState[]>(Array(6).fill('idle'))
  const [animating, setAnimating] = useState(false)

  function handleRun() {
    if (animating) return
    setAnimating(true)
    setStates(Array(6).fill('idle'))

    // [startDelay, runDuration] per node
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

  function edgeStroke(sourceId: number) {
    return states[sourceId] === 'done' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.09)'
  }

  return (
    <div style={{
      position:'relative', width:'100%', borderRadius:18,
      border:'1px solid rgba(255,255,255,0.08)',
      background:'#0d0d0f',
      backgroundImage:'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
      backgroundSize:'24px 24px',
      overflow:'hidden',
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display:'block' }} preserveAspectRatio="xMidYMid meet">

        {/* trigger → each right-col node */}
        {layout.slice(1).map((target, i) => {
          const src = rm(layout[0])
          const dst = lm(target)
          const cx1 = src.x + (dst.x - src.x) * 0.6
          const cx2 = dst.x - (dst.x - src.x) * 0.25
          return (
            <path key={`t${i}`}
              d={`M${src.x},${src.y} C${cx1},${src.y} ${cx2},${dst.y} ${dst.x},${dst.y}`}
              stroke={edgeStroke(0)} strokeWidth="1.5" fill="none"
              style={{ transition:'stroke 0.4s' }}
            />
          )
        })}

        {/* vertical chain */}
        {layout.slice(1, -1).map((node, i) => {
          const next = layout[i + 2]
          const src = bm(node)
          const dst = tm(next)
          return (
            <path key={`v${i}`}
              d={`M${src.x},${src.y} C${src.x},${src.y+18} ${dst.x},${dst.y-18} ${dst.x},${dst.y}`}
              stroke={edgeStroke(node.id)} strokeWidth="1.5" fill="none"
              style={{ transition:'stroke 0.4s' }}
            />
          )
        })}

        {/* nodes */}
        {layout.map((n) => {
          const st = states[n.id]
          const cx = n.x + NW - 16
          const cy = n.y + NH / 2
          return (
            <g key={n.id}>
              {/* pulse ring */}
              {st === 'running' && (
                <rect x={n.x-3} y={n.y-3} width={NW+6} height={NH+6} rx={13}
                  fill="none" stroke={n.color} strokeWidth="1.5">
                  <animate attributeName="opacity" values="0.15;0.65;0.15" dur="1s" repeatCount="indefinite"/>
                  <animate attributeName="stroke-width" values="1;2.5;1" dur="1s" repeatCount="indefinite"/>
                </rect>
              )}

              {/* card */}
              <rect x={n.x} y={n.y} width={NW} height={NH} rx={10}
                fill={st === 'idle' ? 'rgba(14,14,18,0.98)' : 'rgba(20,20,26,0.99)'}
                stroke={st === 'running' ? `${n.color}70` : st === 'done' ? `${n.color}40` : 'rgba(255,255,255,0.08)'}
                strokeWidth="1"
                style={{ transition:'stroke 0.35s, fill 0.35s' }}
              />
              {/* accent bar */}
              <rect x={n.x} y={n.y+8} width={3} height={NH-16} rx={2}
                fill={n.color} opacity={st === 'idle' ? 0.35 : 1}
                style={{ transition:'opacity 0.35s' }}
              />
              {/* label */}
              <text x={n.x+16} y={n.y+23} fontSize={12} fontWeight="600" fontFamily="inherit"
                fill={st === 'idle' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.9)'}
                style={{ transition:'fill 0.35s' }}>
                {n.label}
              </text>
              {/* sub */}
              <text x={n.x+16} y={n.y+39} fontSize={10} fontFamily="inherit"
                fill={st === 'idle' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.32)'}
                style={{ transition:'fill 0.35s' }}>
                {n.sub}
              </text>

              {/* done: checkmark */}
              {st === 'done' && (
                <>
                  <circle cx={cx} cy={cy} r={6} fill="rgba(52,211,153,0.15)" stroke="#34d399" strokeWidth="1.2"/>
                  <path d={`M${cx-3},${cy} l2.2,2.2 l4,-4`} stroke="#34d399" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
                </>
              )}

              {/* running: spinner */}
              {st === 'running' && (
                <circle cx={cx} cy={cy} r={5.5} fill="none"
                  stroke={n.color} strokeWidth="1.5"
                  strokeDasharray="8 16" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
                    dur="0.75s" repeatCount="indefinite"/>
                </circle>
              )}
            </g>
          )
        })}
      </svg>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={animating}
        style={{
          position:'absolute', bottom:14, right:14, zIndex:2,
          display:'flex', alignItems:'center', gap:6,
          background: animating ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
          border:'1px solid rgba(255,255,255,0.14)',
          borderRadius:8, padding:'6px 13px',
          fontSize:11, fontWeight:600,
          color: animating ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)',
          cursor: animating ? 'default' : 'pointer',
          backdropFilter:'blur(8px)',
          transition:'all 0.2s',
        }}
      >
        {animating ? (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="animate-spin">
              <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25"/>
              <path d="M8.5 5A3.5 3.5 0 0 0 5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Running…
          </>
        ) : (
          <>
            <svg width="9" height="10" viewBox="0 0 9 10" fill="none">
              <path d="M1.5 1.5l6 3.5-6 3.5V1.5z" fill="currentColor"/>
            </svg>
            {states.some(s => s === 'done') ? 'Run again' : 'Run'}
          </>
        )}
      </button>

      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:36, zIndex:1,
        background:'linear-gradient(to bottom, transparent, rgba(13,13,15,0.65))',
        pointerEvents:'none',
      }}/>
    </div>
  )
}

// ─── AI Builder mock ──────────────────────────────────────────
function AIChatMock() {
  return (
    <div style={{
      background:'rgba(10,10,12,0.97)',
      border:'1px solid rgba(255,255,255,0.08)',
      borderRadius:14, overflow:'hidden',
    }}>
      <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#3b82f6' }} />
        <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.5)', letterSpacing:'0.06em' }}>AI Builder</span>
      </div>
      <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
        {/* user message */}
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:12, padding:'8px 12px', maxWidth:'80%', fontSize:12, color:'rgba(255,255,255,0.8)', lineHeight:1.5 }}>
            Every morning, pull the top posts from our Notion database, summarise them with AI, and email me a digest
          </div>
        </div>
        {/* thinking */}
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'rgba(255,255,255,0.3)' }}>
          <div style={{ width:14, height:14, borderRadius:'50%', background:'rgba(59,130,246,0.15)', flexShrink:0 }} className="animate-pulse"/>
          Designing workflow...
        </div>
        {/* assistant */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'10px 12px', fontSize:12, color:'rgba(255,255,255,0.65)', lineHeight:1.6 }}>
          Done! I've built a 4-step workflow: a daily 8am trigger pulls your Notion database, an AI step summarises each post, then sends you a clean email digest. Just add your Notion token to get started.
        </div>
        {/* applied badge */}
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
    { done:true,  label:'8am trigger fired',       note:'Monday, 9 Jun' },
    { done:true,  label:'Fetched Notion database',  note:'12 pages found' },
    { done:true,  label:'AI summarised content',    note:'3 key takeaways' },
    { done:false, label:'Sending email digest',     note:null },
  ]
  return (
    <div style={{
      background:'rgba(10,10,12,0.97)',
      border:'1px solid rgba(255,255,255,0.08)',
      borderRadius:14, overflow:'hidden',
    }}>
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
              <span style={{ fontSize:12, color: ev.done ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.9)', fontWeight: ev.done ? 400 : 500 }}>{ev.label}</span>
            </div>
            {ev.note && (
              <div style={{ marginLeft:24, fontSize:10, color:'rgba(255,255,255,0.3)' }}>{ev.note}</div>
            )}
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
    <header style={{ position:'sticky', top:0, zIndex:50, backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.75)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
              <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z" stroke="black" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className="text-[15px] font-semibold">workflow-ai</span>
        </button>
        <button
          onClick={onOpen}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:opacity-90"
          style={{ boxShadow:'0 0 20px rgba(255,255,255,0.15)' }}
        >
          Open app
        </button>
      </div>
    </header>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await fetch(`${API}/api/workflows`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
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
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div>
            <h1 className="mb-5 text-[3.5rem] font-bold leading-[1.06] tracking-tight lg:text-[4.25rem]">
              Build workflows<br/>
              <span style={{ color:'rgba(255,255,255,0.38)' }}>that do the work<br/>for you</span>
            </h1>

            <p className="mb-10 max-w-lg text-[1.0625rem] leading-relaxed text-white/50">
              Describe what you want to automate and AI builds it for you — or drag and drop it yourself.
              Schedule it, connect your tools, and let it run on its own.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:opacity-90 disabled:opacity-50"
                style={{ boxShadow:'0 0 24px rgba(255,255,255,0.18)' }}
              >
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
              <button
                onClick={() => navigate('/workflows')}
                className="rounded-full px-6 py-3 text-sm font-semibold text-white/60 transition-all hover:text-white"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}
              >
                See my workflows
              </button>
            </div>
          </div>

          <div>
            <MockCanvas />
            <p className="mt-3 text-center text-[11px] text-white/20">Weekly content pipeline — built in minutes, runs automatically</p>
          </div>
        </div>
      </section>

      {/* ── AI Builder ── */}
      <section className="mx-auto max-w-6xl px-6 py-20" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">AI Builder</p>
            <h2 className="mb-4 text-[2rem] font-bold tracking-tight">
              Just describe what you want
            </h2>
            <p className="mb-8 text-[14px] leading-relaxed text-white/40">
              Tell the AI what you want to automate in plain English. It figures out the steps,
              builds the workflow on the canvas in front of you, and explains what you need to fill in.
              Go back and forth to tweak it — the AI remembers the conversation.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                'No technical knowledge needed',
                'AI designs the full workflow for you',
                'Watch it appear on the canvas in real time',
                'Refine it through conversation',
                'Conversation saved so you can pick up later',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/50">
                  <Check />{f}
                </li>
              ))}
            </ul>
          </div>
          <AIChatMock />
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-6xl px-6 py-20" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">How it works</p>
        <h2 className="mb-3 text-[2rem] font-bold tracking-tight">From idea to running in minutes</h2>
        <p className="mb-12 text-white/40 max-w-lg">No setup, no configuration files, no engineering team required.</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              step: '1',
              color: '#3b82f6',
              name: 'Describe or drag',
              desc: 'Type what you want to automate and let AI build it — or drag steps from the panel and connect them yourself. Either way takes minutes.',
            },
            {
              step: '2',
              color: '#8b5cf6',
              name: 'Connect your tools',
              desc: 'Add your Notion workspace, Linear team, or any other service you use. Paste a token and you\'re done — no complicated setup.',
            },
            {
              step: '3',
              color: '#10b981',
              name: 'Run automatically',
              desc: 'Set a schedule, use a link to trigger it from anywhere, or let something else kick it off. Watch it run live and get notified when it\'s done.',
            },
          ].map((s) => (
            <div
              key={s.step}
              className="flex flex-col rounded-2xl p-6"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderTop:`2px solid ${s.color}` }}
            >
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold" style={{ background:`${s.color}20`, color:s.color }}>
                {s.step}
              </div>
              <div className="mb-2 text-sm font-semibold text-white">{s.name}</div>
              <p className="text-[13px] leading-relaxed text-white/40">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What you can build ── */}
      <section className="mx-auto max-w-6xl px-6 py-20" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Use cases</p>
        <h2 className="mb-3 text-[2rem] font-bold tracking-tight">What people are building</h2>
        <p className="mb-12 text-white/40 max-w-lg">From simple daily tasks to multi-step AI pipelines — if you can describe it, you can automate it.</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              color: C.llm,
              name: 'Content pipelines',
              desc: 'Pull articles or posts from a source every morning, have AI summarise them, and send a digest to your inbox or team Slack.',
            },
            {
              color: C.notion,
              name: 'Notion automations',
              desc: 'Create new pages, log entries, or update databases in Notion automatically — triggered by a schedule or an external event.',
            },
            {
              color: C.linear,
              name: 'Issue tracking',
              desc: 'Automatically create Linear issues from incoming requests, categorise them with AI, and notify your team — no manual triage.',
            },
            {
              color: C.approval,
              name: 'Review & approval flows',
              desc: 'Let AI draft something — a post, a reply, a report — then pause for your review before anything actually gets sent.',
            },
            {
              color: C.schedule,
              name: 'Scheduled reports',
              desc: 'Aggregate data from multiple sources on a schedule, have AI write a summary, and deliver it wherever you need it.',
            },
            {
              color: C.email,
              name: 'Smart email responses',
              desc: 'Receive a webhook from a form or service, have AI craft a personalised reply, review it, and send it automatically.',
            },
          ].map((n) => (
            <div
              key={n.name}
              className="flex flex-col rounded-2xl p-5"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderLeft:`3px solid ${n.color}` }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Dot color={n.color} />
                <span className="text-sm font-semibold text-white">{n.name}</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-white/40">{n.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Integrations ── */}
      <section className="mx-auto max-w-6xl px-6 py-20" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Integrations</p>
        <h2 className="mb-3 text-[2rem] font-bold tracking-tight">Works with the tools you already use</h2>
        <p className="mb-12 text-white/40 max-w-lg">Connect once, use everywhere in your workflows.</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              color: C.notion,
              name: 'Notion',
              actions: ['Create pages', 'Query databases', 'Append content'],
            },
            {
              color: C.linear,
              name: 'Linear',
              actions: ['Create issues', 'List & filter issues', 'Post comments'],
            },
            {
              color: C.email,
              name: 'Email',
              actions: ['Send to anyone', 'Dynamic subject & body', 'Triggered by AI output'],
            },
            {
              color: C.http,
              name: 'Any website or app',
              actions: ['Call any web service', 'Send data anywhere', 'Receive incoming events'],
            },
          ].map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-2xl p-5"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderTop:`2px solid ${t.color}` }}
            >
              <div className="mb-4 flex items-center gap-2">
                <Dot color={t.color} />
                <span className="text-sm font-semibold text-white">{t.name}</span>
              </div>
              <ul className="flex flex-col gap-2">
                {t.actions.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-[12px] text-white/40">
                    <Check />{a}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Live execution ── */}
      <section className="mx-auto max-w-6xl px-6 py-20" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Live runs</p>
            <h2 className="mb-4 text-[2rem] font-bold tracking-tight">
              See exactly what's happening, as it happens
            </h2>
            <p className="mb-8 text-[14px] leading-relaxed text-white/40">
              When a workflow runs, every step lights up as it completes.
              You can see what each step did and what it passed to the next one —
              so you always know what your automation is doing.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                'Watch each step complete in real time',
                'See what every step produced',
                'Scheduled runs start automatically',
                'Full history saved for every run',
                'Stop a run at any time',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/50">
                  <Check />{f}
                </li>
              ))}
            </ul>
          </div>
          <ExecPanel />
        </div>
      </section>

      {/* ── Human approval ── */}
      <section className="mx-auto max-w-6xl px-6 py-20" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <ApprovalMock />
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Human in the loop</p>
            <h2 className="mb-4 text-[2rem] font-bold tracking-tight">
              Always review before anything goes out
            </h2>
            <p className="mb-8 text-[14px] leading-relaxed text-white/40">
              Add a review step anywhere in your workflow. The automation pauses, shows you what
              the AI produced, and waits for your OK. Approve and it continues — reject and it stops.
              Works on any device, no login required.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                'Get notified by email when your review is needed',
                'See everything the automation did before asking',
                'One click to approve or reject',
                'Works on phone, tablet, or desktop',
                'Auto-cancels if you don\'t respond in time',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/50">
                  <Check />{f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Triggers ── */}
      <section className="mx-auto max-w-6xl px-6 py-20" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Triggers</p>
        <h2 className="mb-3 text-[2rem] font-bold tracking-tight">3 ways to start a workflow</h2>
        <p className="mb-12 text-white/40 max-w-lg">Choose how your automation starts — and change it any time.</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              color: C.schedule,
              name: 'On a schedule',
              desc: 'Run every hour, every day, every Monday morning — whatever fits your routine. Set it once and forget about it.',
              details: ['Hourly, daily, weekly options', 'Pick the exact time', 'Pause without deleting', 'Runs automatically in the background'],
            },
            {
              color: C.webhook,
              name: 'From a link',
              desc: 'Get a unique link you can share or embed anywhere. Anyone with the link can trigger the workflow — great for forms, buttons, or other services.',
              details: ['Shareable trigger link', 'Passes along any data sent', 'Works with any external tool', 'See every time it was used'],
            },
            {
              color: '#818cf8',
              name: 'Programmatically',
              desc: 'If you or your team does have a technical setup, trigger workflows from your own systems using a secure key. Get the run ID back to track it.',
              details: ['Secure access key', 'Pass in custom data', 'Returns immediately with run ID', 'Full run history available'],
            },
          ].map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-2xl p-6"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderTop:`2px solid ${t.color}` }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Dot color={t.color} />
                <span className="text-sm font-semibold text-white">{t.name}</span>
              </div>
              <p className="mb-5 text-[13px] leading-relaxed text-white/40">{t.desc}</p>
              <ul className="mt-auto flex flex-col gap-2">
                {t.details.map((d) => (
                  <li key={d} className="flex items-center gap-2 text-[12px] text-white/40">
                    <Check />{d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div
          className="flex flex-col items-start justify-between gap-6 rounded-2xl px-8 py-8 sm:flex-row sm:items-center"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 0 60px rgba(255,255,255,0.02) inset' }}
        >
          <div>
            <h2 className="text-[1.75rem] font-bold text-white">Start automating today</h2>
            <p className="mt-1 text-sm text-white/40">Describe your first workflow to the AI and it'll be ready in seconds.</p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:opacity-90 disabled:opacity-50"
            style={{ boxShadow:'0 0 24px rgba(255,255,255,0.18)' }}
          >
            {creating ? 'Creating…' : 'Get started →'}
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl px-6 py-10 flex items-center justify-between">
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
