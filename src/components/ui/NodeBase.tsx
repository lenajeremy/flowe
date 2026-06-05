import { useState, useRef, useEffect, type ReactNode } from 'react'
import LiquidGlass from 'liquid-glass-react'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height })
      window.dispatchEvent(new Event('resize'))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const isWaiting   = executionStatus === 'waiting'
  const isRunning   = executionStatus === 'running'
  const isCompleted = executionStatus === 'completed'
  const isError     = executionStatus === 'error'

  const borderColor =
    isRunning   ? '#3B82F6' :
    isCompleted ? '#10B981' :
    isError     ? '#EF4444' :
    isWaiting   ? '#F97316' :
    isSelected  ? accentHex :
    accentHex + '55'

  const outerGlow = isSelected
    ? `0 0 28px ${accentHex}35, 0 8px 32px rgba(0,0,0,0.6)`
    : '0 4px 24px rgba(0,0,0,0.5)'

  return (
    <div className="flex flex-col" style={{ width: 260 }}>

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

      {/* ── 3-layer card ── */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ borderRadius: 16, boxShadow: outerGlow }}
      >
        {/* Layer 1 — accent gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: 16,
            background: isSelected
              ? `linear-gradient(135deg, ${accentHex}40 0%, ${accentHex}18 100%)`
              : `linear-gradient(135deg, ${accentHex}28 0%, ${accentHex}0C 100%)`,
          }}
        />

        {/* Layer 2 — LiquidGlass */}
        {dims.w > 0 && (
          <LiquidGlass
            cornerRadius={16}
            displacementScale={40}
            blurAmount={0.06}
            saturation={125}
            aberrationIntensity={1}
            style={{
              position: 'absolute',
              inset: 0,
              width: dims.w,
              height: dims.h,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >{null}</LiquidGlass>
        )}

        {/* Layer 3 — content (2px margin so gradient shows as border glow) */}
        <div
          className="relative"
          style={{
            margin: 2,
            borderRadius: 14,
            background: 'rgba(10, 10, 18, 0.92)',
            border: `1px solid ${borderColor}`,
            zIndex: 2,
          }}
        >
          {/* Header: icon + label */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
              style={{
                borderRadius: 10,
                background: `${accentHex}1A`,
                border: `1px solid ${accentHex}40`,
                boxShadow: `0 2px 8px 1px ${accentHex}20 inset`,
              }}
            >
              <svg
                width="20" height="20" viewBox="0 0 16 16" fill="none"
                style={{ overflow: 'visible' }}
              >
                <path
                  d={iconPath}
                  stroke={accentHex}
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

          {/* Body — node-specific content + Handles */}
          <div className="px-4 pb-4">
            {children}
          </div>
        </div>
      </div>

      {/* Action buttons — shown when selected */}
      {isSelected && (
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
              <circle cx="3" cy="7" r="1.1"/><circle cx="7" cy="7" r="1.1"/><circle cx="11" cy="7" r="1.1"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
