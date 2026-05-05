import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase } from '@/components/ui/NodeBase'
import { NODE_ACCENT_HEX, NODE_ICON_PATHS } from '@/lib/nodeColors'
import type { FlowNode } from '@/types/workflow'

export function LoopNode({ data, selected }: NodeProps<FlowNode>) {
  const loopOverField = typeof data.loopOverField === 'string' ? data.loopOverField : ''
  const mode = data.mode === 'concurrent' ? 'concurrent' : 'sequential'

  return (
    <NodeBase
      accentHex={NODE_ACCENT_HEX.loop}
      iconPath={NODE_ICON_PATHS.loop}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] text-[var(--color-muted)]">
          Over: <span className="text-[var(--color-text)] font-medium">{loopOverField || '—'}</span>
        </p>
        <span className={`inline-flex w-fit text-[10px] px-1.5 py-0.5 rounded font-medium ${
          mode === 'concurrent'
            ? 'bg-[var(--color-node-loop)]/15 text-[var(--color-node-loop)] border border-[var(--color-node-loop)]/20'
            : 'bg-[var(--color-surface2)] text-[var(--color-muted)] border border-[var(--color-border)]'
        }`}>
          {mode}
        </span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase>
  )
}
