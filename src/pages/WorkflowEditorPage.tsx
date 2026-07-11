import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import { NodePalette, type LeftTab } from '@/components/panels/NodePalette'
import { ConfigPanel } from '@/components/panels/ConfigPanel'
import { VersionsPanel } from '@/components/panels/VersionsPanel'
import { Canvas } from '@/components/Canvas'
import { ExecutionPanel } from '@/components/ExecutionPanel'
import { ApiKeyModal } from '@/components/ApiKeyModal'
import { FloweIcon } from '@/components/FloweIcon'
import { useRunStreamBridge } from '@/lib/runController'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { getWorkflow, saveWorkflow } from '@/lib/workflowApi'
import { serializeToAST } from '@/lib/executor'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import { useTheme } from '@/lib/theme'
import { UserMenu } from '@/components/ui/UserMenu'

// ── Resize logic (unchanged from original App.tsx) ───────────

const MIN_LEFT = 120
const MAX_LEFT = 480
const DEFAULT_LEFT = 450

function formatRunTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).toLowerCase().replace(' ', '')
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
        className="flex-1 cursor-col-resize transition-colors duration-150 hover:bg-[var(--color-accent)]/40"
        style={{ background: 'var(--color-surface2)' }}
        onMouseDown={open ? onMouseDown : undefined}
      />
      <button
        onClick={onToggle}
        className="flex-shrink-0 flex items-center justify-center h-10 w-full text-[var(--color-subtle)] transition-colors duration-150 hover:text-[var(--color-text)]"
        style={{ background: 'var(--color-surface2)' }}
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
    nodes, edges, workflowName, setWorkflowName, dbId,
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
      setWorkflowName: s.setWorkflowName,
      dbId: s.dbId,
      loadWorkflow: s.loadWorkflow,
      saveStatus: s.saveStatus,
      setSaveStatus: s.setSaveStatus,
      executionState: s.executionState,
      versionsOpen: s.versionsOpen,
    })),
  )

  const [leftOpen, setLeftOpen] = useState(true)
  const [paletteTab, setPaletteTab] = useState<LeftTab>('chat')
  const left = useResizable(DEFAULT_LEFT, MIN_LEFT, MAX_LEFT, 'left')
  const { resolved: theme } = useTheme()
  const [lastRun, setLastRun] = useState<{ id: string; createdAt: string } | null>(null)

  // Connects ?runId= streams + scheduled/webhook run pushes to the canvas
  useRunStreamBridge()

  // ── Published ("live") state — Figma frames 163-167 ────────
  const [published, setPublished] = useState(false)
  useEffect(() => {
    setPublished(id ? window.localStorage.getItem(`flowe-published-${id}`) === '1' : false)
  }, [id])

  function handlePublish() {
    if (!id) return
    window.localStorage.setItem(`flowe-published-${id}`, '1')
    setPublished(true)
    void handleSave()
  }

  useEffect(() => {
    if (!dbId) { setLastRun(null); return }
    apiFetch(`${API}/api/workflows/${dbId}/runs`)
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
        void apiFetch(`${API}/api/workflows/${dbId}/schedule`, {
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
        void apiFetch(`${API}/api/workflows/${dbId}/schedule`, { method: 'DELETE' })
      }
    }
  }, [nodes, dbId])

  // If dbId arrives after node was already added (new workflow flow)
  useEffect(() => {
    const prevId = prevDbIdForSchedule.current
    prevDbIdForSchedule.current = dbId
    if (dbId && !prevId && pendingScheduleCreate.current) {
      pendingScheduleCreate.current = false
      void apiFetch(`${API}/api/workflows/${dbId}/schedule`, {
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
      {/* Top header — Figma spec: 60px chrome bar, 24px bottom radii */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4"
        style={{
          height: 60,
          background: 'var(--color-chip)',
          borderBottom: '1px solid var(--color-chip-border2)',
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          // Above the floating config/versions overlays (z-20) so header
          // dropdowns (UserMenu) aren't caught under their backdrop blur.
          zIndex: 30,
          position: 'relative',
        }}
      >
        {/* Left: brand icon + home */}
        <div className="flex items-center gap-1" style={{ minWidth: 160 }}>
          <button
            onClick={() => navigate('/workflows')}
            className="pressable flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text)] hover:bg-[var(--color-hover)]"
            title="All Workflows"
          >
            <FloweIcon size={20} />
          </button>
          <button
            onClick={() => navigate('/')}
            className="pressable flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)]"
            title="Home"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M2 7L8 2l6 5v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M6 14V9h4v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Center: workflow name (editable in place) + chevron */}
        <div className="flex items-center gap-1.5">
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            aria-label="Workflow name"
            size={Math.max(workflowName.length, 8)}
            className="rounded-md border border-transparent bg-transparent px-1 py-0.5 text-center text-[14px] font-semibold text-[var(--color-text)] outline-none transition-colors duration-150 hover:border-[var(--color-border)] focus:border-[var(--color-border2)] focus:bg-[var(--color-hover)]"
          />
          {/* "live" badge — Figma frames 163-167 */}
          {published && (
            <span
              className="rounded-[15px] px-2 py-0.5 text-[10px] font-medium uppercase"
              style={{ color: 'var(--color-ok)', background: 'var(--tint-ok)', letterSpacing: '0.04em' }}
            >
              live
            </span>
          )}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--color-muted)]">
            <path d="M4 5.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Right: last run + Save + Publish */}
        <div className="flex items-center gap-2.5" style={{ minWidth: 160, justifyContent: 'flex-end' }}>
          {lastRun && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ok)] flex-shrink-0" />
              <span className="text-[var(--color-muted)]">Last run {formatRunTime(lastRun.createdAt)}</span>
              <button
                onClick={() => navigate(`/run/${lastRun.id}`)}
                className="font-medium text-[var(--color-accent)] transition-opacity hover:opacity-80"
              >
                View logs
              </button>
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || saveStatus === 'saved'}
            className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[12px] font-medium text-[var(--color-text)] hover:bg-[var(--color-hover)] disabled:opacity-50"
          >
            {saveStatus === 'saving' ? (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="animate-spin">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
                <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : saveStatus === 'saved' ? (
              <svg width="11" height="11" viewBox="0 0 10 10" fill="none" className="text-[var(--color-ok)]">
                <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                <path d="M2 2.5A.5.5 0 012.5 2h7l1.5 1.5v7a.5.5 0 01-.5.5h-8a.5.5 0 01-.5-.5v-8z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
                <rect x="4.5" y="2" width="4" height="3" rx=".3" stroke="currentColor" strokeWidth="1.1" />
                <rect x="3.5" y="7" width="6" height="4" rx=".4" stroke="currentColor" strokeWidth="1.1" />
              </svg>
            )}
            {saveStatus === 'saving' ? 'Saving' : saveStatus === 'saved' ? 'Saved' : 'Save'}
          </button>

          {/* Publish */}
          <button
            onClick={handlePublish}
            className="pressable flex items-center px-3 py-1.5 rounded-lg bg-[var(--color-text)] text-[var(--color-canvas)] text-[12px] font-semibold hover:opacity-90"
          >
            {published ? 'Published' : 'Publish'}
          </button>

          <UserMenu />
        </div>
      </header>

      {/* Main content row */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left panel */}
        {leftOpen ? (
          <>
            <div
              className="flex-shrink-0 flex flex-col overflow-hidden border-r border-[var(--color-border)]"
              style={{ width: left.width }}
            >
              <NodePalette
                onCollapse={() => setLeftOpen(false)}
                tab={paletteTab}
                onTabChange={setPaletteTab}
              />
            </div>

            <ResizeHandle
              onMouseDown={left.onMouseDown}
              onToggle={() => setLeftOpen(false)}
              open
              chevronOpen="M6 1L2 4l4 3"
              chevronClosed="M2 1l4 3-4 3"
            />
          </>
        ) : (
          /* Collapsed icon rail — Figma frame 163: 52px, stacked tab icons */
          <div
            className="m-2 flex w-[52px] flex-shrink-0 flex-col items-center gap-[15px] rounded-xl py-4"
            style={{ background: 'var(--color-chip)' }}
          >
            <button
              type="button"
              onClick={() => { setPaletteTab('chat'); setLeftOpen(true) }}
              title="AI builder"
              className="flex h-7 w-7 items-center justify-center rounded-lg border transition-colors"
              style={{
                background: paletteTab === 'chat' ? 'var(--color-surface2)' : 'transparent',
                borderColor: 'var(--color-chip-border2)',
                boxShadow: 'inset 0px 2px 8px 0px var(--inset-hi-strong)',
              }}
            >
              <FloweIcon size={14} className={paletteTab === 'chat' ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'} />
            </button>
            <button
              type="button"
              onClick={() => { setPaletteTab('nodes'); setLeftOpen(true) }}
              title="Elements"
              className="flex h-7 w-7 items-center justify-center rounded-lg border text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
              style={{
                background: paletteTab === 'nodes' ? 'var(--color-surface2)' : 'transparent',
                borderColor: 'var(--color-chip-border2)',
                boxShadow: 'inset 0px 2px 8px 0px var(--inset-hi-strong)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M1.5 1.5h4v4h-4zM7.5 1.5h4v4h-4zM1.5 7.5h4v4h-4zM7.5 7.5h4v4h-4z"
                  stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Canvas — config panel overlays on top of this */}
        <div className="flex min-w-0 flex-1 flex-col bg-[var(--color-canvas)]">
          <ReactFlowProvider>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <Canvas theme={theme} />

              {/* Config / Versions panel — floating overlay, Figma frames 161-167 */}
              {isConfigPanelOpen && (
                <div
                  className="absolute flex flex-col overflow-hidden rounded-3xl border border-[var(--color-border)]"
                  style={{
                    top: 8, right: 8, bottom: 8, width: 349, zIndex: 20,
                    background: 'color-mix(in srgb, var(--color-elevated) 72%, transparent)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                >
                  {/* Close button — Figma: 24px square */}
                  <button
                    onClick={() => setConfigPanelOpen(false)}
                    className="absolute top-4 right-4 z-10 flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--color-chip-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                    title="Close panel"
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>

                  {versionsOpen ? (
                    <aside className="flex h-full w-full flex-col overflow-y-auto">
                      <div className="flex flex-shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
                        <p className="micro text-[var(--color-subtle)]">Workflow</p>
                        <p className="ml-1 text-[13px] font-semibold text-[var(--color-text)]">Version history</p>
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
            </div>
          </ReactFlowProvider>
          <ExecutionPanel />
        </div>

        {left.dragging && (
          <div className="fixed inset-0 z-[9999] cursor-col-resize" />
        )}

      </div>{/* end main content row */}

      {isApiKeyModalOpen && (
        <ApiKeyModal onClose={() => setApiKeyModalOpen(false)} />
      )}
    </div>
  )
}
