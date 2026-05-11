import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { SavedWorkflow } from '@/lib/workflowApi'
import { API } from '@/lib/config'

// ─── colour palette (mirrors the real node accent colours) ───
const C = {
  schedule: '#8b5cf6',
  webhook:  '#f59e0b',
  http:     '#22c55e',
  llm:      '#3b82f6',
  branch:   '#f97316',
  loop:     '#14b8a6',
  email:    '#f59e0b',
  approval: '#ec4899',
  output:   '#6b7280',
}

// ─── tiny helpers ─────────────────────────────────────────────
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

// ─── Mock canvas (node graph screenshot) ─────────────────────
function MockNode({
  label, sub, color, x, y, width = 130,
}: { label: string; sub: string; color: string; x: number; y: number; width?: number }) {
  return (
    <div style={{
      position:'absolute', left:x, top:y, width,
      background:'rgba(18,18,20,0.95)',
      border:`1px solid rgba(255,255,255,0.10)`,
      borderRadius:10,
      padding:'7px 10px',
      borderLeft:`3px solid ${color}`,
      boxShadow:'0 4px 16px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.85)', marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.35)' }}>{sub}</div>
    </div>
  )
}

function Edge({ x1,y1,x2,y2,color='rgba(255,255,255,0.15)' }: { x1:number; y1:number; x2:number; y2:number; color?:string }) {
  const cx1 = x1 + (x2-x1)*0.5
  const cx2 = x2 - (x2-x1)*0.5
  return <path d={`M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`} stroke={color} strokeWidth="1.5" fill="none" opacity="0.7"/>
}

function MockCanvas() {
  const H = 220
  // node centre-right connection points (approximate)
  const nodes = [
    { label:'Every Monday', sub:'Scheduled Trigger', color:C.schedule, x:10,  y:85,  w:130 },
    { label:'Fetch HN Stories', sub:'HTTP GET',       color:C.http,     x:170, y:20,  w:130 },
    { label:'Extract 5 Stories', sub:'LLM · Haiku',  color:C.llm,      x:330, y:20,  w:130 },
    { label:'For Each Story', sub:'Loop',             color:C.loop,     x:490, y:85,  w:120 },
    { label:'Draft Post', sub:'LLM · Sonnet',         color:C.llm,      x:330, y:140, w:120 },
    { label:'Review Post', sub:'Human Approval',      color:C.approval, x:490, y:140, w:125 },
    { label:'Queue Post', sub:'Send Email',            color:C.email,    x:615, y:50,  w:115 },
  ]
  // edges: [fromIdx, toIdx] using right-mid of source → left-mid of target
  const edges = [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[3,6],
  ]
  function mid(n: typeof nodes[0]) { return { x: n.x + (n.w??130), y: n.y + 28 } }
  function lft(n: typeof nodes[0]) { return { x: n.x,              y: n.y + 28 } }

  return (
    <div style={{
      position:'relative', width:'100%', height:H, overflow:'hidden',
      background:'#0d0d0f',
      backgroundImage:'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
      backgroundSize:'22px 22px',
      borderRadius:16,
      border:'1px solid rgba(255,255,255,0.07)',
    }}>
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible' }}>
        {edges.map(([a,b],i) => {
          const s = mid(nodes[a]), t = lft(nodes[b])
          return <Edge key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} />
        })}
      </svg>
      {nodes.map((n,i) => (
        <MockNode key={i} {...n} width={n.w} />
      ))}
      {/* running pulse on "Draft Post" node */}
      <div style={{
        position:'absolute', left:330, top:140, width:120, height:56,
        borderRadius:10, border:`1px solid ${C.llm}60`,
        boxShadow:`0 0 16px ${C.llm}30`,
        pointerEvents:'none',
      }}/>
    </div>
  )
}

// ─── Execution panel mock ────────────────────────────────────
const EXEC_EVENTS = [
  { type:'done',    label:'Every Monday',       out:'{"trigger":"scheduled"}' },
  { type:'done',    label:'Fetch HN Stories',   out:'{"hits":[...50 stories]}' },
  { type:'done',    label:'Extract 5 Stories',  out:'["Show HN: Opus 5...","Ask HN:...","..."]' },
  { type:'running', label:'Draft Post [1/5]',   out:null },
]

