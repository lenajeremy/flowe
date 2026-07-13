import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { JsonView } from '@/components/ui/JsonView'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

export function TextOutputNode({ data, selected }: NodeProps<FlowNode>) {
  const output = typeof data.executionOutput === 'string' ? data.executionOutput : ''

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.textOutput}
      icon={NODE_ICONS.textOutput}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      {output ? (
        <JsonView className="max-h-20 overflow-y-auto text-[11px] leading-relaxed text-[var(--color-node-output)]" raw={output} />
      ) : (
        <p className="text-[11px] text-[var(--color-muted)] italic">
          Output will appear here…
        </p>
      )}
      <Handle type="target" position={Position.Left} />
    </NodeBase2>
  )
}
