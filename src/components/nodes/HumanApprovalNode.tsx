import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase } from '@/components/ui/NodeBase'
import { NODE_ACCENT_HEX, NODE_ICON_PATHS } from '@/lib/nodeColors'
import type { FlowNode } from '@/types/workflow'

export function HumanApprovalNode({ data, selected }: NodeProps<FlowNode>) {
  const approvalMessage = typeof data.approvalMessage === 'string' ? data.approvalMessage : ''
  const isWaiting = data.executionStatus === 'waiting'
  const output = typeof data.executionOutput === 'string' ? data.executionOutput : ''

  return (
    <NodeBase
      accentHex={NODE_ACCENT_HEX.humanApproval}
      iconPath={NODE_ICON_PATHS.humanApproval}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1.5">
        {isWaiting && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse flex-shrink-0" />
            <span className="text-[10px] text-pink-400 font-medium">Waiting for approval…</span>
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
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {output}
          </span>
        )}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} id="approved" style={{ top: '35%' }} />
      <div
        className="absolute text-[9px] font-medium text-emerald-400 pointer-events-none"
        style={{ right: '-26px', top: 'calc(35% - 6px)' }}
      >
        ✓
      </div>
      <Handle type="source" position={Position.Right} id="rejected" style={{ top: '65%' }} />
      <div
        className="absolute text-[9px] font-medium text-red-400 pointer-events-none"
        style={{ right: '-26px', top: 'calc(65% - 6px)' }}
      >
        ✗
      </div>
    </NodeBase>
  )
}
