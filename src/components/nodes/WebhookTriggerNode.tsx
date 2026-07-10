import { useState, useEffect } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { API } from '@/lib/config'

export function WebhookTriggerNode({ data, selected }: NodeProps<FlowNode>) {
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null)
  const { tabs, activeTabId } = useWorkflowStore(
    useShallow((s) => ({ tabs: s.tabs, activeTabId: s.activeTabId })),
  )
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const dbId = activeTab?.dbId

  useEffect(() => {
    if (!dbId) return
    fetch(`${API}/api/workflows/${dbId}/webhook`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((wh: { token: string }) => {
        setWebhookUrl(`${window.location.origin}/trigger/${wh.token}`)
      })
      .catch(() => {})
  }, [dbId])

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.webhookTrigger}
      icon={NODE_ICONS.webhookTrigger}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[180px]">
        <div className="text-[10px] text-[var(--color-muted)]">Webhook URL</div>
        {webhookUrl ? (
          <div
            className="cursor-pointer truncate font-mono text-[10px] text-[var(--color-accent)] hover:opacity-80"
            title="Click to copy"
            onClick={() => void navigator.clipboard.writeText(webhookUrl)}
          >
            {webhookUrl.replace(window.location.origin, '')}
          </div>
        ) : (
          <div className="text-[10px] text-[var(--color-muted)]">
            {dbId ? 'Loading…' : 'Save workflow first'}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
