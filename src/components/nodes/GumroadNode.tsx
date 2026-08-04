import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { get_user: 'Get User', list_products: 'List Products', get_product: 'Get Product', create_product: 'Create Product', update_product: 'Update Product', delete_product: 'Delete Product', enable_product: 'Enable Product', disable_product: 'Disable Product', list_variant_categories: 'List Variant Categories', create_variant_category: 'Create Variant Category', list_variants: 'List Variants', create_variant: 'Create Variant', list_offer_codes: 'List Offer Codes', get_offer_code: 'Get Offer Code', create_offer_code: 'Create Offer Code', update_offer_code: 'Update Offer Code', delete_offer_code: 'Delete Offer Code', list_custom_fields: 'List Custom Fields', create_custom_field: 'Create Custom Field', delete_custom_field: 'Delete Custom Field', list_sales: 'List Sales', get_sale: 'Get Sale', mark_as_shipped: 'Mark As Shipped', refund_sale: 'Refund Sale', list_subscribers: 'List Subscribers', get_subscriber: 'Get Subscriber', verify_license: 'Verify License', enable_license: 'Enable License', list_webhooks: 'List Webhooks', create_webhook: 'Create Webhook', delete_webhook: 'Delete Webhook', disable_license: 'Disable License', decrement_license_uses: 'Decrement License Uses' }

export function GumroadNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_sales'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.gumroad}
      icon={NODE_ICONS.gumroad}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect gumroad in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
