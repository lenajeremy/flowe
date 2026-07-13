import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import { FloweIcon } from '@/components/FloweIcon'
import { JsonPayloadField } from '@/components/ui/JsonPayloadField'
import { useJsonPayload } from '@/lib/useJsonPayload'

// Public webhook trigger page (/trigger/:token) — anyone with the link can
// fire the workflow with a JSON payload. Styled on the app's token system
// with the Build-page gradient language.

type PageState = 'loading' | 'ready' | 'triggering' | 'done' | 'error'

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.25" />
      <path d="M12.5 7A5.5 5.5 0 0 0 7 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function WebhookTriggerPage() {
  const { token } = useParams<{ token: string }>()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [workflowName, setWorkflowName] = useState('')
  const [workflowId, setWorkflowId] = useState('')
  const [runId, setRunId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const payload = useJsonPayload('{}')

  useEffect(() => {
    if (!token) { setPageState('error'); setErrorMsg('Missing token'); return }
    apiFetch(`${API}/api/webhooks/${token}`)
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

  async function handleTrigger() {
    if (!token || payload.error) return
    setPageState('triggering')
    try {
      let body: Record<string, unknown> = {}
      try { body = JSON.parse(payload.value) as Record<string, unknown> } catch { /* empty → {} */ }
      const res = await apiFetch(`${API}/api/webhooks/${token}`, {
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-canvas)] px-4 font-[var(--font-sans)] text-[var(--color-text)]">
      {/* ── Purple gradient backdrop ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-48 left-1/2 h-[560px] w-[820px] -translate-x-1/2 rounded-full opacity-35"
          style={{ background: 'radial-gradient(ellipse, color-mix(in srgb, var(--color-accent) 32%, transparent), transparent 70%)' }}
        />
        <div
          className="absolute -bottom-56 -left-40 h-[460px] w-[460px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, #7c5ce0 30%, transparent), transparent 70%)' }}
        />
        <div
          className="absolute -right-44 top-1/3 h-[420px] w-[420px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, #ff8ce8 22%, transparent), transparent 70%)' }}
        />
      </div>

      <motion.div
        className="relative flex w-full max-w-xl flex-col gap-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent)]">
            <FloweIcon size={18} />
          </div>
          <span className="text-[15px] font-semibold">Flowe</span>
          <Link to="/" className="ml-auto text-[11px] text-[var(--color-subtle)] transition-colors hover:text-[var(--color-text)]">
            Open app
          </Link>
        </div>

        {/* Card — gradient border like the Build page prompt */}
        <div
          className="rounded-[22px] p-px"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 50%, var(--color-border)), var(--color-border) 45%, color-mix(in srgb, #ff8ce8 35%, var(--color-border)))',
          }}
        >
          <div className="flex flex-col gap-5 rounded-[21px] bg-[var(--color-elevated)] p-6" style={{ boxShadow: 'var(--panel-shadow)' }}>

            {pageState === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-6 text-[var(--color-muted)]">
                <Spinner size={20} />
                <p className="text-[13px]">Loading…</p>
              </div>
            )}

            {pageState === 'error' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--tint-fail)' }}>
                    <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1L13 12H1L7 1z" stroke="var(--color-fail)" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M7 5v3M7 10h.01" stroke="var(--color-fail)" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-semibold">Webhook not found</p>
                </div>
                <p className="text-[12.5px] leading-relaxed text-[var(--color-muted)]">
                  {errorMsg ?? 'This webhook link is invalid or has been deleted.'}
                </p>
                <Link
                  to="/"
                  className="pressable mt-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-center text-[12px] font-medium text-[var(--color-text)] hover:border-[var(--color-border2)]"
                >
                  Go home
                </Link>
              </div>
            )}

            {(pageState === 'ready' || pageState === 'triggering') && (
              <>
                <div className="flex flex-col gap-1">
                  <p className="micro text-[var(--color-accent)]">Trigger workflow</p>
                  <h1 className="text-[20px] font-semibold leading-tight">{workflowName}</h1>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
                    The payload below is delivered to the workflow's webhook trigger node.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="micro text-[var(--color-subtle)]">Input payload (JSON)</label>
                  <JsonPayloadField
                    value={payload.value}
                    error={payload.error}
                    onChange={payload.update}
                    height="240px"
                    disabled={pageState === 'triggering'}
                  />
                </div>

                <motion.button
                  onClick={() => void handleTrigger()}
                  disabled={pageState === 'triggering' || !!payload.error}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ boxShadow: '0 4px 24px color-mix(in srgb, var(--color-accent) 35%, transparent)' }}
                >
                  {pageState === 'triggering' ? (
                    <>
                      <Spinner size={14} />
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
                </motion.button>
              </>
            )}

            {pageState === 'done' && (
              <motion.div
                className="flex flex-col gap-5"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--tint-ok)' }}>
                      <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5 6.5-7" stroke="var(--color-ok)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-[15px] font-semibold">Workflow triggered</p>
                  </div>
                  <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">
                    <span className="font-medium text-[var(--color-text)]">{workflowName}</span> is now running.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {workflowId && (
                    <Link
                      to={`/workflow/${workflowId}?runId=${runId ?? ''}`}
                      className="pressable flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-[12px] font-semibold text-white hover:opacity-90"
                      style={{ boxShadow: '0 4px 24px color-mix(in srgb, var(--color-accent) 35%, transparent)' }}
                    >
                      Watch the run
                    </Link>
                  )}
                  <button
                    onClick={() => { setPageState('ready'); setRunId(null) }}
                    className="pressable rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[12px] font-medium text-[var(--color-text)] hover:border-[var(--color-border2)]"
                  >
                    Trigger again
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-[var(--color-subtle)]">
          Powered by Flowe · <Link to="/" className="transition-colors hover:text-[var(--color-text)]">Open app</Link>
        </p>
      </motion.div>
    </div>
  )
}
