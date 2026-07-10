import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

export function BranchNode({ data, selected }: NodeProps<FlowNode>) {
  const condition = typeof data.condition === 'string' ? data.condition : ''

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.branch}
      icon={NODE_ICONS.branch}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1.5">
        {condition ? (
          <code className="block rounded-md border border-[var(--color-border)] bg-[var(--color-surface2)] px-2 py-1 font-[var(--font-mono)] text-[11px] text-[var(--color-muted)]">
            {condition.slice(0, 60)}{condition.length > 60 ? '…' : ''}
          </code>
        ) : (
          <span className="text-[11px] italic text-[var(--color-subtle)]">No condition set</span>
        )}
      </div>

      <Handle type="target" position={Position.Left} />

      <Handle type="source" position={Position.Right} id="true" style={{ top: '38%' }} />
      <div
        className="micro pointer-events-none absolute text-[var(--color-ok)]"
        style={{ right: '-40px', top: 'calc(38% - 6px)' }}
      >
        True
      </div>

      <Handle type="source" position={Position.Right} id="false" style={{ top: '68%' }} />
      <div
        className="micro pointer-events-none absolute text-[var(--color-fail)]"
        style={{ right: '-44px', top: 'calc(68% - 6px)' }}
      >
        False
      </div>
    </NodeBase2>
  )
}
