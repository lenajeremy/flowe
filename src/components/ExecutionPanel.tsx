import { useEffect, useRef, useState } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import type { ExecutionEvent } from '@/types/workflow'

function EventDot({ type }: { type: ExecutionEvent['type'] }) {
  const color =
    type === 'node_started'        ? 'bg-yellow-400' :
    type === 'node_output'         ? 'bg-blue-400'   :
    type === 'node_completed'      ? 'bg-emerald-400' :
    type === 'node_error'          ? 'bg-red-400'     :
    type === 'workflow_started'    ? 'bg-violet-400'  :
    type === 'workflow_completed'  ? 'bg-emerald-500' :
    'bg-[var(--color-muted)]'
  return <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${color}`} />
}

function EventRow({ event }: { event: ExecutionEvent }) {
  const [expanded, setExpanded] = useState(false)
  const hasOutput = event.type === 'node_output' && event.output

  return (
    <div className={`flex gap-2.5 py-1.5 px-3 ${hasOutput ? 'cursor-pointer hover:bg-[var(--color-surface2)]' : ''} rounded`} onClick={() => hasOutput && setExpanded((e) => !e)}>
      <EventDot type={event.type} />
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--color-text)] font-medium truncate">
            {event.message}
          </span>
          {event.nodeType && (
            <span className="text-[9px] text-[var(--color-muted)] bg-[var(--color-surface2)] px-1 rounded flex-shrink-0">
              {event.nodeType}
            </span>
          )}
          <span className="text-[9px] text-[var(--color-muted)] ml-auto flex-shrink-0 tabular-nums">
            +{event.timestamp}ms
          </span>
          {hasOutput && (
            <span className="text-[9px] text-blue-400 flex-shrink-0">
              {expanded ? '▲' : '▼'}
            </span>
          )}
        </div>
        {expanded && event.output && (
          <pre className="mt-1.5 text-[10px] text-[var(--color-text)] bg-[var(--color-canvas)] border border-[var(--color-border)] rounded px-2 py-1.5 whitespace-pre-wrap break-words max-h-32 overflow-y-auto font-[var(--font-mono)]">
            {event.output}
          </pre>
        )}
      </div>
    </div>
  )
}

const MIN_HEIGHT = 120
const MAX_HEIGHT = 600
const DEFAULT_HEIGHT = 256

export function ExecutionPanel() {
  const { isLogPanelOpen, setLogPanelOpen, executionState, executionLog } = useWorkflowStore(
    useShallow((s) => ({
      isLogPanelOpen: s.isLogPanelOpen,
      setLogPanelOpen: s.setLogPanelOpen,
      executionState: s.executionState,
      executionLog: s.executionLog,
    })),
  )

  const bottomRef = useRef<HTMLDivElement>(null)
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT)
  const isResizing = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [executionLog.length])

  function onResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    isResizing.current = true
    const startY = e.clientY
    const startHeight = panelHeight

    function onMouseMove(ev: MouseEvent) {
      if (!isResizing.current) return
      const delta = startY - ev.clientY
      setPanelHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight + delta)))
    }

    function onMouseUp() {
      isResizing.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[var(--color-surface)] border-t border-[var(--color-border)] transition-transform duration-300 ease-in-out ${
        isLogPanelOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ height: panelHeight }}
    >
      {/* Resize handle */}
      <div
        className="h-1 flex-shrink-0 cursor-row-resize hover:bg-blue-500/50 active:bg-blue-500/70 transition-colors"
        style={{ background: 'var(--color-border)' }}
        onMouseDown={onResizeStart}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)] flex-shrink-0">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="1" width="10" height="10" rx="2" stroke="var(--color-muted)" strokeWidth="1.2"/>
          <path d="M3 4h6M3 6h4M3 8h5" stroke="var(--color-muted)" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span className="text-xs font-medium text-[var(--color-text)]">Execution Log</span>

        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ml-1 ${
          executionState === 'running'   ? 'bg-blue-500/20 text-blue-400'      :
          executionState === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
          executionState === 'error'     ? 'bg-red-500/20 text-red-400'         :
          'bg-[var(--color-surface2)] text-[var(--color-muted)]'
        }`}>
          {executionState}
        </span>

        <span className="text-[10px] text-[var(--color-muted)] ml-1">
          {executionLog.length} event{executionLog.length !== 1 ? 's' : ''}
        </span>

        <div className="flex-1" />

        <button
          onClick={() => setLogPanelOpen(false)}
          className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors p-1 rounded hover:bg-[var(--color-surface2)]"
          aria-label="Close execution panel"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto py-1">
        {executionLog.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-[var(--color-muted)]">No events yet</p>
          </div>
        ) : (
          executionLog.map((event) => (
            <EventRow key={event.id} event={event} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
