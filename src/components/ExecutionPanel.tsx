import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import type { ExecutionEvent } from '@/types/workflow'
import { groupLog, isFailure, type IterationRow } from '@/lib/runLog'
import { approveRun, rejectRun, listRuns, getRun, type WorkflowRun } from '@/lib/workflowApi'
import { JsonView } from '@/components/ui/JsonView'
import { CodingAgentActivity } from '@/components/coding/CodingAgentActivity'
import { getCodingAgentCommandActivity } from '@/lib/codingAgentActivity'

// ── Event dot & row ───────────────────────────────────────────

function EventDot({ type }: { type: ExecutionEvent['type'] }) {
  const color =
    type === 'node_started'        ? 'bg-[var(--color-accent)]' :
    type === 'node_output'         ? 'bg-[var(--color-accent)]' :
    type === 'node_completed'      ? 'bg-[var(--color-ok)]'     :
    type === 'node_error'          ? 'bg-[var(--color-fail)]'   :
    type === 'node_waiting'        ? 'bg-[var(--color-hold)]'   :
    type === 'node_progress'       ? 'bg-[var(--color-accent)]' :
    type === 'workflow_started'    ? 'bg-[var(--color-accent)]' :
    type === 'workflow_completed'  ? 'bg-[var(--color-ok)]'     :
    type === 'node_skipped'        ? 'bg-[var(--color-subtle)]' :
    type === 'log_truncated'       ? 'bg-[var(--color-hold)]'   :
    'bg-[var(--color-muted)]'
  return <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${color}`} />
}

function EventRow({ event }: { event: ExecutionEvent }) {
  const [expanded, setExpanded] = useState(false)
  // An iteration's own summary row carries output too, not just node_output.
  const hasOutput = Boolean(event.output) &&
    (event.type === 'node_output' || event.type === 'iteration_completed')
  const commandActivity = getCodingAgentCommandActivity(event)
  const hasDetails = Boolean(hasOutput || commandActivity)
  const skipped = event.type === 'node_skipped'

  return (
    <div
      className={`flex gap-2.5 py-1.5 px-3 ${hasDetails ? 'cursor-pointer hover:bg-[var(--color-surface2)]' : ''} rounded`}
      onClick={() => hasDetails && setExpanded((e) => !e)}
    >
      <EventDot type={event.type} />
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-medium truncate ${
            skipped ? 'text-[var(--color-muted)] italic' : 'text-[var(--color-text)]'
          }`}>
            {event.message}
          </span>
          {event.outputTruncated && (
            <span className="micro flex-shrink-0 rounded px-1 text-[var(--color-hold)] bg-[var(--color-hold)]/15">
              truncated
            </span>
          )}
          {event.nodeType && (
            <span className="text-[9px] text-[var(--color-muted)] bg-[var(--color-surface2)] px-1 rounded flex-shrink-0">
              {event.nodeType}
            </span>
          )}
          <span className="ml-auto flex-shrink-0 font-mono text-[9px] tabular-nums text-[var(--color-subtle)]">
            +{event.timestamp}ms
          </span>
          {hasDetails && (
            <span className="flex-shrink-0 text-[9px] text-[var(--color-accent)]">
              {expanded ? '▲' : '▼'}
            </span>
          )}
        </div>
        {expanded && event.output && (
          <JsonView className="mt-1.5 max-h-40 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-1.5 text-[10px]" raw={event.output} />
        )}
        {commandActivity && !expanded && (
          <p className="truncate font-mono text-[10px] text-[var(--color-muted)]">{commandActivity.command}</p>
        )}
        {commandActivity && expanded && <CodingAgentActivity event={event} className="mt-1.5" />}
      </div>
    </div>
  )
}

