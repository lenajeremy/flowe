import { useRef, useState, useEffect } from 'react'
import LiquidGlass from 'liquid-glass-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { serializeToAST } from '@/lib/executor'
import { listWorkflows, type SavedWorkflow } from '@/lib/workflowApi'
import { consumeRunStream } from '@/lib/runStream'
import type { WorkflowAST, ExecutionEvent } from '@/types/workflow'
import { API } from '@/lib/config'

function Divider() {
  return <div className="mx-1 h-4 w-px flex-shrink-0 bg-white/10" />
}

function ToolBtn({
  title, onClick, active, disabled, children,
}: {
  title: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-white/15 text-white'
          : 'text-[var(--color-muted)] hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
      <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function BottomToolDock({ onSave }: { onSave?: () => void } = {}) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const connectedRunRef = useRef<string | null>(null)
  const runAbortRef = useRef<AbortController | null>(null)
  const [tabsOpen, setTabsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const {
    tabs, activeTabId, switchTab, closeTab,
    undo, redo,
    executionState, nodes, edges,
    workflowName, setWorkflowName,
    saveStatus, dbId,
    setApiKeyModalOpen, importWorkflowAsNewTab,
    resetNodeExecutionStatuses, clearExecutionLog,
    setExecutionState, appendExecutionEvent,
    setNodeExecutionStatus, setLogPanelOpen,
    setPendingApproval, setCurrentRunId,
    versionsOpen, setVersionsOpen,
    activeTool, setActiveTool,
  } = useWorkflowStore(
    useShallow((s) => ({
      tabs: s.tabs,
      activeTabId: s.activeTabId,
      switchTab: s.switchTab,
      closeTab: s.closeTab,
      undo: s.undo,
      redo: s.redo,
      executionState: s.executionState,
      nodes: s.nodes,
      edges: s.edges,
      workflowName: s.workflowName,
      setWorkflowName: s.setWorkflowName,
      saveStatus: s.saveStatus,
      dbId: s.dbId,
      setApiKeyModalOpen: s.setApiKeyModalOpen,
      importWorkflowAsNewTab: s.importWorkflowAsNewTab,
      resetNodeExecutionStatuses: s.resetNodeExecutionStatuses,
      clearExecutionLog: s.clearExecutionLog,
      setExecutionState: s.setExecutionState,
      appendExecutionEvent: s.appendExecutionEvent,
      setNodeExecutionStatus: s.setNodeExecutionStatus,
      setLogPanelOpen: s.setLogPanelOpen,
      setPendingApproval: s.setPendingApproval,
      setCurrentRunId: s.setCurrentRunId,
      versionsOpen: s.versionsOpen,
      setVersionsOpen: s.setVersionsOpen,
      activeTool: s.activeTool,
      setActiveTool: s.setActiveTool,
    })),
  )

  const isRunning = executionState === 'running'

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTabsOpen(false)
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Shared event handler factory — closes over store actions so all three stream
  // consumers (manual run, external URL run, scheduled poll) share one code path.
  // `initialFallback` is used as the runId for node_waiting when the event itself
  // doesn't carry one; for manual runs it gets updated from workflow_started.
  function makeEventHandler(initialFallback: string): (event: ExecutionEvent) => void {
    const nodeOutputs = new Map<string, string>()
    let fallback = initialFallback
    return (event: ExecutionEvent) => {
      appendExecutionEvent(event)
      const nid = event.nodeId
      switch (event.type) {
        case 'workflow_started':
          if (event.runId) { fallback = event.runId; setCurrentRunId(event.runId) }
          break
        case 'node_started':
          if (nid) setNodeExecutionStatus(nid, 'running')
          break
        case 'node_output':
          if (nid && event.output !== undefined) nodeOutputs.set(nid, event.output)
          break
        case 'node_completed':
          if (nid) setNodeExecutionStatus(nid, 'completed', nodeOutputs.get(nid))
          break
        case 'node_error':
          if (nid) setNodeExecutionStatus(nid, 'error', event.message)
          break
        case 'node_waiting':
          if (nid) {
            setNodeExecutionStatus(nid, 'waiting')
            setPendingApproval({
              runId: event.runId ?? fallback,
              nodeId: nid,
              message: event.message ?? 'Please review and approve or reject this step.',
            })
          }
          break
        case 'workflow_completed':
          setExecutionState('completed')
          break
        case 'workflow_error':
          setExecutionState('error')
          break
      }
    }
  }

  // Auto-connect to a run stream when ?runId= is present in the URL (e.g. from webhook trigger page).
  // We wait for dbId to be set (workflow loaded) so loadWorkflow() doesn't wipe execution state.
  useEffect(() => {
    const externalRunId = searchParams.get('runId')
    if (!externalRunId || !dbId || connectedRunRef.current === externalRunId) return
    connectedRunRef.current = externalRunId

    resetNodeExecutionStatuses()
    clearExecutionLog()
    setExecutionState('running')
    setLogPanelOpen(true)
    setPendingApproval(null)
    setCurrentRunId(externalRunId)

    void (async () => {
      try {
        const response = await fetch(`${API}/api/runs/${externalRunId}/stream`)
        if (!response.ok || !response.body) throw new Error(`Server error ${response.status}`)
        await consumeRunStream(response.body.getReader(), makeEventHandler(externalRunId))
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        appendExecutionEvent({
          id: crypto.randomUUID(),
          type: 'workflow_error',
          message: `Stream error: ${message}`,
          timestamp: 0,
        })
        setExecutionState('error')
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, dbId])

  // Subscribe to workflow-level run-start events so the canvas updates immediately
  // when a scheduled or webhook run fires — without polling and without a race condition.
  useEffect(() => {
    if (!dbId || isRunning) return

    const controller = new AbortController()

    void (async () => {
      try {
        const response = await fetch(`${API}/api/workflows/${dbId}/events`, { signal: controller.signal })
        if (!response.ok || !response.body) return

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const run_id = line.slice(6).trim()
            if (!run_id || connectedRunRef.current === run_id) continue

            connectedRunRef.current = run_id
            resetNodeExecutionStatuses()
            clearExecutionLog()
            setExecutionState('running')
            setLogPanelOpen(true)
            setPendingApproval(null)
            setCurrentRunId(run_id)

            const streamRes = await fetch(`${API}/api/runs/${run_id}/stream`)
            if (!streamRes.ok || !streamRes.body) continue
            await consumeRunStream(streamRes.body.getReader(), makeEventHandler(run_id))
          }
        }
      } catch {
        // connection closed or aborted — fine
      }
    })()

    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbId, isRunning])

  // Fetch saved workflows whenever the tabs popover opens
  useEffect(() => {
    if (!tabsOpen) return
    setSavedLoading(true)
    listWorkflows()
      .then(setSavedWorkflows)
      .catch(() => setSavedWorkflows([]))
      .finally(() => setSavedLoading(false))
  }, [tabsOpen])

  async function handleNewWorkflow() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch(`${API}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Workflow', nodes: [], edges: [] }),
      })
      const wf = await res.json() as SavedWorkflow
      setTabsOpen(false)
      navigate(`/workflow/${wf.id}`)
    } catch {
      // ignore
    } finally {
      setCreating(false)
    }
  }

  function handleStop() {
    runAbortRef.current?.abort()
    runAbortRef.current = null
    setExecutionState('idle')
    resetNodeExecutionStatuses()
  }

  function handleRun() {
    if (isRunning) return
    resetNodeExecutionStatuses()
    clearExecutionLog()
    setExecutionState('running')
    setLogPanelOpen(true)
    setPendingApproval(null)
    setCurrentRunId(null)

    const controller = new AbortController()
    runAbortRef.current = controller

    void (async () => {
      const ast = serializeToAST(nodes, edges, workflowName)
      const startTime = Date.now()
      try {
        const response = await fetch(`${API}/api/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflow: ast, workflowId: dbId ?? '' }),
          signal: controller.signal,
        })
        if (!response.ok || !response.body) throw new Error(`Server error ${response.status}`)
        await consumeRunStream(response.body.getReader(), makeEventHandler(''))
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        const message = err instanceof Error ? err.message : String(err)
        appendExecutionEvent({
          id: crypto.randomUUID(),
          type: 'workflow_error',
          message: `Connection error: ${message}`,
          timestamp: Date.now() - startTime,
        })
        setExecutionState('error')
      } finally {
        runAbortRef.current = null
      }
    })()
  }

  function handleExport() {
    const ast = serializeToAST(nodes, edges, workflowName)
    const blob = new Blob([JSON.stringify(ast, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflowName.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const ast = JSON.parse(ev.target?.result as string) as WorkflowAST
        if (!ast.nodes || !ast.edges) throw new Error('Invalid workflow JSON')
        importWorkflowAsNewTab(ast)
      } catch (err) {
        alert(`Failed to import: ${err instanceof Error ? err.message : 'Invalid JSON'}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const activeTab = tabs.find((t) => t.id === activeTabId)

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-x-0 bottom-5 z-40 flex flex-col items-center gap-2"
    >
      {/* Tabs popover */}
      {tabsOpen && (
        <div
          className="pointer-events-auto overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] shadow-[var(--dock-shadow)]"
          style={{ minWidth: '13rem' }}
        >
          {/* Open tabs */}
          <div className="max-h-48 overflow-y-auto">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId
              return (
                <div
                  key={tab.id}
                  className={`group flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors ${
                    isActive ? 'bg-[var(--color-surface2)]' : 'hover:bg-[var(--color-surface2)]'
                  }`}
                  onClick={() => {
                    if (tab.dbId) {
                      // URL-backed workflow: navigate to its route
                      navigate(`/workflow/${tab.dbId}`)
                    } else {
                      switchTab(tab.id)
                    }
                    setTabsOpen(false)
                  }}
                >
                  <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${isActive ? 'bg-[var(--color-accent)]' : ''}`} />
                  <span className="flex-1 truncate text-xs text-[var(--color-text)]">{tab.workflowName}</span>
                  {tab.dbId && (
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 text-[var(--color-muted)]">
                      <path d="M5 1v3M5 4l2 1M1 7c0-1.1 1.8-2 4-2s4 .9 4 2v1c0 1.1-1.8 2-4 2S1 9.1 1 8V7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  )}
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                      className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-[var(--color-border)] hover:text-[var(--color-text)] group-hover:opacity-100 text-[var(--color-muted)]"
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Saved workflows */}
          <div className="border-t border-[var(--color-border)]">
            <p className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-widest text-[var(--color-muted)]">
              Saved
            </p>
            <div className="max-h-40 overflow-y-auto">
              {savedLoading && (
                <p className="px-3 py-2 text-[11px] text-[var(--color-muted)]">Loading…</p>
              )}
              {!savedLoading && savedWorkflows.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-[var(--color-muted)]">No saved workflows yet</p>
              )}
              {!savedLoading && savedWorkflows.map((wf) => {
                const alreadyOpen = tabs.some((t) => t.dbId === wf.id)
                return (
                  <div
                    key={wf.id}
                    className="group flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors hover:bg-[var(--color-surface2)]"
                    onClick={() => {
                      navigate(`/workflow/${wf.id}`)
                      setTabsOpen(false)
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 text-[var(--color-muted)]">
                      <path d="M5 1v3M5 4l2 1M1 7c0-1.1 1.8-2 4-2s4 .9 4 2v1c0 1.1-1.8 2-4 2S1 9.1 1 8V7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    <span className="flex-1 truncate text-xs text-[var(--color-text)]">{wf.name}</span>
                    {alreadyOpen
                      ? <span className="text-[9px] text-[var(--color-accent)]">open</span>
                      : <span className="text-[9px] text-[var(--color-muted)] opacity-0 group-hover:opacity-100">open</span>
                    }
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] p-1">
            <button
              onClick={handleNewWorkflow}
              disabled={creating}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)] disabled:opacity-50"
            >
              {creating ? (
                <Spinner />
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              )}
              New workflow
            </button>
          </div>
        </div>
      )}

      {/* Main pill */}
      <LiquidGlass
        cornerRadius={999}
        displacementScale={40}
        blurAmount={0.05}
        saturation={130}
        aberrationIntensity={1.5}
        className="pointer-events-auto"
      >
      <div
        className="relative flex items-center gap-0 px-1 py-1 rounded-full"
        style={{ background: 'rgba(10,10,10,0.6)' }}
      >
        {/* Select */}
        <ToolBtn title="Select (V)" onClick={() => setActiveTool('select')} active={activeTool === 'select'}>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
            <path d="M3.5 2l9 5.5-5 .8-2.2 4.7L3.5 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          </svg>
        </ToolBtn>

        {/* Hand */}
        <ToolBtn title="Hand (H)" onClick={() => setActiveTool('hand')} active={activeTool === 'hand'}>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
            <path d="M6 1.5v6M9 3v4.5M3 5v3.5M12 5.5v2.5a4 4 0 01-4 4H6a4 4 0 01-4-4V7.5a1 1 0 012 0V9" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 5.5a1 1 0 00-2 0M9 3a1 1 0 00-2 0M6 1.5a1 1 0 00-2 0" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
          </svg>
        </ToolBtn>

        <Divider />

        {/* Undo */}
        <ToolBtn title="Undo (⌘Z)" onClick={undo} disabled={isRunning}>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
            <path d="M2.5 6.5A5.5 5.5 0 0113 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M2.5 3.5v3.5H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </ToolBtn>

        {/* Redo */}
        <ToolBtn title="Redo (⌘⇧Z)" onClick={redo} disabled={isRunning}>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
            <path d="M12.5 6.5A5.5 5.5 0 002 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M12.5 3.5v3.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </ToolBtn>

        {/* Save */}
        {onSave && (
          <ToolBtn
            title={saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save (⌘S)'}
            onClick={onSave}
            disabled={isRunning || saveStatus === 'saving' || saveStatus === 'saved'}
            active={saveStatus === 'saved'}
          >
            {saveStatus === 'saving' ? (
              <Spinner />
            ) : saveStatus === 'saved' ? (
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 2.5A.5.5 0 012.5 2h7l1.5 1.5v7a.5.5 0 01-.5.5h-8a.5.5 0 01-.5-.5v-8z"
                  stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
                <rect x="4.5" y="2" width="4" height="3" rx=".3" stroke="currentColor" strokeWidth="1.1"/>
                <rect x="3.5" y="7" width="6" height="4" rx=".4" stroke="currentColor" strokeWidth="1.1"/>
              </svg>
            )}
          </ToolBtn>
        )}

        <Divider />

        {/* Tabs — icon only, count badge */}
        <div className="relative">
          <ToolBtn
            title={activeTab?.workflowName ?? 'Workflows'}
            onClick={() => { setTabsOpen((o) => !o); setMoreOpen(false) }}
            active={tabsOpen}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1.5" width="12" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="1" y="8.5" width="12" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            {tabs.length > 1 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[8px] font-bold text-white">
                {tabs.length}
              </span>
            )}
          </ToolBtn>
        </div>

        <Divider />

        {/* Run / Stop */}
        {isRunning ? (
          <button
            onClick={handleStop}
            className="flex h-8 items-center gap-1.5 rounded-full bg-red-500/15 px-3.5 text-[11px] font-semibold text-red-400 ring-1 ring-red-500/30 transition-all hover:bg-red-500/25 active:scale-95"
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
              <rect x="1" y="1" width="7" height="7" rx="1.5"/>
            </svg>
            Stop
          </button>
        ) : (
          <button
            onClick={handleRun}
            className="flex h-8 items-center gap-1.5 rounded-full bg-white px-3.5 text-[11px] font-semibold text-black transition-all hover:opacity-90 active:scale-95"
            style={{ boxShadow: '0 0 16px rgba(255,255,255,0.2)' }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 1.5l7 3.5-7 3.5V1.5z"/>
            </svg>
            {executionState === 'completed' ? 'Re-run' : 'Run'}
          </button>
        )}

        <Divider />

        {/* More */}
        <div className="relative">
          <ToolBtn
            title="More options"
            onClick={() => { setMoreOpen((o) => !o); setTabsOpen(false) }}
            active={moreOpen}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="7" cy="3.5" r="1.1"/>
              <circle cx="7" cy="7" r="1.1"/>
              <circle cx="7" cy="10.5" r="1.1"/>
            </svg>
          </ToolBtn>

          {moreOpen && (
            <div
              className="absolute bottom-full mb-2 right-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] shadow-[var(--dock-shadow)]"
              style={{ minWidth: '14rem' }}
            >
              <div className="border-b border-[var(--color-border)] px-3 py-2.5">
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Workflow name</p>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]"
                  placeholder="Untitled Workflow"
                />
              </div>
              <div className="p-1">
                <button
                  onClick={() => { setApiKeyModalOpen(true); setMoreOpen(false) }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface2)]"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="5" cy="5" r="2.8" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M7 7l4 4M9 9l1.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  API Keys
                </button>
                <button
                  onClick={() => { fileInputRef.current?.click(); setMoreOpen(false) }}
                  disabled={isRunning}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface2)] disabled:opacity-40"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 8.5V1M4 4l2.5-3 2.5 3M2 10h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Import
                </button>
                <button
                  onClick={() => { handleExport(); setMoreOpen(false) }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface2)]"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1v7.5M4 5.5l2.5 3 2.5-3M2 10h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Export
                </button>
                <button
                  onClick={() => { navigate('/workflows'); setMoreOpen(false) }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface2)]"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M5 2H2.5A.5.5 0 002 2.5v8a.5.5 0 00.5.5H6M8 2h2.5a.5.5 0 01.5.5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    <path d="M8 9.5h4M10 7.5l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  All Workflows
                </button>
                <button
                  onClick={() => { setVersionsOpen(!versionsOpen); setMoreOpen(false) }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-[var(--color-surface2)] ${versionsOpen ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M6.5 4v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 2l2 2M11 2l-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  {versionsOpen ? 'Hide Versions' : 'Version History'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </LiquidGlass>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFile}
      />
    </div>
  )
}
