import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase } from '@/components/ui/NodeBase'
import { NODE_ACCENT_HEX, NODE_ICON_PATHS } from '@/lib/nodeColors'
import type { FlowNode } from '@/types/workflow'

export function BranchNode({ data, selected }: NodeProps<FlowNode>) {
  const condition = typeof data.condition === 'string' ? data.condition : ''

  return (
    <NodeBase
      accentHex={NODE_ACCENT_HEX.branch}
      iconPath={NODE_ICON_PATHS.branch}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1.5">
        {condition ? (
          <code className="text-[11px] text-amber-600 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 block font-[var(--font-mono)]">
            {condition.slice(0, 60)}{condition.length > 60 ? '…' : ''}
          </code>
        ) : (
          <span className="text-[11px] text-[var(--color-muted)] italic">No condition set</span>
        )}
      </div>

      <Handle type="target" position={Position.Left} />

      <Handle type="source" position={Position.Right} id="true" style={{ top: '35%' }} />
      <div
        className="absolute text-[9px] font-medium text-[var(--color-node-output)] pointer-events-none"
        style={{ right: '-24px', top: 'calc(35% - 6px)' }}
      >
        T
      </div>

      <Handle type="source" position={Position.Right} id="false" style={{ top: '65%' }} />
      <div
        className="absolute text-[9px] font-medium text-red-500 pointer-events-none"
        style={{ right: '-24px', top: 'calc(65% - 6px)' }}
      >
        F
      </div>
    </NodeBase>
  )
}
