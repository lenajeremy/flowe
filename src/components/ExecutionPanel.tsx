import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import type { ExecutionEvent } from '@/types/workflow'
import { approveRun, rejectRun, listRuns, getRun, type WorkflowRun } from '@/lib/workflowApi'

// ── JSON pretty-printing with syntax highlighting ─────────────

function tryParseJson(str: string): unknown | null {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'color:#f59e0b' // number – amber
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'color:#a78bfa' // key – purple
          } else {
            cls = 'color:#34d399' // string – emerald
          }
        } else if (/true|false/.test(match)) {
          cls = 'color:#60a5fa' // boolean – blue
        } else if (/null/.test(match)) {
          cls = 'color:#f87171' // null – red
        }
        return `<span style="${cls}">${match}</span>`
      },
    )
}

function JsonOutput({ raw }: { raw: string }) {
  const parsed = tryParseJson(raw)
  if (parsed === null) {
    return (
      <pre className="mt-1.5 text-[10px] text-[var(--color-text)] bg-[var(--color-canvas)] border border-[var(--color-border)] rounded px-2 py-1.5 whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-[var(--font-mono)]">
        {raw}
      </pre>
    )
  }
  const pretty = JSON.stringify(parsed, null, 2)
  return (
    <pre
      className="mt-1.5 text-[10px] bg-[var(--color-canvas)] border border-[var(--color-border)] rounded px-2 py-1.5 whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-[var(--font-mono)]"
      dangerouslySetInnerHTML={{ __html: syntaxHighlight(pretty) }}
    />
  )
}

// ── Event dot & row ───────────────────────────────────────────

