import { useRef, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Toolbar } from '@/components/Toolbar'
import { TabBar } from '@/components/TabBar'
import { NodePalette } from '@/components/panels/NodePalette'
import { ConfigPanel } from '@/components/panels/ConfigPanel'
import { Canvas } from '@/components/Canvas'
import { ExecutionPanel } from '@/components/ExecutionPanel'
import { ApiKeyModal } from '@/components/ApiKeyModal'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'

const MIN_PANEL_WIDTH = 200
const MAX_PANEL_WIDTH = 640
const DEFAULT_PANEL_WIDTH = 288 // w-72

function App() {
  const { isApiKeyModalOpen, setApiKeyModalOpen } = useWorkflowStore(
    useShallow((s) => ({
      isApiKeyModalOpen: s.isApiKeyModalOpen,
      setApiKeyModalOpen: s.setApiKeyModalOpen,
    })),
  )

  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [panelOpen, setPanelOpen] = useState(true)
  const isResizing = useRef(false)

  function onResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    isResizing.current = true
    const startX = e.clientX
    const startWidth = panelWidth

    function onMouseMove(ev: MouseEvent) {
      if (!isResizing.current) return
      const delta = startX - ev.clientX
      setPanelWidth(Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, startWidth + delta)))
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
      className="flex flex-col overflow-hidden"
      style={{ height: '100dvh', background: '#0a0a0f' }}
    >
      <Toolbar />
      <TabBar />

      <div className="flex flex-1 overflow-hidden">
        <NodePalette />

        <ReactFlowProvider>
          <Canvas />
        </ReactFlowProvider>

        {/* Resize handle + toggle */}
        <div className="flex-shrink-0 flex flex-col items-center" style={{ width: '12px', background: 'var(--color-border)', position: 'relative' }}>
          {/* Drag area */}
          <div
            className="absolute inset-0 cursor-col-resize hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors"
            onMouseDown={panelOpen ? onResizeStart : undefined}
          />
          {/* Toggle chevron button */}
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className="absolute top-1/2 -translate-y-1/2 z-10 w-4 h-8 flex items-center justify-center rounded bg-[var(--color-surface2)] border border-[var(--color-border2)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
            style={{ left: '-6px' }}
            title={panelOpen ? 'Collapse panel' : 'Expand panel'}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              {panelOpen
                ? <path d="M2 1l4 3-4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                : <path d="M6 1L2 4l4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              }
            </svg>
          </button>
        </div>

        {/* Config panel with controlled width */}
        {panelOpen && (
          <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: panelWidth }}>
            <ConfigPanel />
          </div>
        )}
      </div>

      <ExecutionPanel />

      {isApiKeyModalOpen && (
        <ApiKeyModal onClose={() => setApiKeyModalOpen(false)} />
      )}
    </div>
  )
}

export default App
