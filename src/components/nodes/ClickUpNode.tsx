import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_tasks: 'List Tasks', search_tasks: 'Search Tasks', get_task: 'Get Task', create_task: 'Create Task', update_task: 'Update Task', delete_task: 'Delete Task', list_comments: 'List Comments', create_comment: 'Add Comment', update_comment: 'Update Comment', delete_comment: 'Delete Comment', create_checklist: 'Create Checklist', create_checklist_item: 'Add Checklist Item', update_checklist_item: 'Update Item', delete_checklist: 'Delete Checklist', list_space_tags: 'List Tags', add_tag_to_task: 'Add Tag', remove_tag_from_task: 'Remove Tag', list_custom_fields: 'Custom Fields', set_custom_field_value: 'Set Field', remove_custom_field_value: 'Clear Field', add_dependency: 'Add Dependency', delete_dependency: 'Remove Dependency', link_tasks: 'Link Tasks', unlink_tasks: 'Unlink Tasks', list_time_entries: 'Time Entries', create_time_entry: 'Log Time', get_running_timer: 'Running Timer', start_timer: 'Start Timer', stop_timer: 'Stop Timer', list_workspaces: 'List Workspaces', list_spaces: 'List Spaces', get_space: 'Get Space', list_folders: 'List Folders', list_lists: 'List Lists', get_list: 'Get List', create_list: 'Create List', list_attachments: 'Attachments', list_goals: 'List Goals', create_goal: 'Create Goal', list_list_members: 'List Members', list_task_members: 'Task Members', list_views: 'List Views', list_webhooks: 'List Webhooks', create_webhook: 'Create Webhook', delete_webhook: 'Delete Webhook', get_authorized_user: 'Authorized User' }

export function ClickUpNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_tasks'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.clickup}
      icon={NODE_ICONS.clickup}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect clickup in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
