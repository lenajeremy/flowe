import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_records: 'List Records', get_record: 'Get Record', create_record: 'Create Record', create_records: 'Create Records', update_record: 'Update Record', update_records: 'Update Records', upsert_records: 'Upsert Records', delete_record: 'Delete Record', delete_records: 'Delete Records', list_comments: 'List Comments', create_comment: 'Add Comment', update_comment: 'Update Comment', delete_comment: 'Delete Comment', list_bases: 'List Bases', get_base_schema: 'Base Schema', create_base: 'Create Base', create_table: 'Create Table', update_table: 'Update Table', create_field: 'Create Field', update_field: 'Update Field', list_webhooks: 'List Webhooks', create_webhook: 'Create Webhook', refresh_webhook: 'Refresh Webhook', delete_webhook: 'Delete Webhook', list_webhook_payloads: 'Webhook Payloads', whoami: 'Who Am I' }

export function AirtableNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_records'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.airtable}
      icon={NODE_ICONS.airtable}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect airtable in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
