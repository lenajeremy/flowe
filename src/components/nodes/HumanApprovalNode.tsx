import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

export function HumanApprovalNode({ data, selected }: NodeProps<FlowNode>) {
  const approvalMessage = typeof data.approvalMessage === 'string' ? data.approvalMessage : ''
  const isWaiting = data.executionStatus === 'waiting'
  const output = typeof data.executionOutput === 'string' ? data.executionOutput : ''

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.humanApproval}
      icon={NODE_ICONS.humanApproval}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1.5">
        {isWaiting && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full animate-pulse flex-shrink-0 bg-[var(--color-hold)]" />
            <span className="micro text-[var(--color-hold)]">Waiting for approval…</span>
          </span>
        )}
        {approvalMessage && !isWaiting && (
          <p className="text-[11px] text-[var(--color-muted)] line-clamp-2 leading-relaxed">
            {approvalMessage.slice(0, 80)}{approvalMessage.length > 80 ? '…' : ''}
          </p>
        )}
        {!approvalMessage && !isWaiting && (
          <span className="text-[11px] text-[var(--color-muted)] italic">No message set</span>
        )}
        {output && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-fit ${
            output === 'approved'
              ? 'bg-[var(--color-ok)]/15 text-[var(--color-ok)]'
              : 'bg-[var(--color-fail)]/15 text-[var(--color-fail)]'
          }`}>
            {output}
          </span>
        )}
      </div>
      <Handle type="target" position={Position.Left} />

      {/* Approve path */}
      <div className="micro pointer-events-none absolute text-[var(--color-ok)]" style={{ right: '-62px', top: 'calc(38% - 6px)' }}>
        Approve
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="approved"
        style={{ top: '38%', background: 'rgba(61,214,140,0.25)', borderColor: 'var(--color-ok)' }}
      />

      {/* Reject path */}
      <div className="micro pointer-events-none absolute text-[var(--color-fail)]" style={{ right: '-52px', top: 'calc(68% - 6px)' }}>
        Reject
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="rejected"
        style={{ top: '68%', background: 'rgba(244,85,74,0.25)', borderColor: 'var(--color-fail)' }}
      />
    </NodeBase2>
  )
}
