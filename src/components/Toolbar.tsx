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

interface ToolbarProps {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

function ThemeIcon({ theme }: { theme: 'dark' | 'light' }) {
  if (theme === 'dark') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M8.2 1.8A4.8 4.8 0 1 0 12.2 8 4.6 4.6 0 0 1 8.2 1.8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 1v1.2M7 11.8V13M13 7h-1.2M2.2 7H1M11.2 2.8l-.8.8M3.6 10.4l-.8.8M11.2 11.2l-.8-.8M3.6 3.6l-.8-.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function Toolbar({ theme, onToggleTheme }: ToolbarProps) {
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

  function handleDownload() {
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
    <header className="h-12 flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 shadow-[var(--panel-shadow)] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-[var(--color-surface2)] flex-shrink-0">
        <div className="w-6 h-6 rounded-[7px] bg-[var(--color-accent)] flex items-center justify-center text-white">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="3" cy="6" r="2" fill="white"/>
            <circle cx="9" cy="3" r="1.5" fill="white"/>
            <circle cx="9" cy="9" r="1.5" fill="white"/>
            <path d="M5 6h1.5M7.5 3H8M7.5 9H8" stroke="white" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-[13px] font-semibold text-[var(--color-text)]">
          workflow-ai
        </span>
      </div>

      {/* Divider */}
      <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

      {/* Workflow name */}
      <input
        type="text"
        value={workflowName}
        onChange={(e) => setWorkflowName(e.target.value)}
        className="h-8 w-52 rounded-[7px] border border-transparent bg-transparent px-2 text-[12px] font-medium text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-muted)] hover:bg-[var(--color-surface2)] focus:border-[var(--color-border2)] focus:bg-[var(--color-surface2)]"
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
        className="flex h-8 items-center gap-1.5 rounded-[7px] border border-transparent px-2.5 text-[12px] text-[var(--color-muted)] transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)]"
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
        className="flex h-8 items-center gap-1.5 rounded-[7px] border border-transparent px-2.5 text-[12px] text-[var(--color-muted)] transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <UploadIcon />
        Import
      </button>

      {/* Download JSON */}
      <button
        onClick={handleDownload}
        className="flex h-8 items-center gap-1.5 rounded-[7px] border border-transparent px-2.5 text-[12px] text-[var(--color-muted)] transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)]"
      >
        <DownloadIcon />
        Download
      </button>

      <button
        onClick={onToggleTheme}
        className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-transparent text-[var(--color-muted)] transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)]"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <ThemeIcon theme={theme} />
      </button>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={isRunning}
        className={`flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-[12px] font-medium transition-all ${
          isRunning
            ? 'bg-blue-600/50 text-blue-300 cursor-not-allowed'
            : 'bg-[var(--color-accent)] text-white hover:brightness-105 active:scale-95'
        }`}
      >
        {isRunning ? <Spinner /> : <PlayIcon />}
        {isRunning ? 'Running…' : executionState === 'completed' ? 'Re-run' : 'Run'}
      </button>
    </header>
  )
}
