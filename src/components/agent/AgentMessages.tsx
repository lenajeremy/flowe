import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AgentMessage, ToolChip } from '@/components/agent/useAgentChat'

// ── Shared chat-with-workflow presentation ──────────────────────
// Message bubbles, tool activity rows, and the composer pill — used by
// the full chat page and the editor's FAB popover.

export function AgentBubble({ message }: { message: AgentMessage }) {
  // User — soft filled pill, right-aligned, no border
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] whitespace-pre-wrap break-words rounded-3xl bg-[var(--color-surface2)] px-4 py-2.5 text-[13.5px] leading-relaxed text-[var(--color-text)]">
          {message.content}
        </div>
      </div>
    )
  }

  // Assistant — bordered surface card (visually distinct from the user's
  // borderless filled pill), tool activity as quiet rows above
  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      {message.toolCalls.map((t) => <ToolActivityRow key={t.id} chip={t} />)}

      {(message.content || message.loading) && (
        <div className="min-w-0 max-w-full rounded-2xl rounded-tl-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          {message.loading && !message.content ? (
            <div className="flex items-center gap-1.5">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-muted)] [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-muted)] [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-muted)] [animation-delay:300ms]" />
              </div>
              <span className="text-[11px] text-[var(--color-muted)]">
                {message.toolCalls.some((t) => t.status === 'running') ? 'Running…' : 'Thinking…'}
              </span>
            </div>
          ) : (
            <div className="chat-markdown min-w-0 text-[13.5px] leading-relaxed text-[var(--color-text)]">
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ToolActivityRow({ chip }: { chip: ToolChip }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-[var(--color-muted)]">
      {chip.status === 'running' ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 animate-spin text-[var(--color-accent)]">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
          <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : chip.status === 'ok' ? (
        <svg width="12" height="12" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 text-[var(--color-ok)]">
          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 text-[var(--color-fail)]">
          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      <span className="truncate">
        {(() => {
          // Lead with what the call actually did; the node label is context
          const what = chip.op || chip.node
          return chip.status === 'running' ? `${what}…` : chip.status === 'ok' ? what : `${what} failed`
        })()}
      </span>
      {chip.op && <span className="flex-shrink-0 text-[var(--color-subtle)]">· {chip.node}</span>}
      {chip.error && <span className="truncate text-[var(--color-subtle)]">— {chip.error}</span>}
    </div>
  )
}

export function Composer({ value, onChange, onSend, onStop, isStreaming, placeholder = 'Ask anything', compact = false, autoFocus = false }: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onStop: () => void
  isStreaming: boolean
  placeholder?: string
  compact?: boolean
  autoFocus?: boolean
}) {
  const btn = compact ? 'h-7 w-7' : 'h-8 w-8'
  return (
    <div
      className={`flex items-end gap-2 border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors focus-within:border-[var(--color-border2)] ${
        compact ? 'rounded-2xl py-1.5 pl-3 pr-1.5' : 'rounded-[26px] py-2 pl-4 pr-2'
      }`}
      style={compact ? undefined : { boxShadow: '0 8px 30px rgba(0,0,0,0.18)' }}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
          }
        }}
        rows={Math.min(compact ? 4 : 5, Math.max(1, value.split('\n').length))}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`flex-1 resize-none bg-transparent text-[var(--color-text)] outline-none placeholder:text-[var(--color-subtle)] ${
          compact ? 'max-h-24 py-1 text-[13px] leading-relaxed' : 'max-h-36 py-1.5 text-[13.5px] leading-relaxed'
        }`}
      />
      {isStreaming ? (
        <button
          onClick={onStop}
          title="Stop"
          className={`pressable flex ${btn} flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-canvas)]`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="1.5" y="1.5" width="7" height="7" rx="1.5" />
          </svg>
        </button>
      ) : (
        <button
          onClick={onSend}
          disabled={!value.trim()}
          title="Send"
          className={`pressable flex ${btn} flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-canvas)] disabled:opacity-30`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 10V2M2.5 5.5L6 2l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
