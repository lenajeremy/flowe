import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

type PageState = 'loading' | 'ready' | 'triggering' | 'done' | 'error'

export function WebhookTriggerPage() {
  const { token } = useParams<{ token: string }>()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [workflowName, setWorkflowName] = useState('')
  const [workflowId, setWorkflowId] = useState('')
  const [payload, setPayload] = useState('{}')
  const [payloadError, setPayloadError] = useState<string | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setPageState('error'); setErrorMsg('Missing token'); return }
    fetch(`/api/webhooks/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error('Webhook not found')
        return r.json() as Promise<{ workflow_name: string; workflow_id: string }>
      })
      .then((info) => {
        setWorkflowName(info.workflow_name)
        setWorkflowId(info.workflow_id)
        setPageState('ready')
      })
      .catch((e: unknown) => {
        setErrorMsg(e instanceof Error ? e.message : 'Failed to load webhook')
        setPageState('error')
      })
  }, [token])

  function validatePayload(value: string) {
    setPayload(value)
    try {
      JSON.parse(value)
      setPayloadError(null)
    } catch {
      setPayloadError('Invalid JSON')
    }
  }

  async function handleTrigger() {
    if (!token || payloadError) return
    setPageState('triggering')
    try {
      let body: Record<string, unknown> = {}
      try { body = JSON.parse(payload) as Record<string, unknown> } catch { /* ignore */ }
      const res = await fetch(`/api/webhooks/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { run_id: string }
      setRunId(data.run_id)
      setPageState('done')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Trigger failed')
      setPageState('error')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#000', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}
    >
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Logo / brand */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white">
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z" stroke="black" strokeWidth="1.5" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold text-white">workflow-ai</span>
          <Link to="/" className="ml-auto text-[11px] text-white/40 hover:text-white/70 transition-colors">
            Home
          </Link>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-6 flex flex-col gap-5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          }}
        >
          {/* Loading */}
          {pageState === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="2" strokeOpacity="0.2" />
                <path d="M18 10A8 8 0 0 0 10 2" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-[13px] text-white/50">Loading…</p>
            </div>
          )}

          {/* Error */}
          {pageState === 'error' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L13 12H1L7 1z" stroke="#ef4444" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M7 5v3M7 10h.01" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-[14px] font-semibold text-white">Webhook not found</p>
              </div>
              <p className="text-[12px] text-white/50 leading-relaxed">{errorMsg ?? 'This webhook link is invalid or has been deleted.'}</p>
              <Link
                to="/"
                className="mt-1 inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center text-[12px] text-white/70 hover:bg-white/10 transition-colors"
              >
                Go home
              </Link>
            </div>
          )}

          {/* Ready to trigger */}
          {(pageState === 'ready' || pageState === 'triggering') && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <p className="text-[11px] uppercase tracking-widest text-white/40">Trigger workflow</p>
                <h1 className="text-[20px] font-bold text-white leading-tight">{workflowName}</h1>
                <p className="text-[12px] text-white/50 mt-0.5">
                  Clicking the button below will start a new run of this workflow.
                </p>
              </div>

              {/* Payload input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-white/50 uppercase tracking-wider">
                  Input payload <span className="normal-case lowercase">(JSON)</span>
                </label>
                <textarea
                  rows={4}
                  value={payload}
                  onChange={(e) => validatePayload(e.target.value)}
                  spellCheck={false}
                  className="w-full rounded-xl border px-3 py-2.5 text-[12px] font-mono text-white/80 outline-none transition-colors resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderColor: payloadError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = payloadError ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.2)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = payloadError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)' }}
                  placeholder="{}"
                  disabled={pageState === 'triggering'}
                />
                {payloadError && (
                  <p className="text-[11px] text-red-400">{payloadError}</p>
                )}
              </div>

              <button
                onClick={() => void handleTrigger()}
                disabled={pageState === 'triggering' || !!payloadError}
                className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold text-black transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: pageState === 'triggering' ? 'rgba(255,255,255,0.7)' : '#fff',
                  boxShadow: pageState !== 'triggering' ? '0 0 20px rgba(255,255,255,0.15)' : 'none',
                }}
              >
                {pageState === 'triggering' ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="black" strokeWidth="1.8" strokeOpacity="0.25" />
                      <path d="M12.5 7A5.5 5.5 0 0 0 7 1.5" stroke="black" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    Triggering…
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M2.5 1.5l8 4.5-8 4.5V1.5z" />
                    </svg>
                    Trigger Workflow
                  </>
                )}
              </button>
            </div>
          )}

          {/* Done */}
          {pageState === 'done' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3.5 3.5 6.5-7" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-white">Workflow triggered</p>
                </div>
                <p className="text-[12px] text-white/50 mt-1">
                  <span className="font-medium text-white/70">{workflowName}</span> is now running.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {workflowId && (
                  <Link
                    to={`/workflow/${workflowId}?runId=${runId ?? ''}`}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold text-black transition-all"
                    style={{ background: '#fff', boxShadow: '0 0 20px rgba(255,255,255,0.15)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="1" y="1" width="4" height="4" rx="0.5" />
                      <rect x="7" y="1" width="4" height="4" rx="0.5" />
                      <rect x="1" y="7" width="4" height="4" rx="0.5" />
                      <rect x="7" y="7" width="4" height="4" rx="0.5" />
                    </svg>
                    View workflow
                  </Link>
                )}
                <button
                  onClick={() => { setPageState('ready'); setRunId(null) }}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[12px] text-white/70 hover:bg-white/10 transition-colors"
                >
                  Trigger again
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-white/25">
          Powered by workflow-ai · <Link to="/" className="hover:text-white/50 transition-colors">Open app</Link>
        </p>
      </div>
    </div>
  )
}
