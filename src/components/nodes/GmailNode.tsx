import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { send_email: 'Send Email', reply_to_message: 'Reply to Message', list_messages: 'List Messages', get_message: 'Get Message', get_thread: 'Get Thread', create_draft: 'Create Draft', list_drafts: 'List Drafts', send_draft: 'Send Draft', list_labels: 'List Labels', create_label: 'Create Label', add_label: 'Add Label', remove_label: 'Remove Label', mark_read: 'Mark as Read', mark_unread: 'Mark as Unread', archive_message: 'Archive Message', trash_message: 'Move to Trash' }

export function GmailNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'send_email'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.gmail}
      icon={NODE_ICONS.gmail}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect gmail in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
