import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_repositories: 'List Repositories', get_repository: 'Get Repository', create_repository: 'Create Repository', list_pull_requests: 'List Pull Requests', get_pull_request: 'Get Pull Request', create_pull_request: 'Create Pull Request', merge_pull_request: 'Merge Pull Request', decline_pull_request: 'Decline Pull Request', approve_pull_request: 'Approve Pull Request', comment_on_pull_request: 'Comment on PR', list_pr_comments: 'List PR Comments', list_pr_commits: 'List PR Commits', get_pr_diff: 'Get PR Diff', list_branches: 'List Branches', create_branch: 'Create Branch', delete_branch: 'Delete Branch', list_commits: 'List Commits', get_commit: 'Get Commit', get_file: 'Get File', commit_file: 'Commit File', list_issues: 'List Issues', get_issue: 'Get Issue', create_issue: 'Create Issue', comment_on_issue: 'Comment on Issue', list_pipelines: 'List Pipelines', trigger_pipeline: 'Trigger Pipeline', list_workspaces: 'List Workspaces', get_current_user: 'Current User' }

export function BitbucketNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_pull_requests'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.bitbucket}
      icon={NODE_ICONS.bitbucket}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect bitbucket in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