function IterationGroup({ row }: { row: IterationRow }) {
  // Open while running and whenever it failed; collapsed once it succeeded,
  // since a green pass is exactly the thing nobody needs to read. A click
  // overrides that for good — the panel should not re-collapse a group the
  // moment the pass it belongs to finishes.
  const [override, setOverride] = useState<boolean | null>(null)
  const preferOpen = row.status !== 'ok'
  const open = override ?? preferOpen

  const elapsed = row.endedAt !== undefined ? row.endedAt - row.startedAt : undefined
  const tone =
    row.status === 'error'   ? 'text-[var(--color-fail)]'   :
    row.status === 'running' ? 'text-[var(--color-accent)]' :
    'text-[var(--color-ok)]'

  return (
    <div className="border-l-2 ml-3 my-0.5" style={{ borderColor: 'var(--color-border)' }}>
      <button
        onClick={() => setOverride(!open)}
        className="flex w-full items-center gap-2 py-1 pl-2 pr-3 text-left rounded hover:bg-[var(--color-surface2)]"
      >
        <span className="text-[9px] text-[var(--color-muted)] w-2 flex-shrink-0">{open ? '▾' : '▸'}</span>
        <span className="font-mono text-[10px] tabular-nums text-[var(--color-text)] flex-shrink-0">
          {row.ref.index + 1}/{row.ref.total}
        </span>
        <span className={`micro flex-shrink-0 ${tone}`}>
          {row.status === 'error' ? 'failed' : row.status === 'running' ? 'running' : 'ok'}
        </span>
        {row.ref.itemPreview && (
          <span className="truncate font-mono text-[10px] text-[var(--color-muted)]">
            {row.ref.itemPreview}
          </span>
        )}
        {elapsed !== undefined && (
          <span className="ml-auto flex-shrink-0 font-mono text-[9px] tabular-nums text-[var(--color-subtle)]">
            {elapsed}ms
          </span>
        )}
      </button>
      {open && row.events.map((event) => (
        <div key={event.id} className="pl-3">
          <EventRow event={event} />
        </div>
      ))}
    </div>
  )
}

