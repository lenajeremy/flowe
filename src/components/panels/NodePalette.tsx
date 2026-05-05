import type { NodeType } from '@/types/workflow'
import { NODE_ACCENT_COLORS, NODE_ACCENT_HEX, NODE_LABELS, NODE_DESCRIPTIONS } from '@/lib/nodeColors'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'

const PALETTE_GROUPS: Array<{ category: string; items: NodeType[] }> = [
  { category: 'Inputs', items: ['textInput', 'imageInput'] },
  { category: 'AI', items: ['llm'] },
  { category: 'Logic', items: ['branch', 'loop'] },
  { category: 'Outputs', items: ['textOutput'] },
]

function PaletteItem({ type }: { type: NodeType }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/flowe-node-type', type)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className="group relative flex cursor-grab items-center gap-2.5 overflow-hidden rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-2.5 transition-colors hover:border-[var(--color-border2)] hover:bg-[var(--color-elevated)] active:cursor-grabbing"
    >
      {/* Accent left border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md"
        style={{ backgroundColor: NODE_ACCENT_COLORS[type] }}
      />

      <div className="flex flex-col ml-1">
        <span className="text-xs font-medium text-[var(--color-text)] leading-tight">
          {NODE_LABELS[type]}
        </span>
        <span className="text-[10px] text-[var(--color-muted)] leading-tight mt-0.5">
          {NODE_DESCRIPTIONS[type]}
        </span>
      </div>

      {/* Drag indicator */}
      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="4" cy="3" r="1" fill={NODE_ACCENT_HEX[type]} />
          <circle cx="8" cy="3" r="1" fill={NODE_ACCENT_HEX[type]} />
          <circle cx="4" cy="6" r="1" fill={NODE_ACCENT_HEX[type]} />
          <circle cx="8" cy="6" r="1" fill={NODE_ACCENT_HEX[type]} />
          <circle cx="4" cy="9" r="1" fill={NODE_ACCENT_HEX[type]} />
          <circle cx="8" cy="9" r="1" fill={NODE_ACCENT_HEX[type]} />
        </svg>
      </div>
    </div>
  )
}

export function NodePalette() {
  const {
    workflowName,
  } = useWorkflowStore(
    useShallow((s) => ({
      workflowName: s.workflowName,
      tabs: s.tabs,
      activeTabId: s.activeTabId,
      nodes: s.nodes,
      selectedNodeId: s.selectedNodeId,
      addTab: s.addTab,
      switchTab: s.switchTab,
      setSelectedNodeId: s.setSelectedNodeId,
      setConfigPanelOpen: s.setConfigPanelOpen,
    })),
  )

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-text)] hover:bg-[var(--color-surface2)]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z" stroke="currentColor" strokeWidth="1.35" />
            </svg>
          </div>

          <h1 className="truncate text-[15px] font-semibold text-[var(--color-text)]">{workflowName}</h1>
        </div>
      </div>

      <div className="overflow-y-auto">
        <section className="flex flex-col gap-4 p-3">
          <h2 className="text-[12px] font-semibold text-[var(--color-text)]">Node Library</h2>
          {PALETTE_GROUPS.map((group) => (
            <div key={group.category} className="flex flex-col gap-1.5">
              <span className="text-[9px] text-[var(--color-muted)] uppercase tracking-widest px-0.5">
                {group.category}
              </span>
              {group.items.map((type) => (
                <PaletteItem key={type} type={type} />
              ))}
            </div>
          ))}
        </section>
      </div>
    </aside >
  )
}
