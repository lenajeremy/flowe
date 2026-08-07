import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = {
  list_workspaces: 'List Workspaces', list_projects: 'List Projects', list_sections: 'List Sections',
  list_tasks: 'List Tasks', get_task: 'Get Task', create_task: 'Create Task',
  create_subtask: 'Create Subtask', update_task: 'Update Task', delete_task: 'Delete Task',
  add_comment: 'Add Comment', list_comments: 'List Comments', add_task_to_project: 'Add to Project',
}

export function AsanaNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_tasks'
  return (
    <NodeBase2 accentHex={NODE_ACCENT_HEX.asana} icon={NODE_ICONS.asana} label={data.label}
      isSelected={selected ?? false} executionStatus={data.executionStatus}>
      <div className="flex min-w-[160px] flex-col gap-1">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect Asana in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
