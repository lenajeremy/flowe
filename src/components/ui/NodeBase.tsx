import type { ReactNode } from 'react'
import type { ExecutionStatus } from '@/types/workflow'

interface NodeBaseProps {
  accentColor: string
  label: string
  isSelected: boolean
  executionStatus?: ExecutionStatus
  children: ReactNode
  typeLabel: string
}

export function NodeBase({ accentColor, label, isSelected, executionStatus, children, typeLabel }: NodeBaseProps) {
  const statusClass =
    executionStatus === 'running'   ? 'node-running'  :
    executionStatus === 'completed' ? 'node-complete'  :
    executionStatus === 'error'     ? 'node-error'     : ''

  return (
    <div
      className={`relative flex select-none flex-col overflow-hidden rounded-[8px] border bg-[var(--color-elevated)] shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-shadow ${statusClass} ${
        isSelected
          ? 'border-[var(--color-accent)] shadow-[0_0_0_1px_var(--color-accent)]'
          : 'border-[var(--color-border)]'
      }`}
      style={{ width: 260, aspectRatio: '16/9' }}
    >
      {/* Colored left accent bar */}
      <div
        className="absolute bottom-0 left-0 top-0 w-[3px] rounded-l-[8px]"
        style={{ backgroundColor: accentColor }}
      />

      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-border)] px-3 pb-2 pl-4 pt-2.5">
        <div className="flex flex-col gap-0.5 pl-1">
          <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider leading-none">
            {typeLabel}
          </span>
          <span className="text-xs font-medium text-[var(--color-text)] leading-tight">
            {label}
          </span>
        </div>

        {/* Status badge */}
        {executionStatus && executionStatus !== 'idle' && (
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide ${
              executionStatus === 'running'   ? 'bg-blue-500/20 text-blue-400'   :
              executionStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-red-500/20 text-red-400'
            }`}
          >
            {executionStatus === 'running' ? '●' : executionStatus === 'completed' ? '✓' : '✗'}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-2 flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
