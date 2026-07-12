import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { send_email: 'Send Email', list_messages: 'List Messages', get_message: 'Get Message', create_event: 'Create Event' }

export function OutlookNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'send_email'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.outlook}
      icon={NODE_ICONS.outlook}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect Outlook in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
