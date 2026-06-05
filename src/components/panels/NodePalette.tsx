import { useState, useMemo } from 'react'
import type { NodeType } from '@/types/workflow'
import { NODE_ACCENT_HEX, NODE_ICON_PATHS, NODE_LABELS } from '@/lib/nodeColors'
import { ChatPanel } from '@/components/panels/ChatPanel'
import { FloweIcon } from '@/components/FloweIcon'
import LiquidGlass from 'liquid-glass-react'

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

export function NodePalette({ onCollapse }: { onCollapse?: () => void }) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<LeftTab>('chat')

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
    <aside className="flex h-full w-full flex-col overflow-hidden bg-[var(--color-canvas)]">
      {/* Tab bar */}
      <div className="flex items-center gap-2 px-3 py-3">
        {/* AI builder tab */}
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border ${
            activeTab === 'chat'
              ? 'bg-white/8 border-white/15 text-white'
              : 'bg-transparent border-white/5 text-[var(--color-muted)] hover:border-white/10 hover:text-[var(--color-text)]'
          }`}
        >
          <FloweIcon size={14} className={activeTab === 'chat' ? 'text-white' : 'text-[var(--color-muted)]'} />
          AI builder
        </button>

        {/* Elements tab */}
        <button
          type="button"
          onClick={() => setActiveTab('nodes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border ${
            activeTab === 'nodes'
              ? 'bg-white/8 border-white/15 text-white'
              : 'bg-transparent border-white/5 text-[var(--color-muted)] hover:border-white/10 hover:text-[var(--color-text)]'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1.5 1.5h4v4h-4zM7.5 1.5h4v4h-4zM1.5 7.5h4v4h-4zM7.5 7.5h4v4h-4z"
              stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
            />
          </svg>
          Elements
        </button>

        <div className="flex-1" />

        {/* Collapse button */}
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-white/20 transition-colors"
            title="Collapse panel"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M7.5 2L3.5 5.5l4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'nodes' ? (
        <>
          {/* Search */}
          <div className="px-3 pt-1 pb-2">
            <div className="relative">
              <svg
                width="13" height="13" viewBox="0 0 13 13" fill="none"
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
