import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { create_issue: 'Create Issue', get_issue: 'Get Issue', update_issue: 'Update Issue', list_issues: 'List Issues', search_issues: 'Search Issues', create_comment: 'Comment on Issue', create_pull_request: 'Create PR', merge_pull_request: 'Merge PR', list_pull_requests: 'List PRs', get_pull_request: 'Get PR', list_pr_files: 'List PR Files', list_commits: 'List Commits', list_branches: 'List Branches', get_file: 'Read File', create_or_update_file: 'Commit File', list_releases: 'List Releases', create_release: 'Create Release', trigger_workflow: 'Trigger Workflow', list_workflow_runs: 'List Workflow Runs', list_repos: 'List Repos' }

export function GithubNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'create_issue'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.github}
      icon={NODE_ICONS.github}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect github in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
