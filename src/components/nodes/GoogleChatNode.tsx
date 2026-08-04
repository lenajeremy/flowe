import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_spaces: 'List Spaces', get_space: 'Get Space', create_space: 'Create Space', setup_space: 'Create Space with Members', update_space: 'Update Space', delete_space: 'Delete Space', find_direct_message: 'Find Direct Message', send_message: 'Send Message', reply_in_thread: 'Reply in Thread', get_message: 'Get Message', update_message: 'Update Message', delete_message: 'Delete Message', list_messages: 'List Messages', add_reaction: 'Add Reaction', list_members: 'List Members', add_member: 'Add Member', remove_member: 'Remove Member' }

export function GoogleChatNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'send_message'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.googlechat}
      icon={NODE_ICONS.googlechat}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect googlechat in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
