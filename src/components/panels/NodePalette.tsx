import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { NodeType } from '@/types/workflow'
import { NODE_LABELS, NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import { ChatPanel } from '@/components/panels/ChatPanel'
import { FloweIcon } from '@/components/FloweIcon'


const PALETTE_GROUPS: Array<{ category: string; items: NodeType[] }> = [
  { category: 'Triggers', items: ['webhookTrigger', 'scheduledTrigger'] },
  { category: 'Input/Output', items: ['textInput', 'imageInput', 'textOutput'] },
  { category: 'Actions', items: ['llm', 'humanApproval', 'httpRequest', 'emailSend', 'branch', 'loop'] },
  { category: 'Integrations', items: ['notion', 'linear', 'github', 'gitlab', 'gmail', 'googlecalendar', 'outlook', 'slack', 'googledrive', 'googledocs', 'googlesheets', 'stripe', 'shopify'] },
]

function PaletteItem({ type }: { type: NodeType }) {
  return (
    <motion.div
      draggable
      // NB: framer-motion intercepts onDragStart for its own gesture system —
      // the capture-phase handler reaches the DOM, so native HTML5 drag works.
      onDragStartCapture={(e) => {
        e.dataTransfer.setData('application/flowe-node-type', type)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 700, damping: 40 }}
      className="group flex cursor-grab items-center bg-[var(--color-surface)] transition-colors duration-150 hover:border-[var(--color-border2)] hover:bg-[var(--color-surface2)] active:cursor-grabbing"
      style={{
        height: 46,
        borderRadius: 10,
        gap: 10,
        padding: 8,
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="flex flex-shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full [&>svg]:overflow-visible"
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          padding: 7,
          border: '1px solid var(--color-border2)',
          background: 'var(--color-elevated)',
          overflow: 'visible',
          color: NODE_ACCENT_HEX[type],
        }}
      >
        {NODE_ICONS[type]}
      </div>
      <span className="truncate text-[12px] font-medium leading-tight text-[var(--color-text)]">
        {NODE_LABELS[type]}
      </span>
    </motion.div>
  )
}

export type LeftTab = 'nodes' | 'chat'

export function NodePalette({ onCollapse, tab, onTabChange }: {
  onCollapse?: () => void
  /** Controlled tab — lifted so the collapsed icon rail can reopen on a given tab */
  tab?: LeftTab
  onTabChange?: (tab: LeftTab) => void
}) {
  const [search, setSearch] = useState('')
  const [internalTab, setInternalTab] = useState<LeftTab>('chat')
  const activeTab = tab ?? internalTab
  const setActiveTab = onTabChange ?? setInternalTab

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
    <aside className="flex h-full w-full flex-col bg-[var(--color-canvas)]" style={{ overflow: 'clip' }}>
      {/* Tab bar */}
      <div className="flex items-center gap-2 px-3 py-3">
        {/* AI builder tab */}
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`pressable flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium ${
            activeTab === 'chat'
              ? 'border-[var(--color-border2)] bg-[var(--color-surface2)] text-[var(--color-text)]'
              : 'border-transparent bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <FloweIcon size={14} className={activeTab === 'chat' ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'} />
          AI builder
        </button>

        {/* Elements tab */}
        <button
          type="button"
          onClick={() => setActiveTab('nodes')}
          className={`pressable flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium ${
            activeTab === 'nodes'
              ? 'border-[var(--color-border2)] bg-[var(--color-surface2)] text-[var(--color-text)]'
              : 'border-transparent bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
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
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border2)] transition-colors"
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
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Nodes"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-3 pr-9 text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-border2)]"
              />
              <svg
                width="13" height="13" viewBox="0 0 13 13" fill="none"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
              >
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8.5 8.5L11.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            <div className="flex flex-col gap-3 px-3 pb-3">
              {filteredGroups.length === 0 ? (
                <p className="text-[11px] text-[var(--color-muted)] text-center py-4">No nodes match "{search}"</p>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.category}>
                    <span className="micro mb-1.5 block px-0.5 text-[var(--color-subtle)]">
                      {group.category}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
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
