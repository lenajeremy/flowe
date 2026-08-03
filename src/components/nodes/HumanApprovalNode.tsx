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

      {/* Outcome sockets, styled exactly like the branch node's true/false:
          a colored drag circle with a matching chip sitting clear of it. */}
      <Handle type="source" position={Position.Right} id="approved" className="handle-true" style={{ top: '34%' }} />
      <div
        className="micro pointer-events-none absolute flex items-center gap-1 rounded-full px-1.5 py-0.5"
        style={{ right: '-108px', top: 'calc(34% - 9px)', color: 'var(--color-ok)', background: 'var(--tint-ok)' }}
      >
        <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
          <path d="M1 4.5 3 6.5 7 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        approve
      </div>

      <Handle type="source" position={Position.Right} id="rejected" className="handle-false" style={{ top: '72%' }} />
      <div
        className="micro pointer-events-none absolute flex items-center gap-1 rounded-full px-1.5 py-0.5"
        style={{ right: '-100px', top: 'calc(72% - 9px)', color: 'var(--color-fail)', background: 'var(--tint-fail)' }}
      >
        <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        reject
      </div>
    </NodeBase2>
  )
}
