import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase } from '@/components/ui/NodeBase'
import { NODE_ACCENT_COLORS, NODE_LABELS } from '@/lib/nodeColors'
import type { FlowNode } from '@/types/workflow'

export function TextOutputNode({ data, selected }: NodeProps<FlowNode>) {
  const output = typeof data.executionOutput === 'string' ? data.executionOutput : ''

  return (
    <NodeBase
      accentColor={NODE_ACCENT_COLORS.textOutput}
      label={data.label}
      typeLabel={NODE_LABELS.textOutput}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      {output ? (
        <pre className="text-[11px] text-emerald-300 leading-relaxed whitespace-pre-wrap break-words max-h-20 overflow-y-auto font-[var(--font-mono)]">
          {output}
        </pre>
      ) : (
        <p className="text-[11px] text-[var(--color-muted)] italic">
          Output will appear here…
        </p>
      )}
      <Handle type="target" position={Position.Left} />
    </NodeBase>
  )
}
