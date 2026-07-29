import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = {
  get: 'Get', set: 'Set', increment: 'Increment', delete: 'Delete',
  append: 'Append', query: 'Query', update: 'Update', count: 'Count', clear: 'Clear',
}

export function DataNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.dataOp === 'string' ? data.dataOp : 'get'
  const hasStore = typeof data.dataStoreId === 'string' && data.dataStoreId !== ''
  const storeName = typeof data.dataStoreName === 'string' && data.dataStoreName !== '' ? data.dataStoreName : null

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.data}
      icon={NODE_ICONS.data}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">
          {OP_LABELS[op] ?? op}
          {typeof data.dataKey === 'string' && data.dataKey !== '' && (
            <span className="text-[var(--color-muted)]"> · {data.dataKey}</span>
          )}
        </span>
        <span className="text-[10px] text-[var(--color-muted)]">
          {storeName ?? (hasStore ? 'Persisted store' : 'Pick a store in the sidebar')}
        </span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
