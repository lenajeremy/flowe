import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { send_email: 'Send Email', reply_to_message: 'Reply to Message', forward_message: 'Forward Message', create_draft: 'Create Draft', list_messages: 'List Messages', get_message: 'Get Message', move_message: 'Move Message', mark_read: 'Mark as Read', flag_message: 'Flag Message', delete_message: 'Delete Message', list_folders: 'List Folders', create_event: 'Create Event', list_events: 'List Events', update_event: 'Update Event', delete_event: 'Delete Event', respond_to_event: 'Respond to Event', list_contacts: 'List Contacts', create_contact: 'Create Contact' }

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
