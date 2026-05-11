import { useState, useMemo } from 'react'
import type { NodeType } from '@/types/workflow'
import { NODE_ACCENT_HEX, NODE_ICON_PATHS, NODE_LABELS } from '@/lib/nodeColors'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { SaveIndicator } from '@/components/SaveIndicator'
import { ChatPanel } from '@/components/panels/ChatPanel'

const PALETTE_GROUPS: Array<{ category: string; items: NodeType[] }> = [
  { category: 'Triggers', items: ['webhookTrigger', 'scheduledTrigger'] },
  { category: 'Inputs', items: ['textInput', 'imageInput'] },
  { category: 'AI', items: ['llm'] },
  { category: 'Logic', items: ['branch', 'loop', 'humanApproval'] },
  { category: 'Actions', items: ['httpRequest', 'emailSend'] },
  { category: 'Integrations', items: ['notion', 'linear'] },
  { category: 'Outputs', items: ['textOutput'] },
]

function PaletteItem({ type }: { type: NodeType }) {
  const color = NODE_ACCENT_HEX[type]

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/flowe-node-type', type)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className="group flex cursor-grab flex-col items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 transition-colors hover:border-[var(--color-border2)] hover:bg-[var(--color-surface2)] active:cursor-grabbing"
    >
      <div
        className="flex h-7 w-7 items-center justify-center rounded-md"
        style={{ backgroundColor: color + '18' }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d={NODE_ICON_PATHS[type]} stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="text-[10px] font-medium text-[var(--color-text)] leading-tight text-center truncate w-full">
        {NODE_LABELS[type]}
      </span>
    </div>
  )
}

type LeftTab = 'nodes' | 'chat'

export function NodePalette() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<LeftTab>('nodes')

  const {
    workflowName,
  } = useWorkflowStore(
    useShallow((s) => ({
      workflowName: s.workflowName,
    })),
  )

  const query = search.trim().toLowerCase()
  const isSearching = query.length > 0

  const filteredGroups = useMemo(() => {
    if (!isSearching) return PALETTE_GROUPS
    return PALETTE_GROUPS
      .map((g) => ({
        ...g,
        items: g.items.filter((t) =>
          NODE_LABELS[t].toLowerCase().includes(query) ||
          g.category.toLowerCase().includes(query)
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [isSearching, query])

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[var(--color-border)] bg-black">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white">
            <svg width="12" height="12" viewBox="0 0 18 18" fill="none">
              <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z" stroke="black" strokeWidth="1.5" />
            </svg>
          </div>

          <h1 className="truncate text-[14px] font-semibold text-white">{workflowName}</h1>
          <SaveIndicator />
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setActiveTab('nodes')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
            activeTab === 'nodes'
              ? 'text-white border-b-2 border-white'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          Nodes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
            activeTab === 'chat'
              ? 'text-white border-b-2 border-white'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M2 3h12v8H6l-3 2.5V11H2V3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M5 6.5h6M5 8.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          AI Builder
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'nodes' ? (
        <>
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <svg
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
              >
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8.5 8.5L11.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search nodes..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pl-8 pr-3 text-xs text-[var(--color-text)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-border2)]"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            <div className="flex flex-col gap-3 px-3 pb-3">
              {filteredGroups.length === 0 ? (
                <p className="text-[11px] text-[var(--color-muted)] text-center py-4">No nodes match "{search}"</p>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.category}>
                    <span className="text-[9px] text-[var(--color-subtle)] uppercase tracking-widest font-medium px-0.5 mb-1.5 block">
                      {group.category}
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {group.items.map((type) => (
                        <PaletteItem key={type} type={type} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <ChatPanel />
      )}
    </aside>
  )
}
