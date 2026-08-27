import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_projects: 'List Projects', get_project: 'Get Project', list_issues: 'List Issues', get_issue: 'Get Issue', get_latest_event: 'Get Latest Event', list_issue_events: 'List Issue Events', list_issue_tag_values: 'List Tag Values', resolve_issue: 'Resolve Issue', ignore_issue: 'Archive Issue', unresolve_issue: 'Reopen Issue', assign_issue: 'Assign Issue', delete_issue: 'Delete Issue', list_comments: 'List Comments', add_comment: 'Add Comment', list_releases: 'List Releases', create_release: 'Create Release', create_deploy: 'Create Deploy', query_events: 'Query Events', list_alert_rules: 'List Alert Rules' }

export function SentryNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_issues'
  const project = typeof data.sentryProject === 'string' ? data.sentryProject : ''

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.sentry}
      icon={NODE_ICONS.sentry}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">{project || 'Connect sentry in the sidebar'}</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
