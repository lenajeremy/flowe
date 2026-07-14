import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { create_issue: 'Create Issue', get_issue: 'Get Issue', update_issue: 'Update Issue', list_issues: 'List Issues', create_comment: 'Comment on Issue', create_merge_request: 'Create MR', merge_mr: 'Merge MR', list_merge_requests: 'List MRs', get_merge_request: 'Get MR', list_branches: 'List Branches', list_commits: 'List Commits', list_pipelines: 'List Pipelines', trigger_pipeline: 'Trigger Pipeline', get_file: 'Read File', commit_file: 'Commit File' }

export function GitlabNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'create_issue'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.gitlab}
      icon={NODE_ICONS.gitlab}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect gitlab in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