function EventDot({ type }: { type: ExecutionEvent['type'] }) {
  const color =
    type === 'node_started'        ? 'bg-yellow-400' :
    type === 'node_output'         ? 'bg-blue-400'   :
    type === 'node_completed'      ? 'bg-emerald-400' :
    type === 'node_error'          ? 'bg-red-400'     :
    type === 'node_waiting'        ? 'bg-pink-400'    :
    type === 'workflow_started'    ? 'bg-violet-400'  :
    type === 'workflow_completed'  ? 'bg-emerald-500' :
    'bg-[var(--color-muted)]'
  return <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${color}`} />
}

function EventRow({ event }: { event: ExecutionEvent }) {
  const [expanded, setExpanded] = useState(false)
  const hasOutput = event.type === 'node_output' && event.output

  return (
    <div
      className={`flex gap-2.5 py-1.5 px-3 ${hasOutput ? 'cursor-pointer hover:bg-[var(--color-surface2)]' : ''} rounded`}
      onClick={() => hasOutput && setExpanded((e) => !e)}
    >
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
          <JsonOutput raw={event.output} />
        )}
      </div>
    </div>
  )
}

// ── Run history helpers ───────────────────────────────────────

function statusBadge(status: WorkflowRun['status']) {
  if (status === 'completed') return 'bg-emerald-500/20 text-emerald-400'
  if (status === 'error')     return 'bg-red-500/20 text-red-400'
  return 'bg-blue-500/20 text-blue-400'
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function duration(run: WorkflowRun) {
  try {
    const ms = new Date(run.updated_at).getTime() - new Date(run.created_at).getTime()
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  } catch {
    return ''
  }
}

// ── Panel constants ───────────────────────────────────────────

const MIN_HEIGHT = 120
const MAX_HEIGHT = 600
const DEFAULT_HEIGHT = 256

// ── Main component ────────────────────────────────────────────

export function ExecutionPanel() {
  const {
    isLogPanelOpen, setLogPanelOpen,
    executionState, executionLog,
    pendingApproval, setPendingApproval,
    dbId,
  } = useWorkflowStore(
    useShallow((s) => ({
      isLogPanelOpen: s.isLogPanelOpen,
      setLogPanelOpen: s.setLogPanelOpen,
      executionState: s.executionState,
      executionLog: s.executionLog,
      pendingApproval: s.pendingApproval,
      setPendingApproval: s.setPendingApproval,
      dbId: s.dbId,
    })),
  )

  const bottomRef = useRef<HTMLDivElement>(null)
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT)
  const [isDragging, setIsDragging] = useState(false)

  // ── Tab state: 'log' | 'history' | 'state' ──
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'state'>('log')
  const [historyRuns, setHistoryRuns] = useState<WorkflowRun[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [viewingRun, setViewingRun] = useState<WorkflowRun | null>(null)
  const [viewingRunEvents, setViewingRunEvents] = useState<ExecutionEvent[]>([])
  const [viewingRunLoading, setViewingRunLoading] = useState(false)

  // Auto-scroll on new live events
  useEffect(() => {
    if (activeTab === 'log') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [executionLog.length, activeTab])

  // Load history when tab becomes active
  useEffect(() => {
    if (activeTab !== 'history' || !dbId) return
    setHistoryLoading(true)
    listRuns(dbId)
      .then(setHistoryRuns)
      .catch(() => setHistoryRuns([]))
      .finally(() => setHistoryLoading(false))
  }, [activeTab, dbId])

  function onResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = panelHeight
    setIsDragging(true)

    function onMouseMove(ev: MouseEvent) {
      const delta = startY - ev.clientY
      setPanelHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight + delta)))
    }

    function onMouseUp() {
      setIsDragging(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  async function handleApprove() {
    if (!pendingApproval) return
    try {
      await approveRun(pendingApproval.runId, pendingApproval.nodeId)
    } catch {
      // best-effort
    }
    setPendingApproval(null)
  }

  async function handleReject() {
    if (!pendingApproval) return
    try {
      await rejectRun(pendingApproval.runId, pendingApproval.nodeId)
    } catch {
      // best-effort
    }
    setPendingApproval(null)
  }

  async function handleViewRun(run: WorkflowRun) {
    setViewingRun(run)
    if (run.events) {
      setViewingRunEvents(run.events)
      return
    }
    setViewingRunLoading(true)
    try {
      const full = await getRun(run.id)
      setViewingRunEvents(full.events ?? [])
    } catch {
      setViewingRunEvents([])
    } finally {
      setViewingRunLoading(false)
    }
  }

  // Derive node output entries for the State tab
  const nodeOutputEntries = useMemo(() => {
    const seen = new Map<string, { nodeId: string; nodeLabel?: string; output: string }>()
    for (const ev of executionLog) {
      if (ev.type === 'node_output' && ev.nodeId) {
        seen.set(ev.nodeId, { nodeId: ev.nodeId, nodeLabel: ev.nodeLabel, output: ev.output ?? '' })
      }
    }
    return [...seen.values()]
  }, [executionLog])

  // Decide which events to show in "Log" view
  const displayLog = executionLog

  return (
    <div
      className="flex-shrink-0 flex flex-col bg-[var(--color-surface)] border-t border-[var(--color-border)] overflow-hidden transition-[height] duration-300 ease-in-out"
      style={{ height: isLogPanelOpen ? panelHeight : 0 }}
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

        {/* Tab switcher */}
        <div className="ml-auto flex items-center gap-1 rounded-full bg-[var(--color-surface2)] p-0.5">
          <button
            onClick={() => { setActiveTab('log'); setViewingRun(null) }}
            className={`rounded-full px-3 py-0.5 text-[10px] font-medium transition-colors ${
              activeTab === 'log'
                ? 'bg-white/15 text-white'
                : 'text-[var(--color-muted)] hover:text-white'
            }`}
          >
            Log
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-full px-3 py-0.5 text-[10px] font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-white/15 text-white'
                : 'text-[var(--color-muted)] hover:text-white'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('state')}
            className={`rounded-full px-3 py-0.5 text-[10px] font-medium transition-colors ${
              activeTab === 'state'
                ? 'bg-white/15 text-white'
                : 'text-[var(--color-muted)] hover:text-white'
            }`}
          >
            State
          </button>
        </div>

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

      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[9999] cursor-row-resize" />
      )}

      {/* Approval banner */}
      {pendingApproval && (() => {
        // Find the output of the node immediately before the waiting node
        const waitingIdx = executionLog.findLastIndex((e) => e.type === 'node_waiting' && e.nodeId === pendingApproval.nodeId)
        const prevOutput = waitingIdx > 0
          ? [...executionLog].slice(0, waitingIdx).reverse().find((e) => e.type === 'node_output')?.output
          : undefined
        return (
          <div
            className="flex flex-col gap-3 px-4 py-3 border-b flex-shrink-0"
            style={{ background: 'rgba(236,72,153,0.1)', borderColor: 'rgba(236,72,153,0.2)' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-pink-400">Approval Required</p>
                <p className="text-xs text-white/60 mt-0.5">{pendingApproval.message}</p>
              </div>
              <Link
                to={`/run/${pendingApproval.runId}`}
                target="_blank"
                className="flex-shrink-0 text-[11px] text-pink-400 hover:text-pink-300 underline underline-offset-2 transition-colors"
              >
                Full run ↗
              </Link>
              <button
                onClick={() => void handleApprove()}
                className="flex-shrink-0 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => void handleReject()}
                className="flex-shrink-0 rounded-full bg-red-500/80 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
              >
                Reject
              </button>
            </div>
            {prevOutput && (
              <pre className="text-[11px] text-[var(--color-text)] bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-lg px-3 py-2 whitespace-pre-wrap break-words max-h-40 overflow-y-auto leading-relaxed">
                {prevOutput}
              </pre>
            )}
          </div>
        )
      })()}

      {/* Content area */}
      {activeTab === 'state' ? (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-2 p-3">
            {nodeOutputEntries.length === 0 ? (
              <p className="text-[11px] text-[var(--color-muted)]">
                No outputs yet. Run the workflow to see state.
              </p>
            ) : (
              nodeOutputEntries.map(({ nodeId, nodeLabel, output }) => (
                <div
                  key={nodeId}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                >
                  <div className="mb-1 text-[10px] font-medium text-[var(--color-muted)]">
                    {nodeLabel ?? nodeId}
                  </div>
                  <pre className="whitespace-pre-wrap break-all text-[11px] text-[var(--color-text)] font-mono max-h-32 overflow-y-auto">
                    {output}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'log' ? (
        <div className="flex-1 overflow-y-auto py-1">
          {displayLog.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-[var(--color-muted)]">No events yet</p>
            </div>
          ) : (
            displayLog.map((event) => (
              <EventRow key={event.id} event={event} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Viewing a specific past run */}
          {viewingRun ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] flex-shrink-0">
                <button
                  onClick={() => { setViewingRun(null); setViewingRunEvents([]) }}
                  className="flex items-center gap-1.5 text-[10px] text-[var(--color-muted)] hover:text-white transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M6 2L2 5l4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back to history
                </button>
                <span className="text-[10px] text-[var(--color-muted)] ml-auto">
                  {formatDate(viewingRun.created_at)}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge(viewingRun.status)}`}>
                  {viewingRun.status}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {viewingRunLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-[var(--color-muted)]">Loading events…</p>
                  </div>
                ) : viewingRunEvents.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-[var(--color-muted)]">No events recorded</p>
                  </div>
                ) : (
                  viewingRunEvents.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Run history list */
            <div className="py-1">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs text-[var(--color-muted)]">Loading history…</p>
                </div>
              ) : !dbId ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs text-[var(--color-muted)]">Save workflow to see run history</p>
                </div>
              ) : historyRuns.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs text-[var(--color-muted)]">No runs yet</p>
                </div>
              ) : (
                historyRuns.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => void handleViewRun(run)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-surface2)] transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[var(--color-text)] font-medium">
                        {formatDate(run.created_at)}
                      </p>
                      <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
                        {duration(run)} · {run.events?.length ?? 0} events
                      </p>
                    </div>
                    <span className={`flex-shrink-0 text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${statusBadge(run.status)}`}>
                      {run.status}
                    </span>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 text-[var(--color-muted)]">
                      <path d="M4 2l4 3-4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
