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
    executionStatus === 'error'     ? 'node-error'     :
    executionStatus === 'waiting'   ? 'node-waiting'   : ''

  const shadow = isSelected
    ? `0 0 0 1.5px ${accentHex}, 0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${accentHex}22`
    : '0 2px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07)'

  return (
    <div
      className={`relative flex select-none flex-col rounded-2xl transition-shadow ${statusClass}`}
      style={{
        width: 260,
        aspectRatio: '16/9',
        boxShadow: shadow,
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
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
              executionStatus === 'running'   ? 'bg-blue-500/20 text-blue-500'       :
              executionStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-600' :
              executionStatus === 'waiting'   ? 'bg-pink-500/20 text-pink-400'       :
              'bg-red-500/20 text-red-500'
            }`}
          >
            {executionStatus === 'running'   ? '●' :
             executionStatus === 'completed' ? '✓' :
             executionStatus === 'waiting'   ? '⏳' : '✗'}
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
