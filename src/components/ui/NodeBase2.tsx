import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useWorkflowStore } from '@/store/workflowStore'
import { requestRun, stopRun } from '@/lib/runController'
import type { ExecutionStatus } from '@/types/workflow'

interface NodeBaseProps {
  accentHex: string
  iconPath?: string
  icon?: ReactNode
  label: string
  isSelected: boolean
  executionStatus?: ExecutionStatus
  children: ReactNode
}

// Toolbar button under the selected node — Figma EL-54f39c21
const toolBtnStyle: React.CSSProperties = {
  background: 'var(--color-chip)',
  border: '1px solid var(--color-chip-border)',
  boxShadow: 'inset 0px 2px 8px 0px var(--inset-hi)',
}

/**
 * The node card — Figma frames 161-168: translucent shell with a blurred
 * accent glow, #0D0D11 inner card with a -46deg gradient border, 32px icon
 * chip, and the run-state grammar layered on via .node-shell classes.
 */
export function NodeBase2({ accentHex, iconPath, icon, label, isSelected, executionStatus, children }: NodeBaseProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isRunning = useWorkflowStore((s) => s.executionState === 'running')
  const setLogPanelOpen = useWorkflowStore((s) => s.setLogPanelOpen)
  const setConfigPanelOpen = useWorkflowStore((s) => s.setConfigPanelOpen)

  const isWaiting   = executionStatus === 'waiting'
  const nodeRunning = executionStatus === 'running'
  const isCompleted = executionStatus === 'completed'
  const isError     = executionStatus === 'error'

  const accentTop =
    nodeRunning ? 'var(--color-accent)' :
    isCompleted ? 'var(--color-ok)'     :
    isError     ? 'var(--color-fail)'   :
    isWaiting   ? 'var(--color-hold)'   :
    accentHex

  const shellState =
    nodeRunning ? 'is-running'  :
    isWaiting   ? 'is-waiting'  :
    isCompleted ? 'is-complete' :
    isError     ? 'is-error'    :
    isSelected  ? 'is-selected' : ''

  return (
    <motion.div
      className="flex flex-col"
      style={{ width: 214 }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 550, damping: 38, mass: 0.7 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Card shell — rgba(255,255,255,0.08) rounded-16 with accent glow ──
          The glow gets its own clipping layer (not overflow on the shell) so
          handle labels like the branch true/false chips can hang outside. */}
      <div
        className={`node-shell relative flex flex-col rounded-2xl ${shellState}`}
        style={{
          '--node-accent': accentHex,
          background: 'var(--color-shell)',
          minHeight: 90,
          border: isSelected ? `1px solid ${accentHex}` : '1px solid transparent',
        } as React.CSSProperties}
      >
        {/* Blurred accent glow — full neon bloom on dark, a whisper on light
            (--node-glow-o) so it never reads as a smudge on white. */}
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <span
            className="absolute rounded-full"
            style={{
              width: 91, height: 91, left: -24, top: -4,
              background: accentHex,
              opacity: 'var(--node-glow-o)' as unknown as number,
              filter: 'blur(33px)',
            }}
          />
        </span>

        {/* Inner card — radius 12, -46deg gradient border. flex-1 stretches it
            to the shell's minHeight so short content never leaves bare shell
            showing beneath the card. */}
        <div
          className="relative m-1 flex flex-1 flex-col gap-1 rounded-xl p-2"
          style={{
            border: '1px solid transparent',
            background:
              'linear-gradient(var(--color-node-card), var(--color-node-card)) padding-box, ' +
              'linear-gradient(-46deg, transparent 1%, var(--color-chip-border2) 100%) border-box',
            backdropFilter: 'blur(2px)',
          }}
        >
          {/* Icon chip + title */}
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full [&>svg]:overflow-visible"
              style={{
                borderRadius: 8,
                padding: icon ? 7 : 0,
                background: 'var(--color-chip)',
                border: '1px solid var(--color-chip-border)',
                boxShadow: 'inset 0px 2px 8px 1px var(--inset-hi-strong)',
                overflow: 'visible',
                color: accentTop, // node icons stroke currentColor
              }}
            >
              {icon ?? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="node-ico" style={{ overflow: 'visible', stroke: accentTop }}>
                  <path
                    d={iconPath}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span className="truncate text-[14px] font-medium leading-tight text-[var(--color-text)]">
              {label}
            </span>
          </div>

          {/* Node-specific description / content + Handles */}
          <div className="text-[10px] leading-relaxed text-[var(--color-dim)]" style={{ maxWidth: 190 }}>
            {children}
          </div>
        </div>
      </div>

      {/* "Action Required" badge — below the card */}
      {isWaiting && (
        <div
          className="mt-2 self-start rounded-lg px-2 py-1 text-[12px] font-medium"
          style={{ background: 'var(--tint-hold)', color: 'var(--color-hold)' }}
        >
          Action Required
        </div>
      )}

      {/* Run / Test / ⋯ toolbar — Figma: shown under the selected node */}
      <AnimatePresence>
      {(isSelected || isHovered) && (
        <motion.div
          className="nodrag mt-2 flex items-center gap-2"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (isRunning) stopRun(); else requestRun() }}
            className="pressable flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-[var(--color-dim)] hover:text-[var(--color-text)]"
            style={toolBtnStyle}
          >
            {isRunning ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <rect x="2" y="2" width="6" height="6" rx="1" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
              </svg>
            )}
            {isRunning ? 'Stop' : 'Run'}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLogPanelOpen(true) }}
            className="pressable flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-[var(--color-dim)] hover:text-[var(--color-text)]"
            style={toolBtnStyle}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 1.5h3v2h-3zM6 3.5v2M3 8l1.5-2.5h3L9 8M2.5 8a3.5 3.5 0 1 0 7 0" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Test
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfigPanelOpen(true) }}
            className="pressable flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-dim)] hover:text-[var(--color-text)]"
            style={toolBtnStyle}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="3" cy="7" r="1.1" />
              <circle cx="7" cy="7" r="1.1" />
              <circle cx="11" cy="7" r="1.1" />
            </svg>
          </button>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  )
}
