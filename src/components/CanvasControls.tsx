import { useMemo } from 'react'
import { useReactFlow, useViewport } from '@xyflow/react'
import { useShallow } from 'zustand/react/shallow'
import { useWorkflowStore } from '@/store/workflowStore'
import { derivePath, isEmptyPath } from '@/lib/runLog'

// Bottom-left canvas cluster — Figma frames 160-168: [+ 50% −] zoom pill,
// cursor and hand tool buttons.

const btnStyle: React.CSSProperties = {
  background: 'var(--color-chip)',
  border: '1px solid var(--color-chip-border)',
  boxShadow: 'inset 0px 2px 8px 0px var(--inset-hi)',
}

export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const { zoom } = useViewport()
  const activeTool = useWorkflowStore((s) => s.activeTool)
  const setActiveTool = useWorkflowStore((s) => s.setActiveTool)

  const { isPathMode, setPathMode, pathStep, setPathStep, pathEvents, executionLog } =
    useWorkflowStore(useShallow((s) => ({
      isPathMode: s.isPathMode,
      setPathMode: s.setPathMode,
      pathStep: s.pathStep,
      setPathStep: s.setPathStep,
      pathEvents: s.pathEvents,
      executionLog: s.executionLog,
    })))

  const path = useMemo(() => derivePath(pathEvents ?? executionLog), [pathEvents, executionLog])
  // No run, nothing to trace. The control stays hidden rather than offering a
  // toggle that would grey out the canvas and say nothing.
  const hasPath = !isEmptyPath(path)
  const steps = path.order.length
  const at = pathStep ?? steps - 1

  function step(delta: number) {
    const next = Math.min(steps - 1, Math.max(0, at + delta))
    setPathStep(next)
  }

  return (
    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
      {/* Zoom pill: + 50% − */}
      <div className="flex h-7 items-center gap-1.5 rounded-lg px-3" style={btnStyle}>
        <button
          type="button"
          onClick={() => zoomIn({ duration: 150 })}
          className="text-[var(--color-dim)] transition-colors hover:text-[var(--color-text)]"
          title="Zoom in"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
        <span className="min-w-[26px] text-center text-[10px] font-medium text-[var(--color-dim)] tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomOut({ duration: 150 })}
          className="text-[var(--color-dim)] transition-colors hover:text-[var(--color-text)]"
          title="Zoom out"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Fit every node into the visible canvas */}
      <button
        type="button"
        onClick={() => void fitView({ padding: 0.2, duration: 250 })}
        title="Fit all nodes"
        aria-label="Fit all nodes"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-dim)] transition-colors hover:text-[var(--color-text)]"
        style={btnStyle}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M1.5 4V1.5H4M9 1.5h2.5V4M11.5 9v2.5H9M4 11.5H1.5V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Path overlay: which way the last run actually went */}
      {hasPath && (
        <button
          type="button"
          onClick={() => setPathMode(!isPathMode)}
          title={isPathMode ? 'Hide the path taken' : 'Show the path this run took'}
          aria-pressed={isPathMode}
          className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-medium transition-colors ${
            isPathMode ? 'text-[var(--color-accent)]' : 'text-[var(--color-dim)] hover:text-[var(--color-text)]'
          }`}
          style={btnStyle}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 9.5c2 0 2-3.5 4-3.5s2.5 3 4.5 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="1.8" cy="9.5" r="1.2" fill="currentColor" />
            <circle cx="10.2" cy="4.2" r="1.2" fill="currentColor" />
          </svg>
          Path
        </button>
      )}

      {/* Scrubber — a static highlight cannot show order once a graph fans out */}
      {hasPath && isPathMode && steps > 1 && (
        <div className="flex h-7 items-center gap-1 rounded-lg px-2" style={btnStyle}>
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={at <= 0}
            title="Previous step"
            className="text-[var(--color-dim)] transition-colors hover:text-[var(--color-text)] disabled:opacity-30"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="min-w-[30px] text-center text-[10px] font-medium text-[var(--color-dim)] tabular-nums">
            {at + 1}/{steps}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={at >= steps - 1}
            title="Next step"
            className="text-[var(--color-dim)] transition-colors hover:text-[var(--color-text)] disabled:opacity-30"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setPathStep(null)}
            disabled={pathStep === null}
            title="Show the whole path"
            className="ml-0.5 text-[10px] font-medium text-[var(--color-dim)] transition-colors hover:text-[var(--color-text)] disabled:opacity-30"
          >
            All
          </button>
        </div>
      )}

      {/* Cursor tool */}
      <button
        type="button"
        onClick={() => setActiveTool('select')}
        title="Select (V)"
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
          activeTool === 'select' ? 'text-[var(--color-text)]' : 'text-[var(--color-dim)] hover:text-[var(--color-text)]'
        }`}
        style={btnStyle}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 1.5l8 3.5-3.5 1L5 9.5 2 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Hand tool */}
      <button
        type="button"
        onClick={() => setActiveTool('hand')}
        title="Pan (H)"
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
          activeTool === 'hand' ? 'text-[var(--color-text)]' : 'text-[var(--color-dim)] hover:text-[var(--color-text)]'
        }`}
        style={btnStyle}
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path
            d="M4.5 6.5V3a1 1 0 0 1 2 0v3M6.5 6V2a1 1 0 0 1 2 0v4M8.5 6.2V3a1 1 0 0 1 2 0v5.5a4 4 0 0 1-4 4h-.7a4 4 0 0 1-3.3-1.8L1.3 8.9a1 1 0 0 1 .3-1.4 1 1 0 0 1 1.3.2l1.6 1.8"
            stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
