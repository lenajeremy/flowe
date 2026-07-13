import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { send_message: 'Send Message', send_dm: 'Send DM', reply_in_thread: 'Reply in Thread', update_message: 'Update Message', delete_message: 'Delete Message', schedule_message: 'Schedule Message', add_reaction: 'Add Reaction', pin_message: 'Pin Message', upload_file: 'Upload File', create_channel: 'Create Channel', archive_channel: 'Archive Channel', join_channel: 'Join Channel', invite_to_channel: 'Invite to Channel', set_channel_topic: 'Set Channel Topic', list_channels: 'List Channels', get_channel_history: 'Conversation History', list_users: 'List Users', get_user_by_email: 'Find User by Email', search_messages: 'Search Messages' }

export function SlackNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'send_message'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.slack}
      icon={NODE_ICONS.slack}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect Slack in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
