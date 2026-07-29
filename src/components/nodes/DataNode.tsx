import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import { useLiveValue } from '@/lib/dataLive'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = {
  get: 'Get', set: 'Set', increment: 'Increment', delete: 'Delete',
  append: 'Append', query: 'Query', update: 'Update', count: 'Count', clear: 'Clear',
}

export function DataNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.dataOp === 'string' ? data.dataOp : 'get'
  const storeId = typeof data.dataStoreId === 'string' ? data.dataStoreId : ''
  const hasStore = storeId !== ''
  const storeName = typeof data.dataStoreName === 'string' && data.dataStoreName !== '' ? data.dataStoreName : null
  const key = typeof data.dataKey === 'string' ? data.dataKey : ''

  // Live value, pushed whenever any run writes to this store.
  const live = useLiveValue(storeId || undefined, key || undefined)

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
          {key !== '' && <span className="text-[var(--color-muted)]"> · {key}</span>}
        </span>
        <span className="text-[10px] text-[var(--color-muted)]">
          {storeName ?? (hasStore ? 'Persisted store' : 'Pick a store in the sidebar')}
        </span>

        {/* Live value — the key restarts the flash animation on every write */}
        {hasStore && live && (
          <div
            key={live.updatedAt}
            className="data-live mt-0.5 flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-1.5 py-1"
            title={`Current value${key ? ` of ${key}` : ''} — updates live`}
          >
            <span className="h-1 w-1 flex-shrink-0 rounded-full" style={{ background: NODE_ACCENT_HEX.data }} />
            <span className="truncate font-mono text-[10px] text-[var(--color-text)]">{live.text}</span>
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
