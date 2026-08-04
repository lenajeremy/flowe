import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_conversations: 'List Conversations', search_conversations: 'Search Conversations', get_conversation: 'Get Conversation', update_conversation: 'Update Conversation', assign_conversation: 'Assign Conversation', list_conversation_messages: 'List Conversation Messages', send_message: 'Send Message', reply_to_conversation: 'Reply To Conversation', create_draft: 'Create Draft', add_comment: 'Add Comment', list_comments: 'List Comments', list_tags: 'List Tags', add_tags: 'Add Tags', remove_tags: 'Remove Tags', create_tag: 'Create Tag', list_contacts: 'List Contacts', get_contact: 'Get Contact', create_contact: 'Create Contact', update_contact: 'Update Contact', delete_contact: 'Delete Contact', add_contact_handle: 'Add Contact Handle', list_inboxes: 'List Inboxes', list_channels: 'List Channels', list_teammates: 'List Teammates', get_teammate: 'Get Teammate', list_teams: 'List Teams', list_accounts: 'List Accounts', list_events: 'List Events', list_links: 'List Links', create_link: 'Create Link', link_conversation: 'Link Conversation' }

export function FrontNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_conversations'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.front}
      icon={NODE_ICONS.front}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect front in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
