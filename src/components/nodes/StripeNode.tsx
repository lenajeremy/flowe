import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_customers: 'List Customers', create_customer: 'Create Customer', get_customer: 'Get Customer', list_payments: 'List Payments', get_payment_intent: 'Get Payment', list_invoices: 'List Invoices', get_invoice: 'Get Invoice', list_subscriptions: 'List Subscriptions', get_subscription: 'Get Subscription', cancel_subscription: 'Cancel Subscription', list_products: 'List Products', create_product: 'Create Product', create_price: 'Create Price', create_payment_link: 'Payment Link', create_refund: 'Create Refund', list_refunds: 'List Refunds', get_balance: 'Get Balance', list_events: 'Account Events' }

export function StripeNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_customers'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.stripe}
      icon={NODE_ICONS.stripe}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect stripe in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
