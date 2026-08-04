import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { create_form: 'Create Form', get_form: 'Get Form', add_question: 'Add Question', update_form_info: 'Update Form Info', set_quiz_mode: 'Set Quiz Mode', delete_item: 'Delete Item', list_responses: 'List Responses', get_response: 'Get Response', set_publish_settings: 'Publish Settings' }

export function GoogleFormsNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'create_form'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.googleforms}
      icon={NODE_ICONS.googleforms}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect googleforms in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
