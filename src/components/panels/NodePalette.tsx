import type { NodeType } from '@/types/workflow'
import { NODE_ACCENT_COLORS, NODE_ACCENT_HEX, NODE_LABELS, NODE_DESCRIPTIONS } from '@/lib/nodeColors'

const PALETTE_GROUPS: Array<{ category: string; items: NodeType[] }> = [
  { category: 'Inputs',  items: ['textInput', 'imageInput'] },
  { category: 'AI',      items: ['llm'] },
  { category: 'Logic',   items: ['branch', 'loop'] },
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
      className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-[var(--color-surface2)] border border-[var(--color-border)] cursor-grab active:cursor-grabbing hover:border-[var(--color-border2)] hover:bg-[var(--color-border)] transition-colors group overflow-hidden"
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
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] overflow-y-auto">
      <div className="px-3 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-[10px] text-[var(--color-muted)] uppercase tracking-widest font-medium">
          Node Palette
        </h2>
      </div>

      <div className="flex flex-col gap-4 p-3">
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
      </div>

      <div className="mt-auto px-3 py-3 border-t border-[var(--color-border)]">
        <p className="text-[10px] text-[var(--color-muted)] leading-relaxed">
          Drag nodes onto the canvas to build your workflow.
        </p>
      </div>
    </aside>
  )
}
