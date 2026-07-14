import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { listChatSessions, type ChatSessionSummary } from '@/lib/agentChat'
import { useAgentChat } from '@/components/agent/useAgentChat'
import { AgentBubble, Composer } from '@/components/agent/AgentMessages'
import { FloweIcon } from '@/components/FloweIcon'

// Geometry mirrors the config panel overlay (right: 8, width: 349): both
// the FAB and the popover anchor to whichever corner is actually free.
const FAB_RIGHT = 16
const FAB_RIGHT_SHIFTED = 8 + 349 + 16
const POP_RIGHT = 20
const POP_RIGHT_SHIFTED = 8 + 349 + 20
const HISTORY_W = 156
const EASE = [0.32, 0.72, 0, 1] as const

/**
 * Chat-with-workflow on the editor canvas: FAB → popover → full-screen,
 * all one overlay. Maximize is NOT a navigation — the same mounted
 * popover morphs to fill the viewport, so the transcript, scroll
 * position, and in-flight streams survive minimize/maximize untouched
 * (and closing leaves nothing behind that a refresh could resurrect).
 *
 * The header toggles an inline history sidebar to switch conversations.
 *
 * When the config panel opens/closes, the FAB doesn't slide — it scales
 * away, repositions while invisible, and scales back in once the panel
 * has settled. The popover, being a panel itself, glides instead.
 */
