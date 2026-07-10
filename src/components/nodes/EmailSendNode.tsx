import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

export function EmailSendNode({ data, selected }: NodeProps<FlowNode>) {
  const emailTo = typeof data.emailTo === 'string' ? data.emailTo : ''
  const emailSubject = typeof data.emailSubject === 'string' ? data.emailSubject : ''
  const output = typeof data.executionOutput === 'string' ? data.executionOutput : ''

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.emailSend}
      icon={NODE_ICONS.emailSend}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[var(--color-muted)] flex-shrink-0">To:</span>
          {emailTo ? (
            <span className="text-[10px] text-[var(--color-text)] font-[var(--font-mono)] truncate">
              {emailTo}
            </span>
          ) : (
            <span className="text-[10px] text-[var(--color-muted)] italic">No recipient</span>
          )}
        </div>
        {emailSubject && (
          <p className="text-[11px] text-[var(--color-muted)] truncate leading-relaxed">
            {emailSubject.slice(0, 60)}{emailSubject.length > 60 ? '…' : ''}
          </p>
        )}
        {output && (
          <p className="mt-0.5 line-clamp-2 font-[var(--font-mono)] text-[11px] leading-relaxed text-[var(--color-ok)]">
            {output.slice(0, 80)}{output.length > 80 ? '…' : ''}
          </p>
        )}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
