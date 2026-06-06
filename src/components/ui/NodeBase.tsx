import { useState, type ReactNode } from 'react'
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
  const [isHovered, setIsHovered] = useState(false)

  const isWaiting   = executionStatus === 'waiting'
  const isRunning   = executionStatus === 'running'
  const isCompleted = executionStatus === 'completed'
  const isError     = executionStatus === 'error'

  const accentTop =
    isRunning   ? '#3B82F6' :
    isCompleted ? '#10B981' :
    isError     ? '#EF4444' :
    isWaiting   ? '#F97316' :
    accentHex

  // Gradient border: accent at 70% opacity for the first 30%, then fades to transparent
  const borderGradient = `linear-gradient(135deg, ${accentTop}73 0%, transparent 100%)`

  const outerGlow = isSelected
    ? `0 0 0 1px ${accentTop}50, 0 0 28px ${accentTop}35, 0 8px 32px rgba(0,0,0,0.65)`
    : `0 0 0 1px ${accentTop}20, 0 4px 24px rgba(0,0,0,0.5)`

  return (
    <div
      className="flex flex-col"
      style={{ width: 260 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status badge above node */}
      {isWaiting && (
        <div
          className="mb-2 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            background: 'rgba(249,115,22,0.15)',
            border: '1px solid rgba(249,115,22,0.35)',
            color: '#FB923C',
          }}
        >
          Action Required
        </div>
      )}

      {/* Card — gradient border via background-clip trick */}
      <div
        className="relative select-none"
        style={{
          borderRadius: 16,
          boxShadow: outerGlow,
          border: '4px solid transparent',
          background: `linear-gradient(rgb(10, 10, 18), rgb(10, 10, 18)) padding-box, ${borderGradient} border-box`,
        }}
      >
        {/* Header: icon + label */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
            style={{
              borderRadius: 10,
              background: `${accentTop}18`,
              border: `1px solid ${accentTop}40`,
              boxShadow: `0 2px 8px 1px ${accentTop}20 inset`,
            }}
          >
            <svg
              width="20" height="20" viewBox="0 0 16 16" fill="none"
              style={{ overflow: 'visible' }}
            >
              <path
                d={iconPath}
                stroke={accentTop}
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="truncate text-[15px] font-semibold text-white leading-tight">
            {label}
          </span>
        </div>

        {/* Body */}
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>

      {/* Action buttons — visible on hover */}
      {isHovered && (
        <div className="mt-2 flex items-center gap-1.5">
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-[var(--color-muted)] transition-colors hover:text-white"
            style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 1.5l7 3.5-7 3.5V1.5z"/>
            </svg>
            Run
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-[var(--color-muted)] transition-colors hover:text-white"
            style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2 6a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM6 4v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Test
          </button>
          <button
            className="flex items-center justify-center rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-muted)] transition-colors hover:text-white"
            style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="3" cy="7" r="1.1"/>
              <circle cx="7" cy="7" r="1.1"/>
              <circle cx="11" cy="7" r="1.1"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
