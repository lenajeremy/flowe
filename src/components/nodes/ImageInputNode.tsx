import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase } from '@/components/ui/NodeBase'
import { NODE_ACCENT_COLORS, NODE_LABELS } from '@/lib/nodeColors'
import type { FlowNode } from '@/types/workflow'

export function ImageInputNode({ data, selected }: NodeProps<FlowNode>) {
  const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl : ''
  const hasUrl = imageUrl.startsWith('http')

  return (
    <NodeBase
      accentColor={NODE_ACCENT_COLORS.imageInput}
      label={data.label}
      typeLabel={NODE_LABELS.imageInput}
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
