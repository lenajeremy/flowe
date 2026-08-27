import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { ExecutionEvent } from '@/types/workflow'
import { getCodingAgentToolActivity } from '@/lib/codingAgentActivity'
import {
  approveCodingAgentToolCall,
  loadCodingAgentToolCall,
  reconcileCodingAgentToolCall,
  rejectCodingAgentToolCall,
  type CodingAgentToolCall,
} from '@/lib/codingAgents'
import { Button } from '@/components/ui/button'

export function CodingAgentToolActivity({ event }: { event: ExecutionEvent }) {
  const activity = getCodingAgentToolActivity(event)
  const [call, setCall] = useState<CodingAgentToolCall | null>(null)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!activity?.toolCallId) return
    let active = true
    let timer: number | undefined
    const refresh = async () => {
      try {
        const current = await loadCodingAgentToolCall(activity.toolCallId!)
        if (!active) return
        setCall(current)
        if (current.status === 'pending_approval' || current.status === 'approved' || current.status === 'executing') {
          timer = window.setTimeout(() => void refresh(), 1500)
        }
      } catch {
        // The historical event still has useful details if the live row can no
        // longer be loaded; an explicit action will surface an API error.
      }
    }
    void refresh()
    return () => {
      active = false
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [activity?.toolCallId])

  if (!activity) return null

  async function resolve(approve: boolean) {
    if (!activity?.toolCallId) return
    setWorking(true)
    try {
      const updated = approve
        ? await approveCodingAgentToolCall(activity.toolCallId)
        : await rejectCodingAgentToolCall(activity.toolCallId)
      setCall(updated)
    } catch (error) {
      toast.error(`Could not ${approve ? 'approve' : 'reject'} the tool call`, {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setWorking(false)
    }
  }

  async function reconcile(outcome: 'completed' | 'not_completed') {
    if (!activity?.toolCallId) return
    setWorking(true)
    try {
      setCall(await reconcileCodingAgentToolCall(activity.toolCallId, outcome))
    } catch (error) {
      toast.error('Could not reconcile the tool call', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setWorking(false)
    }
  }

  const status = call?.status
  const reason = call?.reason || activity.reason
  const effectiveConfig = call?.effective_config ?? activity.effectiveConfig

  return (
    <div className="mt-1.5 rounded border border-[var(--color-border)] bg-[var(--color-canvas)] p-2 text-[10px]" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-center gap-2">
        <span className="font-medium">{call?.node_label || activity.nodeLabel || 'Workflow tool'}{(call?.operation || activity.operation) ? ` · ${call?.operation || activity.operation}` : ''}</span>
        {(call?.effect || activity.effect) && <span className="ml-auto rounded bg-[var(--color-surface2)] px-1 py-0.5">{call?.effect || activity.effect}</span>}
      </div>
      {status && <p className="mt-1 capitalize text-[var(--color-muted)]">{status.replaceAll('_', ' ')}</p>}
      {reason && <p className="mt-1 leading-relaxed"><span className="text-[var(--color-muted)]">Why:</span> {reason}</p>}
      {(effectiveConfig !== undefined || activity.arguments !== undefined) && (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-[var(--color-muted)]">Effective configuration (secrets redacted)</summary>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-black/10 p-1.5 text-[9px]">{JSON.stringify(effectiveConfig ?? activity.arguments, null, 2)}</pre>
        </details>
      )}
      {activity.result && <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[9px] text-[var(--color-muted)]">{activity.result}</pre>}
      {(call?.last_error || activity.error) && <p className="mt-1.5 text-red-400">{call?.last_error || activity.error}</p>}
      {activity.type === 'tool_approval_requested' && activity.toolCallId && status === 'pending_approval' && (
        <div className="mt-2 flex gap-1.5">
          <Button size="xs" disabled={working} onClick={() => void resolve(true)}>Approve once</Button>
          <Button size="xs" variant="outline" disabled={working} onClick={() => void resolve(false)}>Reject</Button>
        </div>
      )}
      {status === 'outcome_unknown' && (
        <div className="mt-2">
          <p className="mb-1.5 text-amber-600 dark:text-amber-300">Check the target system first. Fernary will not retry this action while it is unresolved.</p>
          <div className="flex gap-1.5">
            <Button size="xs" disabled={working} onClick={() => void reconcile('completed')}>It completed</Button>
            <Button size="xs" variant="outline" disabled={working} onClick={() => void reconcile('not_completed')}>It did not complete</Button>
          </div>
        </div>
      )}
    </div>
  )
}