function LogList({ events }: { events: ExecutionEvent[] }) {
  const [onlyFailed, setOnlyFailed] = useState(false)
  const rows = useMemo(() => groupLog(events), [events])

  const failureCount = useMemo(() => rows.filter(isFailure).length, [rows])
  const hasIterations = useMemo(() => rows.some((r) => r.kind === 'iteration'), [rows])
  const visible = onlyFailed ? rows.filter(isFailure) : rows

  return (
    <>
      {hasIterations && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--color-border)]">
          <span className="text-[10px] text-[var(--color-muted)]">
            {rows.filter((r) => r.kind === 'iteration').length} iterations
          </span>
          <div className="ml-auto flex items-center gap-1 rounded-full bg-[var(--color-surface2)] p-0.5">
            <button
              onClick={() => setOnlyFailed(false)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                !onlyFailed ? 'bg-[var(--color-hover2)] text-[var(--color-text)]' : 'text-[var(--color-muted)]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setOnlyFailed(true)}
              disabled={failureCount === 0}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40 ${
                onlyFailed ? 'bg-[var(--color-hover2)] text-[var(--color-fail)]' : 'text-[var(--color-muted)]'
              }`}
            >
              Failed{failureCount > 0 ? ` (${failureCount})` : ''}
            </button>
          </div>
        </div>
      )}
      {onlyFailed && visible.length === 0 ? (
        <p className="px-3 py-4 text-center text-[11px] text-[var(--color-muted)]">Nothing failed.</p>
      ) : (
        visible.map((row) =>
          row.kind === 'iteration'
            ? <IterationGroup key={row.key} row={row} />
            : <EventRow key={row.event.id} event={row.event} />,
        )
      )}
    </>
  )
}

// ── Run history helpers ───────────────────────────────────────

function statusBadge(status: WorkflowRun['status']) {
  if (status === 'completed') return 'bg-[var(--color-ok)]/15 text-[var(--color-ok)]'
  if (status === 'error')     return 'bg-[var(--color-fail)]/15 text-[var(--color-fail)]'
  return 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
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
    dbId, setPathEvents, nodes,
  } = useWorkflowStore(
    useShallow((s) => ({
      isLogPanelOpen: s.isLogPanelOpen,
      setLogPanelOpen: s.setLogPanelOpen,
      executionState: s.executionState,
      executionLog: s.executionLog,
      pendingApproval: s.pendingApproval,
      setPendingApproval: s.setPendingApproval,
      dbId: s.dbId,
      setPathEvents: s.setPathEvents,
      nodes: s.nodes,
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
      setPathEvents(run.events)
      return
    }
    setViewingRunLoading(true)
    try {
      const full = await getRun(run.id)
      setViewingRunEvents(full.events ?? [])
      setViewingRun(full)
      // Point the canvas overlay at this run rather than the live log, so
      // opening a past run and turning on Path shows that run's path.
      setPathEvents(full.events ?? [])
    } catch {
      setViewingRunEvents([])
    } finally {
      setViewingRunLoading(false)
    }
  }

  // The canvas draws the workflow as it is now. If the run predates an edit,
  // say so rather than letting the overlay quietly describe a different graph.
  const graphDrift = useMemo(() => {
    const snapshot = viewingRun?.graph?.nodes
    if (!snapshot) return 0
    const current = new Set(nodes.map((n) => n.id))
    const then = new Set(snapshot.map((n) => n.id))
    let drift = 0
    for (const id of then) if (!current.has(id)) drift++
    for (const id of current) if (!then.has(id)) drift++
    return drift
  }, [viewingRun, nodes])

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
      className="flex-shrink-0 flex flex-col bg-[var(--color-surface)] border-t border-[var(--color-border)] overflow-hidden transition-[height] duration-200 ease-[var(--ease-in-out)]"
      style={{ height: isLogPanelOpen ? panelHeight : 0 }}
    >
      {/* Resize handle */}
      <div
        className="h-1 flex-shrink-0 cursor-row-resize transition-colors duration-150 hover:bg-[var(--color-accent)]/50 active:bg-[var(--color-accent)]/70"
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

        <span className={`micro ml-1 rounded-full px-2 py-0.5 ${
          executionState === 'running'   ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' :
          executionState === 'completed' ? 'bg-[var(--color-ok)]/15 text-[var(--color-ok)]'         :
          executionState === 'error'     ? 'bg-[var(--color-fail)]/15 text-[var(--color-fail)]'     :
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
                ? 'bg-[var(--color-hover2)] text-[var(--color-text)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Log
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-full px-3 py-0.5 text-[10px] font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-[var(--color-hover2)] text-[var(--color-text)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('state')}
            className={`rounded-full px-3 py-0.5 text-[10px] font-medium transition-colors ${
              activeTab === 'state'
                ? 'bg-[var(--color-hover2)] text-[var(--color-text)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
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
            style={{ background: 'var(--tint-hold)', borderColor: 'color-mix(in srgb, var(--color-hold) 30%, transparent)' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-hold)]">Approval required</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">{pendingApproval.message}</p>
              </div>
              <Link
                to={`/run/${pendingApproval.runId}`}
                target="_blank"
                className="flex-shrink-0 text-[11px] text-[var(--color-hold)] underline underline-offset-2 transition-opacity hover:opacity-80"
              >
                Full run ↗
              </Link>
              <button
                onClick={() => void handleApprove()}
                className="pressable flex-shrink-0 rounded-full bg-[var(--color-ok)] px-4 py-1.5 text-xs font-semibold text-[var(--color-canvas)]"
              >
                Approve
              </button>
              <button
                onClick={() => void handleReject()}
                className="pressable flex-shrink-0 rounded-full bg-[var(--color-fail)] px-4 py-1.5 text-xs font-semibold text-white"
              >
                Reject
              </button>
            </div>
            {prevOutput && (
              <JsonView className="max-h-40 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-text)]" raw={prevOutput} />
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
                  <JsonView className="max-h-32 overflow-y-auto text-[11px] text-[var(--color-text)]" raw={output} />
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
            <LogList events={displayLog} />
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
                  onClick={() => { setViewingRun(null); setViewingRunEvents([]); setPathEvents(null) }}
                  className="flex items-center gap-1.5 text-[10px] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
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
              {graphDrift > 0 && (
                <div
                  className="px-3 py-1.5 text-[10px] flex-shrink-0"
                  style={{ background: 'var(--tint-hold)', color: 'var(--color-hold)' }}
                >
                  This workflow has changed since this run — {graphDrift} node{graphDrift === 1 ? '' : 's'} differ.
                  The path drawn on the canvas is approximate.
                </div>
              )}
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
                  <LogList events={viewingRunEvents} />
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
