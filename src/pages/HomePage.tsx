import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { listWorkflows, deleteWorkflow, type WorkflowSummary } from '@/lib/workflowApi'
import { NODE_ICONS } from '@/lib/nodeIcons'
import { NODE_ACCENT_HEX, NODE_LABELS } from '@/lib/nodeColors'
import { FloweIcon } from '@/components/FloweIcon'
import { UserMenu } from '@/components/ui/UserMenu'
import type { NodeType } from '@/types/workflow'

// The workflows dashboard: searchable, filterable grid of workflow cards plus
// a "Build with Flowe AI" tile that opens the full-screen prompt page.

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="animate-spin">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
      <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function cardTypes(wf: WorkflowSummary): NodeType[] {
  const seen = new Set<string>()
  const out: NodeType[] = []
  for (const t of wf.node_types ?? []) {
    if (t && t in NODE_ICONS && !seen.has(t)) {
      seen.add(t)
      out.push(t as NodeType)
    }
  }
  return out
}

// ── Workflow card ────────────────────────────────────────────
function WorkflowCard({ wf, index, onOpen, onDelete, deleting }: {
  wf: WorkflowSummary
  index: number
  onOpen: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const types = cardTypes(wf)
  const shown = types.slice(0, 3)
  const extra = types.length - shown.length

  return (
    <motion.div
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors hover:border-[var(--color-border2)]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -2, boxShadow: 'var(--pop-shadow)' }}
    >
      <div className="flex flex-1 flex-col gap-1.5 p-4 pb-3">
        <p className="truncate text-[15px] font-semibold text-[var(--color-text)]">{wf.name}</p>
        <p className="line-clamp-2 min-h-[36px] text-[12.5px] leading-relaxed text-[var(--color-muted)]">
          {wf.description || 'No description yet — open the flow to build it out.'}
        </p>
      </div>

      {/* Footer: node icon stack + menu */}
      <div className="flex items-center justify-between rounded-b-2xl border-t border-[var(--color-border)] bg-[var(--color-surface2)] px-3.5 py-2.5">
        <div className="flex items-center">
          {shown.length === 0 ? (
            <span className="micro text-[var(--color-subtle)]">empty flow</span>
          ) : (
            <>
              {shown.map((t, i) => (
                <span
                  key={t}
                  title={NODE_LABELS[t]}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-chip-border)] bg-[var(--color-chip)]"
                  style={{ color: NODE_ACCENT_HEX[t], marginLeft: i === 0 ? 0 : -6, zIndex: 10 - i }}
                >
                  <span className="h-3.5 w-3.5 [&>svg]:h-full [&>svg]:w-full">{NODE_ICONS[t]}</span>
                </span>
              ))}
              {extra > 0 && (
                <span className="ml-1.5 text-[10px] font-medium text-[var(--color-subtle)]">+{extra}</span>
              )}
            </>
          )}
        </div>

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="pressable flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-subtle)] transition-colors hover:bg-[var(--color-hover2)] hover:text-[var(--color-text)]"
            title="Workflow actions"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="3" cy="7" r="1.1" /><circle cx="7" cy="7" r="1.1" /><circle cx="11" cy="7" r="1.1" />
            </svg>
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                className="absolute bottom-9 right-0 z-20 w-36 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] py-1"
                style={{ boxShadow: 'var(--pop-shadow)' }}
                initial={{ opacity: 0, scale: 0.96, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 4 }}
                transition={{ duration: 0.13, ease: [0.23, 1, 0.32, 1] }}
              >
                <button
                  onClick={onOpen}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)]"
                >
                  Open
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete() }}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[var(--color-fail)] transition-colors hover:bg-[var(--color-fail)]/10 disabled:opacity-40"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────
export function HomePage() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<Set<NodeType>>(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listWorkflows().then(setWorkflows).finally(() => setLoading(false))
  }, [])

  // Close the filters popover on outside click
  useEffect(() => {
    if (!filtersOpen) return
    function onDown(e: MouseEvent) {
      if (!filtersRef.current?.contains(e.target as Node)) setFiltersOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [filtersOpen])

  // Node types present across all workflows — the filter vocabulary.
  const allTypes = useMemo(() => {
    const s = new Set<NodeType>()
    workflows.forEach((wf) => cardTypes(wf).forEach((t) => s.add(t)))
    return [...s].sort((a, b) => NODE_LABELS[a].localeCompare(NODE_LABELS[b]))
  }, [workflows])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return workflows.filter((wf) => {
      if (q && !wf.name.toLowerCase().includes(q) && !wf.description.toLowerCase().includes(q)) return false
      if (typeFilter.size > 0 && !cardTypes(wf).some((t) => typeFilter.has(t))) return false
      return true
    })
  }, [workflows, search, typeFilter])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteWorkflow(id)
      setWorkflows((ws) => ws.filter((w) => w.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  function toggleType(t: NodeType) {
    setTypeFilter((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] font-[var(--font-sans)] text-[var(--color-text)]">
      <div className="mx-auto max-w-[1280px] px-8 py-12">

        {/* Title row */}
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="pressable flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-border2)]"
              title="Home"
            >
              <FloweIcon size={18} />
            </button>
            <h1 className="text-[26px] font-semibold tracking-[-0.01em]">Workflows</h1>
          </div>
          <UserMenu />
        </div>

        {/* Toolbar: search · filters · new */}
        <div className="mb-8 flex items-center gap-3">
          <div className="relative w-full max-w-[420px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workflows"
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-4 pr-10 text-[13px] text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-accent)]"
            />
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>

          {/* Filters */}
          <div className="relative" ref={filtersRef}>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`pressable flex h-11 items-center gap-2 rounded-xl border px-4 text-[13px] font-medium transition-colors ${
                typeFilter.size > 0
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-border2)]'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M4.5 8h7M7 12h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Filters
              {typeFilter.size > 0 && (
                <span className="rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] font-semibold text-white">
                  {typeFilter.size}
                </span>
              )}
            </button>
            <AnimatePresence>
              {filtersOpen && (
                <motion.div
                  className="absolute left-0 top-13 z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] py-1.5"
                  style={{ boxShadow: 'var(--pop-shadow)' }}
                  initial={{ opacity: 0, scale: 0.97, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -4 }}
                  transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
                >
                  <p className="micro px-3 pb-1 pt-1.5 text-[var(--color-subtle)]">Contains node</p>
                  {allTypes.length === 0 && (
                    <p className="px-3 py-2 text-[12px] text-[var(--color-muted)]">No nodes yet</p>
                  )}
                  {allTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-[var(--color-hover)]"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-chip-border)] bg-[var(--color-chip)]" style={{ color: NODE_ACCENT_HEX[t] }}>
                        <span className="h-3 w-3 [&>svg]:h-full [&>svg]:w-full">{NODE_ICONS[t]}</span>
                      </span>
                      <span className="flex-1 text-[12px] text-[var(--color-text)]">{NODE_LABELS[t]}</span>
                      {typeFilter.has(t) && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[var(--color-accent)]">
                          <path d="M2 6.5 5 9.5 10 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1" />

          <button
            onClick={() => navigate('/build')}
            className="pressable flex h-11 items-center gap-2 rounded-xl bg-[var(--color-text)] px-4 text-[13px] font-semibold text-[var(--color-canvas)] hover:opacity-90"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            New Workflow
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-[var(--color-muted)]">
            <Spinner /> Loading…
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {visible.map((wf, i) => (
              <WorkflowCard
                key={wf.id}
                wf={wf}
                index={i}
                onOpen={() => navigate(`/workflow/${wf.id}`)}
                onDelete={() => void handleDelete(wf.id)}
                deleting={deletingId === wf.id}
              />
            ))}

            {/* Build with Flowe AI tile */}
            <motion.button
              type="button"
              onClick={() => navigate('/build')}
              className="flex min-h-[172px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-border2)] px-6 py-8 text-center transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-hover)]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(visible.length, 9) * 0.04, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
            >
              <span className="text-[var(--color-accent)]">
                <FloweIcon size={34} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[14px] font-semibold text-[var(--color-text)]">Build with Flowe AI</span>
                <span className="text-[12px] text-[var(--color-subtle)]">Send a message to create a flow</span>
              </span>
            </motion.button>
          </div>
        )}

        {!loading && workflows.length > 0 && visible.length === 0 && (
          <p className="mt-6 text-center text-[13px] text-[var(--color-muted)]">
            Nothing matches — clear the search or filters.
          </p>
        )}
      </div>
    </div>
  )
}
