import type { ReactNode } from 'react'
import type { ExecutionStatus } from '@/types/workflow'

interface NodeBaseProps {
  accentHex: string
  iconPath: string
  label: string
  isSelected: boolean
  executionStatus?: ExecutionStatus
  children: ReactNode
}

export function NodeBase({ accentHex, iconPath, label, isSelected, executionStatus, children }: NodeBaseProps) {
  const statusClass =
    executionStatus === 'running'   ? 'node-running'  :
    executionStatus === 'completed' ? 'node-complete'  :
    executionStatus === 'error'     ? 'node-error'     : ''

  const shadow = isSelected
    ? `0 0 0 2px ${accentHex}, 0 4px 16px rgba(0,0,0,0.12)`
    : '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px var(--color-border)'

  return (
    <div
      className={`relative flex select-none flex-col overflow-hidden rounded-xl bg-[var(--color-elevated)] transition-shadow ${statusClass}`}
      style={{ width: 260, aspectRatio: '16/9', boxShadow: shadow }}
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-border)] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Colored icon box */}
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[7px]"
            style={{ backgroundColor: `${accentHex}22` }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
              stroke={accentHex} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d={iconPath} />
            </svg>
          </div>

          <span className="truncate text-xs font-semibold text-[var(--color-text)]">
            {label}
          </span>
        </div>

        {/* Status badge */}
        {executionStatus && executionStatus !== 'idle' && (
          <span
            className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
              executionStatus === 'running'   ? 'bg-blue-500/20 text-blue-500'    :
              executionStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-600' :
              'bg-red-500/20 text-red-500'
            }`}
          >
            {executionStatus === 'running' ? '●' : executionStatus === 'completed' ? '✓' : '✗'}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden px-3 py-2">
        {children}
      </div>
    </div>
  )
}
