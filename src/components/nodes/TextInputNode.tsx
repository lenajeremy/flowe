import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

export function TextInputNode({ data, selected }: NodeProps<FlowNode>) {
  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.textInput}
      icon={NODE_ICONS.textInput}
      label={data.label}
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
    </NodeBase2>
  )
}
