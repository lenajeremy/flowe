import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase } from '@/components/ui/NodeBase'
import { NODE_ACCENT_HEX, NODE_ICON_PATHS } from '@/lib/nodeColors'
import type { FlowNode } from '@/types/workflow'

export function TextOutputNode({ data, selected }: NodeProps<FlowNode>) {
  const output = typeof data.executionOutput === 'string' ? data.executionOutput : ''

  return (
    <NodeBase
      accentHex={NODE_ACCENT_HEX.textOutput}
      iconPath={NODE_ICON_PATHS.textOutput}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      {output ? (
        <pre className="text-[11px] text-[var(--color-node-output)] leading-relaxed whitespace-pre-wrap break-words max-h-20 overflow-y-auto font-[var(--font-mono)]">
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
