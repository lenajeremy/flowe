import { useState, useEffect } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase } from '@/components/ui/NodeBase'
import { NODE_ACCENT_HEX, NODE_ICON_PATHS } from '@/lib/nodeColors'
import type { FlowNode } from '@/types/workflow'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'

export function WebhookTriggerNode({ data, selected }: NodeProps<FlowNode>) {
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null)
  const { tabs, activeTabId } = useWorkflowStore(
    useShallow((s) => ({ tabs: s.tabs, activeTabId: s.activeTabId })),
  )
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const dbId = activeTab?.dbId

  useEffect(() => {
    if (!dbId) return
    fetch(`/api/workflows/${dbId}/webhook`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((wh: { token: string }) => {
        setWebhookUrl(`${window.location.origin}/trigger/${wh.token}`)
      })
      .catch(() => {})
  }, [dbId])

  return (
    <NodeBase
      accentHex={NODE_ACCENT_HEX.webhookTrigger}
      iconPath={NODE_ICON_PATHS.webhookTrigger}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[180px]">
        <div className="text-[10px] text-[var(--color-muted)]">Webhook URL</div>
        {webhookUrl ? (
          <div
            className="text-[10px] font-mono text-emerald-400 truncate cursor-pointer hover:text-emerald-300"
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
    </NodeBase>
  )
}