function ExecPanel() {
  return (
    <div style={{
      background:'rgba(10,10,12,0.97)',
      border:'1px solid rgba(255,255,255,0.08)',
      borderRadius:14, overflow:'hidden',
      fontFamily:'inherit',
    }}>
      {/* header */}
      <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.5)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Execution Log</span>
        <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#fbbf24', background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:20, padding:'2px 8px' }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:'#fbbf24', display:'inline-block' }} className="animate-pulse"/>
          Running
        </span>
      </div>
      {/* events */}
      <div style={{ padding:'8px 0' }}>
        {EXEC_EVENTS.map((ev,i) => (
          <div key={i} style={{ padding:'8px 14px', borderBottom: i < EXEC_EVENTS.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: ev.out ? 4 : 0 }}>
              {ev.type === 'done' ? (
                <span style={{ width:16, height:16, borderRadius:'50%', background:'rgba(52,211,153,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="#34d399" strokeWidth="1.3" strokeLinecap="round"/></svg>
                </span>
              ) : (
                <span style={{ width:16, height:16, borderRadius:'50%', background:'rgba(59,130,246,0.15)', flexShrink:0 }} className="animate-pulse"/>
              )}
              <span style={{ fontSize:12, color: ev.type==='done' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.9)', fontWeight: ev.type==='running' ? 500 : 400 }}>
                {ev.label}
              </span>
            </div>
            {ev.out && (
              <div style={{ marginLeft:24, fontSize:10, fontFamily:'monospace', color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.03)', borderRadius:6, padding:'4px 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {ev.out}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Run detail mock ─────────────────────────────────────────
function RunDetailMock() {
  return (
    <div style={{
      background:'rgba(10,10,12,0.97)',
      border:'1px solid rgba(255,255,255,0.08)',
      borderRadius:14, overflow:'hidden',
    }}>
      {/* approval banner */}
      <div style={{ padding:'12px 14px', background:'rgba(236,72,153,0.07)', borderBottom:'1px solid rgba(236,72,153,0.15)' }}>
        <div style={{ fontSize:11, fontWeight:600, color:'#ec4899', marginBottom:4 }}>Approval Required</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:10 }}>Review this LinkedIn draft. Approve to queue it for publishing.</div>
        <div style={{ fontSize:10, fontFamily:'monospace', color:'rgba(255,255,255,0.55)', background:'rgba(255,255,255,0.04)', borderRadius:6, padding:'6px 8px', marginBottom:10, lineHeight:1.6 }}>
          Every AI feature you ship today is one API outage away from<br/>being completely broken. That's not a hypothetical…
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <div style={{ flex:1, background:'#10b981', borderRadius:7, padding:'5px 0', textAlign:'center', fontSize:10, fontWeight:600, color:'white' }}>Approve</div>
          <div style={{ flex:1, background:'rgba(239,68,68,0.7)', borderRadius:7, padding:'5px 0', textAlign:'center', fontSize:10, fontWeight:600, color:'white' }}>Reject</div>
        </div>
      </div>
      {/* node cards */}
      {[
        { label:'Fetch HN Stories', status:'completed', out:'{"hits":[...]}' },
        { label:'Extract 5 Stories', status:'completed', out:'["Show HN: Opus 5","Ask HN:..."]' },
        { label:'Draft Post [1/5]', status:'waiting', out:null },
      ].map((c,i) => (
        <div key={i} style={{ padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: c.out ? 4 : 0 }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)' }}>{c.label}</span>
            <span style={{ fontSize:9, padding:'2px 6px', borderRadius:20, background: c.status==='completed' ? 'rgba(52,211,153,0.12)' : 'rgba(236,72,153,0.12)', color: c.status==='completed' ? '#34d399' : '#ec4899', fontWeight:600 }}>
              {c.status}
            </span>
          </div>
          {c.out && <div style={{ fontSize:9.5, fontFamily:'monospace', color:'rgba(255,255,255,0.3)' }}>{c.out}</div>}
        </div>
      ))}
    </div>
  )
}

// ─── Nav ─────────────────────────────────────────────────────
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

// ─── Main page ────────────────────────────────────────────────
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
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] text-white/50"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Visual AI workflow builder
            </div>

            <h1 className="mb-6 text-[3.25rem] font-bold leading-[1.08] tracking-tight lg:text-[4rem]">
              Build AI pipelines<br/>that actually ship
            </h1>

            <p className="mb-10 max-w-lg text-[1.0625rem] leading-relaxed text-white/50">
              Drag nodes onto a canvas, connect them, hit run. Scheduled triggers,
              webhooks, LLMs, HTTP calls, loops, branching, human approval — all wired together
              with live execution streaming and full run logs.
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
                New workflow
              </button>
              <button
                onClick={() => navigate('/workflows')}
                className="rounded-full px-6 py-3 text-sm font-semibold text-white/60 transition-all hover:text-white"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}
              >
                View all workflows
              </button>
            </div>
          </div>

          {/* Canvas mock */}
          <div>
            <MockCanvas />
            <p className="mt-3 text-center text-[11px] text-white/20">Weekly LinkedIn Content Pipeline — live in the editor</p>
          </div>
        </div>
      </section>

      {/* ── Triggers ── */}
      <section className="mx-auto max-w-6xl px-6 py-20" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Triggers</p>
        <h2 className="mb-3 text-[2rem] font-bold tracking-tight">3 ways to start a workflow</h2>
        <p className="mb-12 text-white/40 max-w-lg">Every run starts from a trigger. Pick what fits your use-case — no polling, no cron jobs to manage.</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              color: C.schedule,
              name: 'Scheduled',
              desc: 'Run on a calendar — hourly, daily, weekly, or monthly at a specific time. The scheduler fires automatically; no external cron needed.',
              details: ['Hourly, daily, weekly, monthly', 'Set exact run time (HH:MM)', 'Day-of-week and day-of-month', 'Enable / disable without deleting'],
            },
            {
              color: C.webhook,
              name: 'Webhook',
              desc: 'Get a unique HTTPS endpoint. POST any JSON payload to it and the workflow starts instantly with that payload available to all downstream nodes.',
              details: ['Unique token-secured URL', 'Full JSON payload forwarded', 'Trigger page for non-devs', 'View trigger history'],
            },
            {
              color: '#818cf8',
              name: 'API Key',
              desc: 'Trigger workflows programmatically from your own backend. Create API keys from the settings panel and hit the REST endpoint with a Bearer token.',
              details: ['Bearer token auth', 'Pass structured input', 'Async — get run ID back', 'Key-level access control'],
            },
          ].map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-2xl p-6"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderTop:`2px solid ${t.color}` }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Dot color={t.color} />
                <span className="text-sm font-semibold text-white">{t.name} Trigger</span>
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

      {/* ── Node types ── */}
      <section className="mx-auto max-w-6xl px-6 py-20" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Nodes</p>
        <h2 className="mb-3 text-[2rem] font-bold tracking-tight">Everything you need in one canvas</h2>
        <p className="mb-12 text-white/40 max-w-lg">Drag any node type onto the canvas and connect them. Each node has a focused config panel — no JSON, no YAML.</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              color: C.llm,
              name: 'LLM',
              desc: 'Call Claude or GPT-4 with a system + user prompt. Use {{nodeId.output}} to pass outputs from any previous node. Supports JSON schema for structured output.',
              tags: ['Claude Sonnet / Haiku / Opus', 'GPT-4o / GPT-4o-mini', 'Temperature & token control', 'Structured JSON output'],
            },
            {
              color: C.http,
              name: 'HTTP Request',
              desc: 'Make any GET / POST / PUT / DELETE request to any external API. Set headers, body, and interpolate upstream outputs into the URL or body.',
              tags: ['GET, POST, PUT, DELETE, PATCH', 'Custom headers', 'Template body with {{vars}}', 'Full response forwarded'],
            },
            {
              color: C.branch,
              name: 'Branch',
              desc: 'Conditionally route execution. Write a plain-English condition — the branch node uses Claude Haiku to evaluate it and picks the true or false path.',
              tags: ['Natural-language conditions', 'LLM-evaluated (Haiku)', 'Two output handles: true / false', 'Regex fallback if no API key'],
            },
            {
              color: C.loop,
              name: 'Loop',
              desc: 'Iterate over any JSON array — API results, extracted lists, CSV rows. The full loop body executes once per item with the current item injected.',
              tags: ['Iterate over JSON arrays', 'Dot-path field extraction', 'Preserves upstream outputs', 'Results collected as array'],
            },
            {
              color: C.approval,
              name: 'Human Approval',
              desc: 'Pause a workflow and wait for a human decision. Optional email notification with the upstream content and a direct link to the approve / reject page.',
              tags: ['Sends notification email', 'Linked run detail page', 'Approve or reject buttons', 'Configurable timeout'],
            },
            {
              color: C.email,
              name: 'Send Email',
              desc: 'Send a fully composed email via Resend. Recipient, subject, and body all support {{nodeId.output}} template variables so every email is dynamic.',
              tags: ['Resend-powered delivery', 'To / Subject / Body fields', 'Template variable support', 'Delivery status in logs'],
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
              <p className="mb-4 text-[12.5px] leading-relaxed text-white/40">{n.desc}</p>
              <div className="mt-auto flex flex-wrap gap-1.5">
                {n.tags.map((t) => (
                  <span key={t} className="rounded-md px-2 py-0.5 text-[10px] text-white/40"
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Execution ── */}
      <section className="mx-auto max-w-6xl px-6 py-20" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Execution</p>
            <h2 className="mb-4 text-[2rem] font-bold tracking-tight">
              Watch every node run in real time
            </h2>
            <p className="mb-8 text-[14px] leading-relaxed text-white/40">
              Hit Run. A live execution panel streams events over SSE as the workflow progresses —
              each node lights up when it starts, shows its output when done, and turns red on error.
              No refresh needed.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                'Server-Sent Events — no polling',
                'Output shown per node as it completes',
                'Scheduled runs auto-appear on the canvas',
                'Full run saved to history on completion',
                'Cancel in-flight runs at any time',
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
          <RunDetailMock />
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Human-in-the-loop</p>
            <h2 className="mb-4 text-[2rem] font-bold tracking-tight">
              Approve or reject before anything ships
            </h2>
            <p className="mb-8 text-[14px] leading-relaxed text-white/40">
              Drop a Human Approval node anywhere in the graph. The workflow pauses, sends a
              notification email with what the AI produced, and waits. A unique run detail page
              shows every node's output — approve or reject from there, on any device.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                'Email notification with upstream AI output',
                'Run detail page — shareable link',
                'Shows every node output in order',
                'Approve / Reject buttons on the page',
                'Workflow resumes or skips based on decision',
                'Configurable timeout (auto-reject on expiry)',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/50">
                  <Check />{f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Template variables ── */}
      <section className="mx-auto max-w-6xl px-6 py-20" style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Data flow</p>
            <h2 className="mb-4 text-[2rem] font-bold tracking-tight">
              Wire outputs into any field
            </h2>
            <p className="mb-8 text-[14px] leading-relaxed text-white/40">
              Every node's output is accessible to all downstream nodes via{' '}
              <code className="rounded px-1.5 py-0.5 text-[12px] text-white/70" style={{ background:'rgba(255,255,255,0.08)' }}>
                {'{{nodeId.output}}'}
              </code>
              . Use them in LLM prompts, HTTP request bodies, email bodies, branch conditions — anywhere there's a text field.
              An <em>Insert</em> button next to every field shows available variables.
            </p>
            <div
              className="rounded-xl p-5 font-mono text-[12px] leading-relaxed"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="text-white/30 mb-2 text-[10px] not-italic font-sans uppercase tracking-wider">LLM · User Prompt</div>
              <div className="text-white/70">
                Write a LinkedIn post about this story:<br/><br/>
                <span style={{ background:'rgba(59,130,246,0.2)', color:'#93c5fd', borderRadius:4, padding:'1px 5px' }}>{'{{loop-1.output}}'}</span>
                <br/><br/>
                Make it personal and end with a concrete takeaway.
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { from:'http-1', to:'llm-extract', field:'User Prompt', example:'Here are the top stories: {{http-1.output}}' },
              { from:'llm-extract', to:'loop-1', field:'Loop source', example:'Iterates over the JSON array returned by llm-extract' },
              { from:'loop-1', to:'llm-draft', field:'User Prompt', example:'Write a post about: {{loop-1.output}}' },
              { from:'llm-draft', to:'email-1', field:'Email Body', example:'Approved post:\n\n{{llm-draft.output}}' },
            ].map((row) => (
              <div key={row.from} className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono text-white/30">{row.from}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M7 3l3 3-3 3" stroke="rgba(255,255,255,0.2)" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  <span className="text-[10px] font-mono text-white/30">{row.to}</span>
                  <span className="ml-auto text-[9px] text-white/25 uppercase tracking-wider">{row.field}</span>
                </div>
                <div className="text-[11px] font-mono text-white/40">{row.example}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div
          className="flex flex-col items-start justify-between gap-6 rounded-2xl px-8 py-8 sm:flex-row sm:items-center"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 0 60px rgba(255,255,255,0.02) inset' }}
        >
          <div>
            <h2 className="text-[1.75rem] font-bold text-white">Start building your first workflow</h2>
            <p className="mt-1 text-sm text-white/40">No config files. No YAML. Just a canvas.</p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:opacity-90 disabled:opacity-50"
            style={{ boxShadow:'0 0 24px rgba(255,255,255,0.18)' }}
          >
            {creating ? 'Creating…' : 'New workflow →'}
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
          <p className="text-[12px] text-white/20">AI should be one step in a workflow engine, not the whole thing.</p>
        </div>
      </footer>
    </div>
  )
}
