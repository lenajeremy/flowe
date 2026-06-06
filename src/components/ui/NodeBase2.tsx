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

export function NodeBase2({ accentHex, iconPath, label, isSelected: _isSelected, executionStatus, children }: NodeBaseProps) {
  const [isHovered, setIsHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
      setContainerHeight(entry.contentRect.height)
      window.dispatchEvent(new Event('resize'))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  return (
    <div
      className="flex flex-col"
      style={{ width: 260 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status badge */}
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

      {/* ── Exact ChatPanel textarea layer stack ── */}
      <div ref={containerRef} className="relative rounded-[20px]">

        {/* Layer 1 — gradient fill: copied exactly from ChatPanel */}
        <div
          className="absolute inset-0 rounded-[20px]"
          style={{ background: 'linear-gradient(135deg, #3900F415 0%, #F34CFF15 50%, #0AA41215 100%)' }}
        />

        {/* Layer 2 — LiquidGlass: copied exactly from ChatPanel, clipped to boundary */}
        {containerWidth > 0 && (
          <LiquidGlass
            cornerRadius={20}
            displacementScale={64}
            blurAmount={0.1}
            saturation={130}
            aberrationIntensity={1.5}
            style={{
              position: 'absolute',
              inset: 0,
              width: containerWidth,
              height: containerHeight,
              pointerEvents: 'none',
              zIndex: 1,
              clipPath: 'inset(0 round 20px)',
            }}
          >{null}</LiquidGlass>
        )}

        {/* Layer 3 — content: copied exactly from ChatPanel (m-[4px], same border gradient) */}
        <div
          className="relative m-[4px] rounded-[16px] px-4 pt-4 pb-4"
          style={{
            zIndex: 2,
            border: '1px solid transparent',
            background: 'linear-gradient(var(--color-canvas), var(--color-canvas)) padding-box, linear-gradient(135deg, #4D4D5B, #2A2A3E) border-box',
          }}
        >
          {/* Icon + label (node-specific, replaces the textarea) */}
          <div className="flex items-center gap-3 pb-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
              style={{
                borderRadius: 10,
                background: `${accentTop}18`,
                border: `1px solid ${accentTop}40`,
                boxShadow: `0 2px 8px 1px ${accentTop}20 inset`,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" style={{ overflow: 'visible' }}>
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

          {/* Node-specific content + Handles */}
          <div>{children}</div>
        </div>
      </div>

      {/* Action buttons — on hover */}
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
