import { useRef, useState, useEffect } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { runWorkflow, serializeToAST } from '@/lib/executor'
import type { WorkflowAST } from '@/types/workflow'

function Divider() {
  return <div className="mx-1 h-4 w-px flex-shrink-0 bg-[var(--color-border)]" />
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
          ? 'bg-[var(--color-accent)] text-white'
          : 'text-[var(--color-muted)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)]'
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

export function BottomToolDock() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tabsOpen, setTabsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const {
    tabs, activeTabId, switchTab, closeTab, addTab,
    undo, redo,
    executionState, nodes, edges,
    workflowName, setWorkflowName,
    setApiKeyModalOpen, importWorkflowAsNewTab,
    resetNodeExecutionStatuses, clearExecutionLog,
    setExecutionState, appendExecutionEvent,
    setNodeExecutionStatus, setLogPanelOpen,
  } = useWorkflowStore(
    useShallow((s) => ({
      tabs: s.tabs,
      activeTabId: s.activeTabId,
      switchTab: s.switchTab,
      closeTab: s.closeTab,
      addTab: s.addTab,
      undo: s.undo,
      redo: s.redo,
      executionState: s.executionState,
      nodes: s.nodes,
      edges: s.edges,
      workflowName: s.workflowName,
      setWorkflowName: s.setWorkflowName,
      setApiKeyModalOpen: s.setApiKeyModalOpen,
      importWorkflowAsNewTab: s.importWorkflowAsNewTab,
      resetNodeExecutionStatuses: s.resetNodeExecutionStatuses,
      clearExecutionLog: s.clearExecutionLog,
      setExecutionState: s.setExecutionState,
      appendExecutionEvent: s.appendExecutionEvent,
      setNodeExecutionStatus: s.setNodeExecutionStatus,
      setLogPanelOpen: s.setLogPanelOpen,
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

  function handleRun() {
    if (isRunning) return
    resetNodeExecutionStatuses()
    clearExecutionLog()
    setExecutionState('running')
    setLogPanelOpen(true)
    void runWorkflow({
      nodes, edges, workflowName,
      setExecutionState, appendExecutionEvent,
      setNodeExecutionStatus, setLogPanelOpen,
    })
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
          <div className="max-h-64 overflow-y-auto">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId
              return (
                <div
                  key={tab.id}
                  className={`group flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors ${
                    isActive ? 'bg-[var(--color-surface2)]' : 'hover:bg-[var(--color-surface2)]'
                  }`}
                  onClick={() => { switchTab(tab.id); setTabsOpen(false) }}
                >
                  <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${isActive ? 'bg-[var(--color-accent)]' : ''}`} />
                  <span className="flex-1 truncate text-xs text-[var(--color-text)]">{tab.workflowName}</span>
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
          <div className="border-t border-[var(--color-border)] p-1">
            <button
              onClick={() => { addTab(); setTabsOpen(false) }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)]"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              New workflow
            </button>
          </div>
        </div>
      )}

      {/* Main pill */}
      <div
        className="pointer-events-auto relative flex items-center gap-0 rounded-full border border-[var(--color-border)] bg-[var(--color-elevated)]/95 px-1 py-1 backdrop-blur"
        style={{ boxShadow: 'var(--dock-shadow)' }}
      >
        {/* Select */}
        <ToolBtn title="Select" active>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
            <path d="M3.5 2l9 5.5-5 .8-2.2 4.7L3.5 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
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

        {/* Run */}
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={`flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-semibold transition-all ${
            isRunning
              ? 'cursor-not-allowed bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
              : 'bg-[var(--color-accent)] text-white hover:opacity-90 active:scale-95'
          }`}
        >
          {isRunning ? <Spinner /> : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 1.5l7 3.5-7 3.5V1.5z"/>
            </svg>
          )}
          {isRunning ? 'Running…' : executionState === 'completed' ? 'Re-run' : 'Run'}
        </button>

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
              </div>
            </div>
          )}
        </div>
      </div>

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
