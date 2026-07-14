import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_orders: 'List Orders', get_order: 'Get Order', cancel_order: 'Cancel Order', close_order: 'Close Order', list_products: 'List Products', get_product: 'Get Product', create_product: 'Create Product', update_product: 'Update Product', delete_product: 'Delete Product', list_customers: 'List Customers', get_customer: 'Get Customer', search_customers: 'Search Customers', create_customer: 'Create Customer', create_draft_order: 'Create Draft Order', list_draft_orders: 'List Draft Orders', list_locations: 'List Locations', adjust_inventory: 'Adjust Inventory', create_discount_code: 'Discount Code' }

export function ShopifyNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_orders'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.shopify}
      icon={NODE_ICONS.shopify}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect shopify in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
