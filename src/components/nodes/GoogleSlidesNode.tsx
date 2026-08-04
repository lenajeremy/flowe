import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { create_presentation: 'Create Presentation', get_presentation: 'Get Presentation', list_slides: 'List Slides', add_slide: 'Add Slide', duplicate_slide: 'Duplicate Slide', delete_slide: 'Delete Slide', delete_object: 'Delete Object', replace_all_text: 'Replace All Text', add_text_box: 'Add Text Box', add_image: 'Add Image', update_speaker_notes: 'Speaker Notes', get_thumbnail: 'Get Thumbnail', create_from_template: 'From Template' }

export function GoogleSlidesNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'create_presentation'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.googleslides}
      icon={NODE_ICONS.googleslides}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect googleslides in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
