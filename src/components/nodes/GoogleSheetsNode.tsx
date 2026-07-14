import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { read_range: 'Read Range', append_row: 'Append Row', append_rows: 'Append Rows', update_range: 'Update Range', clear_range: 'Clear Range', find_replace: 'Find & Replace', list_sheets: 'List Sheet Tabs', add_sheet: 'Add Sheet Tab', delete_sheet: 'Delete Sheet Tab', delete_rows: 'Delete Rows', create_spreadsheet: 'Create Spreadsheet' }

export function GoogleSheetsNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'read_range'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.googlesheets}
      icon={NODE_ICONS.googlesheets}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect Google Sheets in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
