import { useEffect, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import { IntegrationLogo } from '@/components/IntegrationLogo'
import { isIntegration } from '@/lib/integrationLogos'
import type { FlowNode, NodeType } from '@/types/workflow'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

// "When a pull request opens, run this."
//
// The card's job is to answer three questions at a glance: what is it watching,
// is it actually live, and — when nothing has happened for a while — is that
// because nothing happened or because the trigger is broken. The last one is why
// the health line exists; a trigger that has quietly stopped working looks
// identical to a quiet week without it.

interface ServerTrigger {
  id: string
  node_id: string
  provider: string
  event: string
  resource_label: string
  enabled: boolean
  last_event_at?: string
  last_error?: string
  delivery: string
}

// Human phrasing for the ids the registry uses. Unknown ids fall back to the
// raw id rather than rendering blank — a new adapter should look unpolished,
// not broken.
const EVENT_LABELS: Record<string, string> = {
  'pull_request.opened': 'Pull request opened',
  'pull_request.merged': 'Pull request merged',
  'issues.opened': 'Issue opened',
  'issues.edited': 'Issue edited',
  'issue_comment.created': 'Comment added',
  push: 'Commits pushed',
  'release.published': 'Release published',
}

function sinceLabel(iso?: string): string | null {
  if (!iso) return null
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 90) return 'just now'
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`
  return `${Math.round(secs / 86400)}d ago`
}

export function IntegrationTriggerNode({ id, data, selected }: NodeProps<FlowNode>) {
  const [server, setServer] = useState<ServerTrigger | null>(null)
  const { tabs, activeTabId } = useWorkflowStore(
    useShallow((s) => ({ tabs: s.tabs, activeTabId: s.activeTabId })),
  )
  const dbId = tabs.find((t) => t.id === activeTabId)?.dbId

  // The canvas holds what the user picked; the server holds whether a hook was
  // actually registered and what it has heard since. Both are needed — the first
  // renders instantly, the second is the truth.
  useEffect(() => {
    if (!dbId) return
    apiFetch(`${API}/api/workflows/${dbId}/triggers`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { triggers: ServerTrigger[] }) => {
        const mine = d.triggers?.find((trigger) => trigger.node_id === id)
        setServer(mine ?? null)
      })
      .catch(() => setServer(null))
  }, [dbId, id])

  const provider = data.triggerProvider ?? server?.provider
  const event = data.triggerEvent ?? server?.event
  const resource = data.triggerResourceId ?? server?.resource_label
  const live = !!server && server.enabled && !server.last_error
  const fired = sinceLabel(server?.last_event_at)

  // Once an app is chosen the node wears that app's mark. A row of identical
  // generic trigger glyphs tells you nothing at a glance; the Slack logo tells
  // you what this workflow listens to without reading a word.
  const branded = provider && isIntegration(provider as NodeType)

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.integrationTrigger}
      icon={branded
        ? <IntegrationLogo type={provider as NodeType} size={16} />
        : NODE_ICONS.integrationTrigger}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex min-w-[200px] flex-col gap-1.5">
        {provider && event ? (
          <>
            {/* The logo has moved up to the node's own icon, so the line here
                is just the event — repeating the mark would be noise. */}
            <span className="text-[11px] font-medium leading-snug text-[var(--na-integrationTrigger)]">
              {EVENT_LABELS[event] ?? event}
            </span>
            {resource && (
              <div className="truncate font-mono text-[9.5px] text-[var(--color-muted)]">
                {resource}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide ${
                  live
                    ? 'bg-[var(--na-integrationTrigger)]/15 text-[var(--na-integrationTrigger)]'
                    : 'bg-[var(--color-hover2)] text-[var(--color-muted)]'
                }`}
              >
                {live ? 'Listening' : server ? 'Paused' : 'Not connected'}
              </span>
              {fired && <span className="text-[9px] text-[var(--color-muted)]">Fired {fired}</span>}
            </div>
            {/* The whole point of the health line: say what went wrong rather
                than leaving a trigger that looks fine and never fires. */}
            {server?.last_error && (
              <div className="text-[9px] leading-snug text-[#f87171]">{server.last_error}</div>
            )}
          </>
        ) : (
          <div className="text-[10px] italic text-[var(--color-muted)]">
            {dbId ? 'Pick an app and an event' : 'Save workflow first'}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
