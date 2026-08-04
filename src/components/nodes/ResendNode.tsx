import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { send_email: 'Send Email', send_batch: 'Send Batch', get_email: 'Get Email', list_sent_emails: 'List Sent', list_received_emails: 'List Received', get_received_email: 'Get Received', reschedule_email: 'Reschedule', cancel_email: 'Cancel Scheduled', list_domains: 'List Domains', get_domain: 'Get Domain', create_domain: 'Add Domain', verify_domain: 'Verify Domain', delete_domain: 'Delete Domain', create_contact: 'Create Contact', get_contact: 'Get Contact', update_contact: 'Update Contact', list_contacts: 'List Contacts', delete_contact: 'Delete Contact', add_contact_to_segment: 'Add to Segment', remove_contact_from_segment: 'Remove from Segment', list_contact_segments: 'Contact Segments', create_segment: 'Create Segment', list_segments: 'List Segments', get_segment: 'Get Segment', delete_segment: 'Delete Segment', list_segment_contacts: 'Segment Contacts', create_broadcast: 'Create Broadcast', list_broadcasts: 'List Broadcasts', get_broadcast: 'Get Broadcast', send_broadcast: 'Send Broadcast', delete_broadcast: 'Delete Broadcast', get_broadcast_metrics: 'Broadcast Metrics', create_template: 'Create Template', list_templates: 'List Templates', get_template: 'Get Template', publish_template: 'Publish Template', delete_template: 'Delete Template', add_suppression: 'Add Suppression', list_suppressions: 'List Suppressions', remove_suppression: 'Remove Suppression', list_webhooks: 'List Webhooks', create_webhook: 'Create Webhook', delete_webhook: 'Delete Webhook', list_logs: 'List Logs', list_api_keys: 'List API Keys' }

export function ResendNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'send_email'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.resend}
      icon={NODE_ICONS.resend}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect resend in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
