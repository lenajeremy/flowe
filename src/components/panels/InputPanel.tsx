import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useWorkflowStore } from '@/store/workflowStore'
import { NODE_ICONS } from '@/lib/nodeIcons'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { inputGroups, type InputField, type InputGroup } from '@/lib/nodeInputs'

// ── Figma frame 170: "Input" panel ───────────────────────────
// A floating picker of upstream-node outputs. Each upstream node expands into
// per-field chips (parsed from its latest run output); double-click a chip to
// copy its {{node.output.field}} token, or drag it into a config field. Token
// generation lives in lib/nodeInputs so these chips and the {{ }} autocomplete
// in template fields stay identical.

export function InputPanel() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId)
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const executionLog = useWorkflowStore((s) => s.executionLog)
  const isConfigPanelOpen = useWorkflowStore((s) => s.isConfigPanelOpen)

  const [open, setOpen] = useState(true)

  const groups = useMemo(
    () => inputGroups(selectedNodeId, nodes, edges, executionLog),
    [selectedNodeId, nodes, edges, executionLog],
  )

  // Nothing to show unless a node with upstream inputs is selected.
  if (!selectedNodeId || groups.length === 0) return null

  // Sit just left of the config-panel overlay (349px + margins) when it's open.
  const right = isConfigPanelOpen ? 365 : 8

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="pressable absolute flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-1.5 text-[11px] font-medium text-[var(--color-text)] shadow-lg"
        style={{ top: 8, right, zIndex: 15 }}
        title="Show inputs from previous nodes"
      >
        <BracesIcon />
        Inputs
        <span className="rounded-full bg-[var(--color-surface2)] px-1.5 text-[10px] text-[var(--color-muted)]">
          {groups.length}
        </span>
      </button>
    )
  }

  return (
    <motion.div
      className="absolute flex max-h-[calc(100%-16px)] flex-col overflow-hidden rounded-3xl border border-[var(--color-border)]"
      style={{
        top: 8,
        width: 344,
        zIndex: 15,
        background: 'color-mix(in srgb, var(--color-elevated) 82%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: 'var(--panel-shadow)',
      }}
      // right lives in BOTH initial and animate: capturing it at mount stops
      // framer tweening right from 0 → 365 (a huge horizontal slide-in), while
      // keeping the smooth dodge when the config panel opens/closes. Entry is
      // a short, soft drop — small distance, gentle ease, no spring snap.
      initial={{ opacity: 0, y: -6, right }}
      animate={{ opacity: 1, y: 0, right }}
      transition={{ duration: 0.28, ease: [0.25, 0.6, 0.35, 1] }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[var(--color-text)]">Input</p>
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-muted)]">
            Inputs from previous nodes. Double click to copy or drag to field
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--color-chip-border)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
          title="Hide inputs"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Upstream node list */}
      <div className="flex flex-col gap-2 overflow-y-auto px-3 pb-3">
        {groups.map((group) => (
          <UpstreamCard key={group.node.id} group={group} />
        ))}
      </div>
    </motion.div>
  )
}

function UpstreamCard({ group }: { group: InputGroup }) {
  const { node, fields } = group
  const [expanded, setExpanded] = useState(true)
  const accent = NODE_ACCENT_HEX[node.data.nodeType]

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface2)]">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left"
      >
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
        >
          <span className="h-4 w-4">{NODE_ICONS[node.data.nodeType]}</span>
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--color-text)]">
          {node.data.label}
        </span>
        <span className="flex-shrink-0 rounded-full bg-[var(--color-canvas)] px-2 py-0.5 text-[10px] text-[var(--color-muted)]">
          {fields.length}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className="flex-shrink-0 text-[var(--color-muted)] transition-transform"
          style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className="flex flex-col gap-1 overflow-hidden px-2.5"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            {fields.map((f) => (
              <FieldChip key={f.token} field={f} />
            ))}
            <div className="h-2.5 flex-shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FieldChip({ field }: { field: InputField }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(field.token).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        // Native textarea/input drop inserts this text — no extra wiring needed.
        e.dataTransfer.setData('text/plain', field.token)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      onDoubleClick={copy}
      title={`Double-click to copy ${field.display} · drag into a field`}
      className="group flex cursor-grab items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-1.5 transition-colors hover:border-[var(--color-accent)] active:cursor-grabbing"
    >
      {copied ? (
        <span className="text-[11px] font-medium text-[var(--color-ok)]">Copied!</span>
      ) : (
        <>
          <span className="text-[var(--color-subtle)] group-hover:text-[var(--color-accent)]">
            <BracesIcon />
          </span>
          <span className="text-[11px] font-medium text-[var(--color-text)]">{field.key}</span>
          <span className="ml-auto max-w-[130px] truncate font-[var(--font-mono)] text-[10px] text-[var(--color-muted)]">
            {field.preview}
          </span>
        </>
      )}
    </div>
  )
}

function BracesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M4.3 1.5C3.2 1.5 3 2 3 2.9v1.2c0 .7-.4 1.2-1 1.4v0c.6.2 1 .7 1 1.4v1.2c0 .9.2 1.4 1.3 1.4M7.7 1.5c1.1 0 1.3.5 1.3 1.4v1.2c0 .7.4 1.2 1 1.4v0c-.6.2-1 .7-1 1.4v1.2c0 .9-.2 1.4-1.3 1.4"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}
