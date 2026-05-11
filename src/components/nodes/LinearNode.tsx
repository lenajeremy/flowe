import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase } from '@/components/ui/NodeBase'
import { NODE_ACCENT_HEX, NODE_ICON_PATHS } from '@/lib/nodeColors'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = {
  create_issue: 'Create Issue',
  get_issues: 'Get Issues',
  create_comment: 'Create Comment',
}

export function LinearNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'create_issue'
  const hasToken = typeof data.integrationToken === 'string' && data.integrationToken.length > 0

  return (
    <NodeBase
      accentHex={NODE_ACCENT_HEX.linear}
      iconPath={NODE_ICON_PATHS.linear}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">
          {hasToken ? 'Token configured' : 'Add token in sidebar'}
        </span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase>
  )
}
