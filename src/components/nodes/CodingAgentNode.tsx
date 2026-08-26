import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

export function CodingAgentNode({ data, selected }: NodeProps<FlowNode>) {
  const repository = typeof data.codingAgentRepository === 'string' ? data.codingAgentRepository : ''
  const branch = typeof data.codingAgentBranch === 'string' ? data.codingAgentBranch : ''
  const task = typeof data.codingAgentTask === 'string' ? data.codingAgentTask : ''
  const persistent = data.codingAgentWorkspaceMode !== 'ephemeral'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.codingAgent}
      icon={NODE_ICONS.codingAgent}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex min-w-[180px] flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="micro rounded-md border border-[var(--color-border2)] bg-[var(--color-surface2)] px-1.5 py-0.5 text-[var(--color-muted)]">Codex</span>
          <span className="text-[10px] text-[var(--color-muted)]">{persistent ? 'Reusable workspace' : 'Fresh workspace'}</span>
        </div>
        <p className="truncate font-mono text-[10.5px] text-[var(--color-text)]">
          {repository || 'Choose a GitHub repository'}{branch ? ` · ${branch}` : ''}
        </p>
        {task && <p className="line-clamp-2 text-[10.5px] leading-relaxed text-[var(--color-muted)]">{task}</p>}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
