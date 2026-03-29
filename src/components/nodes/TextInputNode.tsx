import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase } from '@/components/ui/NodeBase'
import { NODE_ACCENT_COLORS, NODE_LABELS } from '@/lib/nodeColors'
import type { FlowNode } from '@/types/workflow'

export function TextInputNode({ data, selected }: NodeProps<FlowNode>) {
  return (
    <NodeBase
      accentColor={NODE_ACCENT_COLORS.textInput}
      label={data.label}
      typeLabel={NODE_LABELS.textInput}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <p className="text-[11px] text-[var(--color-muted)] line-clamp-2 leading-relaxed min-h-[16px]">
        {data.defaultValue
          ? String(data.defaultValue)
          : <span className="italic opacity-50">No default value</span>
        }
      </p>
      <Handle type="source" position={Position.Right} />
    </NodeBase>
  )
}
