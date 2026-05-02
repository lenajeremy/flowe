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
    tabs,
    activeTabId,
    nodes,
    selectedNodeId,
    addTab,
    switchTab,
    setSelectedNodeId,
    setConfigPanelOpen,
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
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-text)] hover:bg-[var(--color-surface2)]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z" stroke="currentColor" strokeWidth="1.35" />
            </svg>
          </div>
          <button
            type="button"
            title="Panel options"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 5.5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="px-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-[15px] font-semibold text-[var(--color-text)]">{workflowName}</h1>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="flex-shrink-0 text-[var(--color-muted)]">
              <path d="M2.5 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-[var(--color-border)] px-2 py-2">
        <button className="rounded-[7px] bg-[var(--color-surface2)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-text)]">
          Builder
        </button>
        <button className="rounded-[7px] px-2.5 py-1.5 text-[12px] text-[var(--color-muted)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)]">
          Runs
        </button>
        <button
          type="button"
          title="Search"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-text)] hover:bg-[var(--color-surface2)]"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto">
        <section className="border-b border-[var(--color-border)] px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[12px] font-semibold text-[var(--color-text)]">Open Workflows</h2>
            <button
              type="button"
              onClick={() => addTab()}
              title="New workflow"
              className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[var(--color-text)] hover:bg-[var(--color-surface2)]"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {tabs.map((tab, index) => {
              const isActive = tab.id === activeTabId
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id)}
                  className={`truncate rounded-[7px] px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors ${isActive
                    ? 'bg-[var(--color-surface2)] text-[var(--color-text)]'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)]'
                    }`}
                >
                  {index === 0 ? workflowName : tab.workflowName}
                </button>
              )
            })}
          </div>
        </section>
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
    </aside>
  )
}
