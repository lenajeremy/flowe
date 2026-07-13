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

      {/* Two outcome sockets, each with a colored chip so it's obvious which
          edge fires when the condition is true vs false. */}
      <Handle type="source" position={Position.Right} id="true" className="handle-true" style={{ top: '38%' }} />
      <div
        className="micro pointer-events-none absolute flex items-center gap-1 rounded-full px-1.5 py-0.5"
        style={{ right: '-52px', top: 'calc(38% - 9px)', color: 'var(--color-ok)', background: 'var(--tint-ok)' }}
      >
        <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
          <path d="M1 4.5 3 6.5 7 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        true
      </div>

      <Handle type="source" position={Position.Right} id="false" className="handle-false" style={{ top: '68%' }} />
      <div
        className="micro pointer-events-none absolute flex items-center gap-1 rounded-full px-1.5 py-0.5"
        style={{ right: '-56px', top: 'calc(68% - 9px)', color: 'var(--color-fail)', background: 'var(--tint-fail)' }}
      >
        <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        false
      </div>
    </NodeBase2>
  )
}