export function ChatFab({ workflowId, workflowName, panelOpen }: {
  workflowId?: string
  workflowName?: string
  panelOpen: boolean
}) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [dims, setDims] = useState(() => ({ w: 390, h: Math.min(560, window.innerHeight - 56) }))
  const endRef = useRef<HTMLDivElement>(null)

  const { messages, isStreaming, send, stop } = useAgentChat({
    workflowId,
    sessionId,
    onSessionCreated: (s) => {
      setSessionId(s.id)
      setSessions((prev) => [
        { id: s.id, title: 'New chat', created_at: s.created_at, updated_at: s.updated_at },
        ...prev,
      ])
    },
    // Refresh for the server-side auto-title
    onTurnComplete: () => {
      if (workflowId) listChatSessions(workflowId).then(setSessions).catch(() => {})
    },
  })

  // ── FAB ↔ config panel choreography: scale out, move while ────
  // invisible, scale back in after the panel's spring settles.
  const [right, setRight] = useState(panelOpen ? FAB_RIGHT_SHIFTED : FAB_RIGHT)
  const [parked, setParked] = useState(false)
  const [prevPanel, setPrevPanel] = useState(panelOpen)
  if (prevPanel !== panelOpen) {
    // Adjust state during render (React Compiler-safe): park the FAB the
    // instant the panel starts moving; the timers below finish the dance.
    setPrevPanel(panelOpen)
    setParked(true)
  }
  useEffect(() => {
    if (!parked) return
    const move = setTimeout(() => setRight(panelOpen ? FAB_RIGHT_SHIFTED : FAB_RIGHT), 200)
    const show = setTimeout(() => setParked(false), 440)
    return () => { clearTimeout(move); clearTimeout(show) }
  }, [parked, panelOpen])

  // Session list backs the history sidebar — load whenever the popover opens
  useEffect(() => {
    if (!open || !workflowId) return
    listChatSessions(workflowId).then(setSessions).catch(() => {})
  }, [open, workflowId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openPopover = () => {
    setDims({ w: 390, h: Math.min(560, window.innerHeight - 56) })
    setExpanded(false)
    setHistoryOpen(false)
    setOpen(true)
    // Resume the most recent conversation, Intercom-style
    if (!sessionId && workflowId) {
      listChatSessions(workflowId)
        .then((s) => { if (s[0]) setSessionId(s[0].id) })
        .catch(() => {})
    }
  }

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    const text = input
    setInput('')
    void send(text)
  }

  const selectSession = (id: string | null) => {
    stop()
    setSessionId(id)
  }

  const fabVisible = !open && !parked
  const popRight = panelOpen ? POP_RIGHT_SHIFTED : POP_RIGHT
  const popWidth = dims.w + (historyOpen ? HISTORY_W : 0)

  return (
    <>
      <motion.button
        onClick={openPopover}
        title="Chat with this workflow — runs nodes on demand, never modifies the canvas"
        className="absolute bottom-4 z-10 flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          right,
          background: 'var(--color-accent)',
          color: '#0a0a0d',
          boxShadow: '0 8px 24px color-mix(in srgb, var(--color-accent) 45%, transparent), 0 2px 8px rgba(0,0,0,0.25)',
          pointerEvents: fabVisible ? 'auto' : 'none',
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: fabVisible ? 1 : 0, scale: fabVisible ? 1 : 0 }}
        whileHover={fabVisible ? { scale: 1.06 } : undefined}
        whileTap={fabVisible ? { scale: 0.94 } : undefined}
        transition={{ duration: 0.22, ease: EASE, delay: !open && !parked ? 0.1 : 0 }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M2.5 10a7.5 7.5 0 117.5 7.5H4a1.5 1.5 0 01-1.5-1.5v-6z"
            stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
          />
          <path d="M6.8 8.6h6.4M6.8 11.6h4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed z-50 flex flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-canvas)]"
            style={{ transformOrigin: 'bottom right', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}
            initial={{ opacity: 0, scale: 0.15, bottom: 20, right: popRight, width: popWidth, height: dims.h, borderRadius: 20 }}
            animate={expanded
              ? { opacity: 1, scale: 1, bottom: 0, right: 0, width: window.innerWidth, height: window.innerHeight, borderRadius: 0 }
              : { opacity: 1, scale: 1, bottom: 20, right: popRight, width: popWidth, height: dims.h, borderRadius: 20 }}
            exit={{ opacity: 0, scale: 0.15, bottom: 20, right: popRight }}
            transition={{ duration: expanded ? 0.34 : 0.28, ease: EASE }}
          >
            {/* Header — history, maximize/minimize, close */}
            <div className="flex h-11 flex-shrink-0 items-center justify-between border-b border-[var(--color-border)] pl-3.5 pr-2">
              <div className="flex min-w-0 items-center gap-2">
                <FloweIcon size={14} className="flex-shrink-0 text-[var(--color-accent)]" />
                <span className="truncate text-[12.5px] font-semibold text-[var(--color-text)]">
                  {workflowName || 'Chat'}
                </span>
                <span className="text-[10.5px] text-[var(--color-subtle)]">chat</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setHistoryOpen((v) => !v)}
                  title="Chat history"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text)] ${
                    historyOpen ? 'text-[var(--color-text)] bg-[var(--color-hover)]' : 'text-[var(--color-muted)]'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M6 3.6V6l1.7 1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {expanded ? (
                  <button
                    onClick={() => setExpanded(false)}
                    title="Minimize chat"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M10.5 5H7V1.5M1.5 7H5v3.5M7 5l3.5-3.5M5 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => setExpanded(true)}
                    title="Expand chat"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M7 1.5h3.5V5M5 10.5H1.5V7M10.5 1.5L7 5M1.5 10.5L5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  title="Close chat"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1">
              {/* History sidebar — slides in; the popover widens to match so
                  the chat column keeps its width */}
              <AnimatePresence initial={false}>
                {historyOpen && (
                  <motion.div
                    className="flex-shrink-0 overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface)]"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: HISTORY_W, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.26, ease: EASE }}
                  >
                    <div className="flex h-full flex-col" style={{ width: HISTORY_W }}>
                      <button
                        onClick={() => selectSession(null)}
                        className="mx-1.5 mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-[var(--color-text)] hover:bg-[var(--color-hover)]"
                      >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                        New chat
                      </button>
                      <div className="mt-1 flex-1 overflow-y-auto px-1.5 pb-2">
                        {sessions.length === 0 && (
                          <p className="px-2 pt-1 text-[11px] text-[var(--color-subtle)]">No chats yet</p>
                        )}
                        {sessions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => selectSession(s.id)}
                            className={`w-full truncate rounded-lg px-2 py-1.5 text-left text-[12px] text-[var(--color-text)] ${
                              s.id === sessionId ? 'bg-[var(--color-hover2)]' : 'hover:bg-[var(--color-hover)]'
                            }`}
                          >
                            {s.title || 'New chat'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat column — the scroll container is the SAME node in both
                  modes, so scroll position survives minimize/maximize */}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto">
                  <div className={expanded
                    ? 'mx-auto flex w-full max-w-[760px] flex-col gap-5 px-6 py-6'
                    : 'flex flex-col gap-3.5 px-4 py-4'
                  }>
                    {messages.length === 0 ? (
                      <div className={`flex flex-col items-center gap-2.5 px-6 text-center ${expanded ? 'pt-[16vh]' : 'pt-[18%]'}`}>
                        <FloweIcon size={expanded ? 34 : 26} className="text-[var(--color-accent)]" />
                        <p className={`font-medium text-[var(--color-text)] ${expanded ? 'text-[17px] font-semibold' : 'text-[13px]'}`}>
                          {workflowName ? `Chat with ${workflowName}` : 'Chat with workflow'}
                        </p>
                        <p className={`leading-relaxed text-[var(--color-muted)] ${expanded ? 'text-[13px]' : 'text-[11.5px]'}`}>
                          Ask anything — nodes run only when your request needs them.
                        </p>
                      </div>
                    ) : (
                      messages.map((m) => <AgentBubble key={m.id} message={m} />)
                    )}
                    <div ref={endRef} />
                  </div>
                </div>

                <div className={`flex-shrink-0 ${expanded ? 'px-6 pb-3 pt-1' : 'px-3 pb-3 pt-1'}`}>
                  <div className={expanded ? 'mx-auto w-full max-w-[760px]' : undefined}>
                    <Composer
                      value={input}
                      onChange={setInput}
                      onSend={handleSend}
                      onStop={stop}
                      isStreaming={isStreaming}
                      compact={!expanded}
                      autoFocus
                    />
                  </div>
                  {expanded && (
                    <p className="mt-2 text-center text-[10.5px] text-[var(--color-subtle)]">
                      Chat runs this workflow's nodes on demand — the workflow itself is never modified.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
