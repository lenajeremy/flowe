import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, LoaderCircle, Unplug } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  cancelCodingAgentAuthAttempt,
  disconnectCodingAgent,
  loadCodingAgentAuthAttempt,
  loadCodingAgentRuntimes,
  startCodexConnection,
  type CodingAgentAuthAttempt,
  type CodingAgentRuntimeStatus,
} from '@/lib/codingAgents'

export function CodingAgentConnection() {
  const [runtime, setRuntime] = useState<CodingAgentRuntimeStatus | null>(null)
  const [attempt, setAttempt] = useState<CodingAgentAuthAttempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
	const attemptId = attempt?.id
	const attemptStatus = attempt?.status

  const refresh = useCallback(async () => {
    try {
      const runtimes = await loadCodingAgentRuntimes()
      setRuntime(runtimes.find((item) => item.id === 'codex') ?? null)
    } catch (error) {
      toast.error('Could not load Codex connection', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
	if (!attemptId || !attemptStatus || !['provisioning', 'waiting'].includes(attemptStatus)) return
    let active = true
    const poll = async () => {
      try {
		const next = await loadCodingAgentAuthAttempt(attemptId)
        if (!active) return
        setAttempt(next)
        if (next.status === 'connected') {
          setConnecting(false)
          toast.success('Codex connected')
          await refresh()
        } else if (['failed', 'cancelled', 'expired'].includes(next.status)) {
          setConnecting(false)
        }
      } catch {
        // A short polling failure should not discard the active device code.
      }
    }
    const timer = window.setInterval(() => void poll(), 1000)
    void poll()
    return () => { active = false; window.clearInterval(timer) }
	}, [attemptId, attemptStatus, refresh])

  async function connect() {
    setConnecting(true)
    try {
      setAttempt(await startCodexConnection())
    } catch (error) {
      setConnecting(false)
      toast.error('Could not start Codex sign-in', { description: error instanceof Error ? error.message : undefined })
    }
  }

  async function cancel() {
    if (!attempt) return
    await cancelCodingAgentAuthAttempt(attempt.id).catch(() => {})
    setAttempt(null)
    setConnecting(false)
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-[11px] text-[var(--color-muted)]"><LoaderCircle size={13} className="animate-spin" /> Checking Codex connection…</div>
  }
  if (!runtime?.configured) {
    return (
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 p-3">
        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">Coding agents are not configured</p>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-muted)]">An administrator needs to configure Daytona on the Fernary server before this node can run.</p>
      </div>
    )
  }
  if (runtime.connected) {
    return (
      <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/8 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"><Check size={12} /> Codex connected</p>
            <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">{runtime.credential?.account_label || 'ChatGPT account'}</p>
          </div>
          <button
            type="button"
            title="Disconnect Codex"
            onClick={() => {
              if (!window.confirm('Disconnect Codex? New coding-agent jobs will stop until you reconnect.')) return
              void disconnectCodingAgent('codex').then(refresh).catch((error) => toast.error(error.message))
            }}
            className="rounded-md p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
          ><Unplug size={13} /></button>
        </div>
      </div>
    )
  }
  if (attempt && ['provisioning', 'waiting'].includes(attempt.status)) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] p-3">
        <p className="text-[11px] font-medium">Sign in to Codex</p>
        {attempt.user_code ? (
          <>
            <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-muted)]">Open the secure OpenAI page, then enter this one-time code.</p>
            <button type="button" onClick={() => void navigator.clipboard.writeText(attempt.user_code || '')} className="mt-2 flex w-full items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 font-mono text-[14px] tracking-[0.12em]">
              {attempt.user_code}<Copy size={12} className="text-[var(--color-muted)]" />
            </button>
            {attempt.verification_url && <Button className="mt-2 w-full" onClick={() => window.open(attempt.verification_url, '_blank', 'noopener,noreferrer')}>Open OpenAI <ExternalLink size={13} /></Button>}
          </>
        ) : (
          <p className="mt-2 flex items-center gap-2 text-[10px] text-[var(--color-muted)]"><LoaderCircle size={12} className="animate-spin" /> Preparing a secure sign-in code…</p>
        )}
        <button type="button" onClick={() => void cancel()} className="mt-2 text-[10px] text-[var(--color-muted)] hover:text-[var(--color-text)]">Cancel</button>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] p-3">
      <p className="text-[11px] font-medium">Connect your Codex subscription</p>
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-muted)]">You will sign in on OpenAI using a short-lived device code. Fernary never asks for your password.</p>
      {attempt?.last_error && <p className="mt-2 text-[10px] leading-relaxed text-red-500">{attempt.last_error}</p>}
      <Button className="mt-3 w-full" onClick={() => void connect()} disabled={connecting}>{connecting && <LoaderCircle size={13} className="animate-spin" />} Connect Codex</Button>
    </div>
  )
}
