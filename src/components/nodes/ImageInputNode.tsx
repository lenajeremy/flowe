import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX, NODE_ICON_PATHS } from '@/lib/nodeColors'
import type { FlowNode } from '@/types/workflow'

export function ImageInputNode({ data, selected }: NodeProps<FlowNode>) {
  const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl : ''
  const hasImage = imageUrl.startsWith('data:image/') || imageUrl.startsWith('http')

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.imageInput}
      iconPath={NODE_ICON_PATHS.imageInput}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      {hasImage ? (
        <img
          src={imageUrl}
          alt="preview"
          className="w-full h-16 object-cover rounded-lg"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[var(--color-muted)]">
            <rect x="1" y="2" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="4" cy="5" r="1" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M1 8l2.5-2.5L5 7l2-2 4 3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
          <p className="text-[11px] text-[var(--color-muted)] italic">No image — configure in sidebar</p>
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
