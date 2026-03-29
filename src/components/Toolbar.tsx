import { useRef } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { runWorkflow, serializeToAST } from '@/lib/executor'
import type { WorkflowAST } from '@/types/workflow'

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 9V1M4 4l3-3 3 3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 2l7 4-7 4V2z" fill="currentColor"/>
    </svg>
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

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    workflowName, setWorkflowName,
    executionState,
    nodes, edges,
    resetNodeExecutionStatuses, clearExecutionLog,
    setExecutionState, appendExecutionEvent,
    setNodeExecutionStatus, setLogPanelOpen,
    setApiKeyModalOpen,
    importWorkflowAsNewTab,
  } = useWorkflowStore(
    useShallow((s) => ({
      workflowName: s.workflowName,
      setWorkflowName: s.setWorkflowName,
      executionState: s.executionState,
      nodes: s.nodes,
      edges: s.edges,
      resetNodeExecutionStatuses: s.resetNodeExecutionStatuses,
      clearExecutionLog: s.clearExecutionLog,
      setExecutionState: s.setExecutionState,
      appendExecutionEvent: s.appendExecutionEvent,
      setNodeExecutionStatus: s.setNodeExecutionStatus,
      setLogPanelOpen: s.setLogPanelOpen,
      setApiKeyModalOpen: s.setApiKeyModalOpen,
      importWorkflowAsNewTab: s.importWorkflowAsNewTab,
    })),
  )

  const isRunning = executionState === 'running'

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
    // Reset so the same file can be re-imported
    e.target.value = ''
  }

  return (
    <header className="h-12 flex items-center px-4 gap-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="3" cy="6" r="2" fill="white"/>
            <circle cx="9" cy="3" r="1.5" fill="white"/>
            <circle cx="9" cy="9" r="1.5" fill="white"/>
            <path d="M5 6h1.5M7.5 3H8M7.5 9H8" stroke="white" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
          Flowe
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[var(--color-border)]" />

      {/* Workflow name */}
      <input
        type="text"
        value={workflowName}
        onChange={(e) => setWorkflowName(e.target.value)}
        className="bg-transparent border-none outline-none text-xs text-[var(--color-text)] font-medium w-44 focus:bg-[var(--color-surface2)] focus:px-2 rounded transition-all placeholder:text-[var(--color-muted)]"
        placeholder="Untitled Workflow"
      />

      {/* Execution state badge */}
      {executionState !== 'idle' && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${
          executionState === 'running'   ? 'bg-blue-500/20 text-blue-400'       :
          executionState === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {executionState}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* API Keys */}
      <button
        onClick={() => setApiKeyModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface2)] border border-transparent hover:border-[var(--color-border)] transition-all"
        title="API Keys"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="5.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M7.5 7.5l4 4M9.5 9.5l1.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        Keys
      </button>

      {/* Import JSON */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFile}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isRunning}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface2)] border border-transparent hover:border-[var(--color-border)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <UploadIcon />
        Import
      </button>

      {/* Export JSON */}
      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface2)] border border-transparent hover:border-[var(--color-border)] transition-all"
      >
        <DownloadIcon />
        Export
      </button>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={isRunning}
        className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium transition-all ${
          isRunning
            ? 'bg-blue-600/50 text-blue-300 cursor-not-allowed'
            : 'bg-[var(--color-accent)] text-white hover:bg-blue-400 active:scale-95 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
        }`}
      >
        {isRunning ? <Spinner /> : <PlayIcon />}
        {isRunning ? 'Running…' : executionState === 'completed' ? 'Re-run' : 'Run'}
      </button>
    </header>
  )
}
