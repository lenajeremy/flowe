import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { search_issues: 'Search Issues (JQL)', get_issue: 'Get Issue', create_issue: 'Create Issue', update_issue: 'Update Issue', delete_issue: 'Delete Issue', assign_issue: 'Assign Issue', transition_issue: 'Transition Issue', list_transitions: 'List Transitions', link_issues: 'Link Issues', add_comment: 'Add Comment', list_comments: 'List Comments', add_worklog: 'Log Work', list_worklogs: 'List Worklogs', add_attachment: 'Add Attachment', list_projects: 'List Projects', get_project: 'Get Project', list_issue_types: 'List Issue Types', search_users: 'Search Users', get_current_user: 'Current User', list_boards: 'List Boards', list_sprints: 'List Sprints', get_sprint_issues: 'Sprint Issues', create_sprint: 'Create Sprint', move_issues_to_sprint: 'Move to Sprint' }

export function JiraNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'search_issues'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.jira}
      icon={NODE_ICONS.jira}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect jira in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
