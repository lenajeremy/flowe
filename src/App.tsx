import { useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Toolbar } from '@/components/Toolbar'
import { TabBar } from '@/components/TabBar'
import { NodePalette } from '@/components/panels/NodePalette'
import { ConfigPanel } from '@/components/panels/ConfigPanel'
import { Canvas } from '@/components/Canvas'
import { ExecutionPanel } from '@/components/ExecutionPanel'
import { ApiKeyModal } from '@/components/ApiKeyModal'
import { BottomToolDock } from '@/components/BottomToolDock'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'

const MIN_LEFT  = 120
const MAX_LEFT  = 480
const DEFAULT_LEFT = 224 // w-56

const MIN_RIGHT  = 200
const MAX_RIGHT  = 640
const DEFAULT_RIGHT = 288 // w-72

type Theme = 'dark' | 'light'

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
      const delta = direction === 'right'
        ? startX - ev.clientX   // drag left → wider
        : ev.clientX - startX   // drag right → wider
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
        className="flex-1 cursor-col-resize hover:bg-[var(--color-accent)]/30 transition-colors"
        style={{ background: 'var(--color-border)' }}
        onMouseDown={open ? onMouseDown : undefined}
      />
      <button
        onClick={onToggle}
        className="flex-shrink-0 flex items-center justify-center h-10 w-full text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface2)] transition-colors"
        style={{ background: 'var(--color-border)' }}
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

function App() {
  const { isApiKeyModalOpen, setApiKeyModalOpen, isConfigPanelOpen, setConfigPanelOpen } = useWorkflowStore(
    useShallow((s) => ({
      isApiKeyModalOpen: s.isApiKeyModalOpen,
      setApiKeyModalOpen: s.setApiKeyModalOpen,
      isConfigPanelOpen: s.isConfigPanelOpen,
      setConfigPanelOpen: s.setConfigPanelOpen,
    })),
  )

  const [leftOpen, setLeftOpen] = useState(true)
  const left  = useResizable(DEFAULT_LEFT,  MIN_LEFT,  MAX_LEFT,  'left')
  const right = useResizable(DEFAULT_RIGHT, MIN_RIGHT, MAX_RIGHT, 'right')
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('workflow-ai-theme', theme)
  }, [theme])

  return (
    <div
      className="flex overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)]"
      style={{ height: '100dvh' }}
    >
      {/* Left panel */}
      {leftOpen && (
        <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: left.width }}>
          <NodePalette />
        </div>
      )}

      {/* Left resize + toggle */}
      <ResizeHandle
        onMouseDown={left.onMouseDown}
        onToggle={() => setLeftOpen((o) => !o)}
        open={leftOpen}
        chevronOpen="M6 1L2 4l4 3"
        chevronClosed="M2 1l4 3-4 3"
      />

      <div className="flex min-w-0 flex-1 flex-col bg-[var(--color-canvas)]">
        <Toolbar
          theme={theme}
          onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
        />
        <TabBar />
        <ReactFlowProvider>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <Canvas theme={theme} />
            <BottomToolDock />
          </div>
        </ReactFlowProvider>
      </div>

      {/* Right resize + toggle */}
      <ResizeHandle
        onMouseDown={right.onMouseDown}
        onToggle={() => setConfigPanelOpen(!isConfigPanelOpen)}
        open={isConfigPanelOpen}
        chevronOpen="M2 1l4 3-4 3"
        chevronClosed="M6 1L2 4l4 3"
      />

      {/* Right panel */}
      {isConfigPanelOpen && (
        <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: right.width }}>
          <ConfigPanel />
        </div>
      )}

      {/* Drag overlays */}
      {(left.dragging || right.dragging) && (
        <div className="fixed inset-0 z-[9999] cursor-col-resize" />
      )}

      <ExecutionPanel />

      {isApiKeyModalOpen && (
        <ApiKeyModal onClose={() => setApiKeyModalOpen(false)} />
      )}
    </div>
  )
}

export default App
