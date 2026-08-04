import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { create_subscriber: 'Create Subscriber', list_subscribers: 'Find Subscribers', get_subscriber: 'Get Subscriber', update_subscriber: 'Update Subscriber', unsubscribe: 'Unsubscribe', get_subscriber_stats: 'Subscriber Stats', list_subscriber_tags: "Subscriber's Tags", list_tags: 'List Tags', create_tag: 'Create Tag', rename_tag: 'Rename Tag', tag_subscriber: 'Tag Subscriber', untag_subscriber: 'Remove Tag', list_tag_subscribers: 'Tagged Subscribers', list_forms: 'List Forms', add_subscriber_to_form: 'Add to Form', list_form_subscribers: 'Form Subscribers', list_sequences: 'List Sequences', get_sequence: 'Get Sequence', create_sequence: 'Create Sequence', add_subscriber_to_sequence: 'Add to Sequence', list_sequence_subscribers: 'Sequence Subscribers', list_broadcasts: 'List Broadcasts', get_broadcast: 'Get Broadcast', create_broadcast: 'Create Broadcast', update_broadcast: 'Update Broadcast', delete_broadcast: 'Delete Broadcast', get_broadcast_stats: 'Broadcast Stats', get_broadcast_link_clicks: 'Link Clicks', list_custom_fields: 'Custom Fields', create_custom_field: 'Create Field', delete_custom_field: 'Delete Field', list_purchases: 'List Purchases', get_purchase: 'Get Purchase', create_purchase: 'Record Purchase', list_webhooks: 'List Webhooks', create_webhook: 'Create Webhook', delete_webhook: 'Delete Webhook', list_segments: 'List Segments', list_email_templates: 'Email Templates', get_account: 'Account', get_email_stats: 'Email Stats', get_growth_stats: 'Growth Stats' }

export function KitNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'create_subscriber'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.kit}
      icon={NODE_ICONS.kit}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect kit in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
