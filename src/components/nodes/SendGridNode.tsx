import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { send_email: 'Send Email', upsert_contact: 'Upsert Contact', get_import_status: 'Check Import', search_contacts: 'Search Contacts', get_contact: 'Get Contact', list_contacts: 'List Contacts', delete_contact: 'Delete Contact', get_contact_count: 'Contact Count', list_lists: 'List Lists', create_list: 'Create List', get_list: 'Get List', update_list: 'Rename List', delete_list: 'Delete List', remove_contacts_from_list: 'Remove from List', list_segments: 'List Segments', get_segment: 'Get Segment', create_segment: 'Create Segment', delete_segment: 'Delete Segment', list_single_sends: 'List Single Sends', get_single_send: 'Get Single Send', create_single_send: 'Create Single Send', schedule_single_send: 'Schedule Send', delete_single_send: 'Delete Single Send', list_templates: 'List Templates', get_template: 'Get Template', create_template: 'Create Template', delete_template: 'Delete Template', list_bounces: 'List Bounces', delete_bounce: 'Delete Bounce', list_blocks: 'List Blocks', list_spam_reports: 'Spam Reports', list_invalid_emails: 'Invalid Emails', list_global_unsubscribes: 'List Unsubscribes', add_global_unsubscribe: 'Add Unsubscribe', delete_global_unsubscribe: 'Remove Unsubscribe', get_stats: 'Delivery Stats', list_verified_senders: 'Verified Senders', list_custom_fields: 'Custom Fields', create_custom_field: 'Create Custom Field', get_account: 'Account Profile', list_key_scopes: 'Key Scopes' }

export function SendGridNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'send_email'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.sendgrid}
      icon={NODE_ICONS.sendgrid}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect sendgrid in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
