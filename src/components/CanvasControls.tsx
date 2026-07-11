import { useReactFlow, useViewport } from '@xyflow/react'
import { useWorkflowStore } from '@/store/workflowStore'

// Bottom-left canvas cluster — Figma frames 160-168: [+ 50% −] zoom pill,
// cursor and hand tool buttons.

const btnStyle: React.CSSProperties = {
  background: 'var(--color-chip)',
  border: '1px solid var(--color-chip-border)',
  boxShadow: 'inset 0px 2px 8px 0px var(--inset-hi)',
}

export function CanvasControls() {
  const { zoomIn, zoomOut } = useReactFlow()
  const { zoom } = useViewport()
  const activeTool = useWorkflowStore((s) => s.activeTool)
  const setActiveTool = useWorkflowStore((s) => s.setActiveTool)

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
