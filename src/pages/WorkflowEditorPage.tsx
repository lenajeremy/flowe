import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import { NodePalette } from '@/components/panels/NodePalette'
import { ConfigPanel } from '@/components/panels/ConfigPanel'
import { VersionsPanel } from '@/components/panels/VersionsPanel'
import { Canvas } from '@/components/Canvas'
import { ExecutionPanel } from '@/components/ExecutionPanel'
import { ApiKeyModal } from '@/components/ApiKeyModal'
import { BottomToolDock } from '@/components/BottomToolDock'
import { FloweIcon } from '@/components/FloweIcon'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { getWorkflow, saveWorkflow } from '@/lib/workflowApi'
import { serializeToAST } from '@/lib/executor'
import { API } from '@/lib/config'

// ── Resize logic (unchanged from original App.tsx) ───────────

const MIN_LEFT = 120
const MAX_LEFT = 480
const DEFAULT_LEFT = 450

const MIN_RIGHT = 200
const MAX_RIGHT = 640
const DEFAULT_RIGHT = 288

type Theme = 'dark' | 'light'

function formatRunTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).toLowerCase().replace(' ', '')
}

function getInitialTheme(): Theme {
  const saved = window.localStorage.getItem('workflow-ai-theme')
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function useResizable(defaultWidth: number, min: number, max: number, direction: 'left' | 'right') {
  const [width, setWidth] = useState(defaultWidth)
  const [dragging, setDragging] = useState(false)

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    setDragging(true)
    function onMouseMove(ev: MouseEvent) {
      const delta = direction === 'right' ? startX - ev.clientX : ev.clientX - startX
      setWidth(Math.max(min, Math.min(max, startW + delta)))
    }
    function onMouseUp() {
      setDragging(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return { width, dragging, onMouseDown }
}

function ResizeHandle({
  onMouseDown, onToggle, open, chevronOpen, chevronClosed,
}: {
  onMouseDown: (e: React.MouseEvent) => void
  onToggle: () => void
  open: boolean
  chevronOpen: string
  chevronClosed: string
}) {
  return (
    <div className="flex-shrink-0 flex flex-col" style={{ width: '6px', position: 'relative' }}>
      <div
        className="flex-1 cursor-col-resize hover:bg-white/10 transition-colors"
        style={{ background: '#1a1a1a' }}
        onMouseDown={open ? onMouseDown : undefined}
      />
      <button
        onClick={onToggle}
        className="flex-shrink-0 flex items-center justify-center h-10 w-full text-[var(--color-subtle)] hover:text-white hover:bg-white/5 transition-colors"
        style={{ background: '#1a1a1a' }}
        title={open ? 'Collapse panel' : 'Expand panel'}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path
            d={open ? chevronOpen : chevronClosed}
            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}

// ── Editor page ───────────────────────────────────────────────

export function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const {
    isApiKeyModalOpen, setApiKeyModalOpen,
    isConfigPanelOpen, setConfigPanelOpen,
    nodes, edges, workflowName, dbId,
    loadWorkflow, saveStatus, setSaveStatus,
    executionState, versionsOpen,
  } = useWorkflowStore(
    useShallow((s) => ({
      isApiKeyModalOpen: s.isApiKeyModalOpen,
      setApiKeyModalOpen: s.setApiKeyModalOpen,
      isConfigPanelOpen: s.isConfigPanelOpen,
      setConfigPanelOpen: s.setConfigPanelOpen,
      nodes: s.nodes,
      edges: s.edges,
      workflowName: s.workflowName,
      dbId: s.dbId,
      loadWorkflow: s.loadWorkflow,
      saveStatus: s.saveStatus,
      setSaveStatus: s.setSaveStatus,
      executionState: s.executionState,
      versionsOpen: s.versionsOpen,
    })),
  )

  const [leftOpen, setLeftOpen] = useState(true)
  const left = useResizable(DEFAULT_LEFT, MIN_LEFT, MAX_LEFT, 'left')
  const right = useResizable(DEFAULT_RIGHT, MIN_RIGHT, MAX_RIGHT, 'right')
  const [theme] = useState<Theme>(getInitialTheme)
  const [lastRun, setLastRun] = useState<{ id: string; createdAt: string } | null>(null)

  useEffect(() => {
    if (!dbId) { setLastRun(null); return }
    fetch(`${API}/api/workflows/${dbId}/runs`)
      .then((r) => r.json())
      .then((runs: Array<{ id: string; created_at: string }>) => {
        if (runs.length > 0) setLastRun({ id: runs[0].id, createdAt: runs[0].created_at })
      })
      .catch(() => { })
  }, [dbId])

  // ── Load workflow from DB on mount / id change ────────────
  const loadedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!id || loadedIdRef.current === id) return
    loadedIdRef.current = id
    getWorkflow(id)
      .then((wf) => {
        const ast = {
          version: '1.0' as const,
          name: wf.name,
          nodes: wf.nodes,
          edges: wf.edges,
          createdAt: wf.created_at,
        }
        loadWorkflow(ast, wf.id)
      })
      .catch(() => navigate('/workflows'))
  }, [id, loadWorkflow, navigate])

  // ── Mark unsaved when canvas changes (after initial load) ──
  const initialLoadDone = useRef(false)
  useEffect(() => {
    if (!initialLoadDone.current) {
      // Skip the very first render after loadWorkflow
      initialLoadDone.current = true
      return
    }
    if (saveStatus === 'saving') return
    setSaveStatus('unsaved')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, workflowName])

  // Reset the "skip first render" flag whenever we navigate to a new workflow
  useEffect(() => {
    initialLoadDone.current = false
  }, [id])

  // ── Schedule auto-sync ────────────────────────────────────────
  // Auto-create the DB schedule record when a ScheduledTrigger node is dropped
  // onto the canvas, and delete it when the node is removed.
  const scheduleTrackInit = useRef(false)
  const prevHadScheduledTrigger = useRef(false)
  const pendingScheduleCreate = useRef(false)
  const prevDbIdForSchedule = useRef<string | undefined>(undefined)

  // Reset tracking state on workflow change
  useEffect(() => {
    scheduleTrackInit.current = false
    prevHadScheduledTrigger.current = false
    pendingScheduleCreate.current = false
    prevDbIdForSchedule.current = undefined
  }, [id])

  // Detect node add / remove
  useEffect(() => {
    const hasScheduled = nodes.some((n) => n.type === 'scheduledTrigger')
    if (!scheduleTrackInit.current) {
      // Wait until the workflow is fully loaded (dbId set) before initializing.
      // Without this guard, the transition from "empty store" → "loaded nodes" would
      // be misread as a user dropping the node, triggering a spurious auto-POST that
      // overwrites whatever schedule the user had already configured.
      if (!dbId) return
      scheduleTrackInit.current = true
      prevHadScheduledTrigger.current = hasScheduled
      return
    }
    const prev = prevHadScheduledTrigger.current
    prevHadScheduledTrigger.current = hasScheduled
    if (hasScheduled === prev) return

    if (hasScheduled && !prev) {
      // Node was added
      if (dbId) {
        void fetch(`${API}/api/workflows/${dbId}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frequency: 'daily', run_time: '09:00', day_of_week: 0, day_of_month: 1, repeat: true, enabled: true }),
        })
      } else {
        pendingScheduleCreate.current = true
      }
    } else {
      // Node was removed
      pendingScheduleCreate.current = false
      if (dbId) {
        void fetch(`${API}/api/workflows/${dbId}/schedule`, { method: 'DELETE' })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, dbId])

  // If dbId arrives after node was already added (new workflow flow)
  useEffect(() => {
    const prevId = prevDbIdForSchedule.current
    prevDbIdForSchedule.current = dbId
    if (dbId && !prevId && pendingScheduleCreate.current) {
      pendingScheduleCreate.current = false
      void fetch(`${API}/api/workflows/${dbId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency: 'daily', run_time: '09:00', day_of_week: 0, day_of_month: 1, repeat: true, enabled: true }),
      })
    }
  }, [dbId])

  // ── Save function ─────────────────────────────────────────
  const isSavingRef = useRef(false)

  async function handleSave() {
    if (isSavingRef.current || !dbId) return
    isSavingRef.current = true
    setSaveStatus('saving')
    try {
      const ast = serializeToAST(nodes, edges, workflowName)
      await saveWorkflow(ast, dbId)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('unsaved')
    } finally {
      isSavingRef.current = false
    }
  }

  // ── Autosave every 10 s ───────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (saveStatus === 'unsaved' && executionState !== 'running') {
        void handleSave()
      }
    }, 10_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveStatus, executionState, nodes, edges, workflowName, dbId])

  // ── Cmd/Ctrl+S keybinding ─────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, workflowName, dbId, saveStatus])

  // ── Layout ────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col overflow-hidden bg-[var(--color-canvas)] text-[var(--color-text)]"
      style={{ height: '100dvh' }}
    >
      {/* Top header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 border-b border-[var(--color-border)]"
        style={{ height: 52 }}
      >
        {/* Left: brand icon + home */}
        <div className="flex items-center gap-1" style={{ minWidth: 160 }}>
          {/* Brand / app icon */}
          <button
            onClick={() => navigate('/workflows')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text)] hover:bg-white/5 transition-colors"
            title="All Workflows"
          >
            <FloweIcon size={20} />
          </button>
          {/* Home icon */}
          <button
            onClick={() => navigate('/')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/5 transition-colors"
            title="Home"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M2 7L8 2l6 5v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M6 14V9h4v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Center: workflow name + chevron */}
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-semibold text-[var(--color-text)]">{workflowName}</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--color-muted)]">
            <path d="M4 5.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Right: last run + Save + Publish */}
        <div className="flex items-center gap-2.5" style={{ minWidth: 160, justifyContent: 'flex-end' }}>
          {/* Last run info */}
          {lastRun && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-[var(--color-muted)]">Last run {formatRunTime(lastRun.createdAt)}</span>
              <button
                onClick={() => navigate(`/runs/${lastRun.id}`)}
                className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
              >
                View logs
              </button>
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || saveStatus === 'saved'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[12px] font-medium text-[var(--color-text)] hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
              <path d="M2 2.5A.5.5 0 012.5 2h7l1.5 1.5v7a.5.5 0 01-.5.5h-8a.5.5 0 01-.5-.5v-8z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
              <rect x="4.5" y="2" width="4" height="3" rx=".3" stroke="currentColor" strokeWidth="1.1" />
              <rect x="3.5" y="7" width="6" height="4" rx=".4" stroke="currentColor" strokeWidth="1.1" />
            </svg>
            Save
          </button>

          {/* Publish */}
          <button className="flex items-center px-3 py-1.5 rounded-lg bg-white text-black text-[12px] font-semibold hover:opacity-90 transition-opacity">
            Publish
          </button>
        </div>
      </header>

      {/* Main content row */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left panel */}
        {leftOpen && (
          <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: left.width }}>
            <NodePalette onCollapse={() => setLeftOpen(false)} />
          </div>
        )}

        <ResizeHandle
          onMouseDown={left.onMouseDown}
          onToggle={() => setLeftOpen((o) => !o)}
          open={leftOpen}
          chevronOpen="M6 1L2 4l4 3"
          chevronClosed="M2 1l4 3-4 3"
        />

        <div className="flex min-w-0 flex-1 flex-col bg-[var(--color-canvas)]">
          <ReactFlowProvider>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <Canvas theme={theme} />
              <BottomToolDock onSave={handleSave} />
            </div>
          </ReactFlowProvider>
          <ExecutionPanel />
        </div>

        <ResizeHandle
          onMouseDown={right.onMouseDown}
          onToggle={() => setConfigPanelOpen(!isConfigPanelOpen)}
          open={isConfigPanelOpen}
          chevronOpen="M2 1l4 3-4 3"
          chevronClosed="M6 1L2 4l4 3"
        />

        {isConfigPanelOpen && (
          <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: right.width }}>
            {versionsOpen ? (
              <aside className="flex h-full w-full flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex flex-shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Workflow</p>
                  <p className="text-[13px] font-semibold text-[var(--color-text)] ml-1">Version History</p>
                </div>
                {dbId ? (
                  <VersionsPanel workflowId={dbId} />
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
                    <p className="text-[12px] text-[var(--color-muted)]">Save the workflow first to manage version history.</p>
                  </div>
                )}
              </aside>
            ) : (
              <ConfigPanel />
            )}
          </div>
        )}

        {(left.dragging || right.dragging) && (
          <div className="fixed inset-0 z-[9999] cursor-col-resize" />
        )}

      </div>{/* end main content row */}

      {isApiKeyModalOpen && (
        <ApiKeyModal onClose={() => setApiKeyModalOpen(false)} />
      )}
    </div>
  )
}
