import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase } from '@/components/ui/NodeBase'
import { NODE_ACCENT_HEX, NODE_ICON_PATHS } from '@/lib/nodeColors'
import type { FlowNode } from '@/types/workflow'

export function ImageInputNode({ data, selected }: NodeProps<FlowNode>) {
  const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl : ''
  const hasUrl = imageUrl.startsWith('http')

  return (
    <NodeBase
      accentHex={NODE_ACCENT_HEX.imageInput}
      iconPath={NODE_ICON_PATHS.imageInput}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      {hasUrl ? (
        <img
          src={imageUrl}
          alt="preview"
          className="w-full h-10 object-cover rounded mb-1"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <p className="text-[11px] text-[var(--color-muted)] italic">No image URL set</p>
      )}
      <Handle type="source" position={Position.Right} />
    </NodeBase>
  )
}
