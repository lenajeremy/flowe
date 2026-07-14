import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { listChatSessions } from '@/lib/agentChat'
import { useAgentChat } from '@/components/agent/useAgentChat'
import { AgentBubble, Composer } from '@/components/agent/AgentMessages'
import { FloweIcon } from '@/components/FloweIcon'

// FAB geometry — mirrors the config panel overlay (right: 8, width: 349)
const FAB_RIGHT = 16
const FAB_RIGHT_SHIFTED = 8 + 349 + 16
const EASE = [0.32, 0.72, 0, 1] as const

/**
 * Chat-with-workflow entry point on the editor canvas.
 *
 * The FAB opens a small chat popover anchored to the same corner: close
 * scales it back into the button, maximize grows it into the full chat
 * page (navigation happens when the grow animation completes, so the
 * page "catches" the transition with the same session).
 *
 * When the config panel opens/closes, the FAB doesn't slide — it scales
 * away, repositions while invisible, and scales back in once the panel
 * has settled.
 */
export function ChatFab({ workflowId, workflowName, panelOpen }: {
  workflowId?: string
  workflowName?: string
  panelOpen: boolean
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [maximizing, setMaximizing] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [dims, setDims] = useState({ w: 390, h: 560 })
  const endRef = useRef<HTMLDivElement>(null)

  const { messages, isStreaming, send, stop } = useAgentChat({
    workflowId,
    sessionId,
    onSessionCreated: (s) => setSessionId(s.id),
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openPopover = () => {
    setDims({ w: 390, h: Math.min(560, window.innerHeight - 56) })
    setMaximizing(false)
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

  const fabVisible = !open && !parked

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
            initial={{ opacity: 0, scale: 0.15, bottom: 20, right: 20, width: dims.w, height: dims.h, borderRadius: 20 }}
            animate={maximizing
              ? { opacity: 1, scale: 1, bottom: 0, right: 0, width: window.innerWidth, height: window.innerHeight, borderRadius: 0 }
              : { opacity: 1, scale: 1, bottom: 20, right: 20, width: dims.w, height: dims.h, borderRadius: 20 }}
            exit={{ opacity: 0, scale: 0.15, bottom: 20, right: 20 }}
            transition={{ duration: maximizing ? 0.34 : 0.26, ease: EASE }}
            onAnimationComplete={() => {
              if (maximizing && workflowId) {
                navigate(`/workflow/${workflowId}/chat${sessionId ? `?session=${sessionId}` : ''}`)
              }
            }}
          >
            {/* Header — maximize + close */}
            <div className="flex h-11 flex-shrink-0 items-center justify-between border-b border-[var(--color-border)] pl-3.5 pr-2">
              <div className="flex min-w-0 items-center gap-2">
                <FloweIcon size={14} className="flex-shrink-0 text-[var(--color-accent)]" />
                <span className="truncate text-[12.5px] font-semibold text-[var(--color-text)]">
                  {workflowName || 'Chat'}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setMaximizing(true)}
                  title="Open full chat"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M7 1.5h3.5V5M5 10.5H1.5V7M10.5 1.5L7 5M1.5 10.5L5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-3.5 px-4 py-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center gap-2.5 px-6 pt-[18%] text-center">
                    <FloweIcon size={26} className="text-[var(--color-accent)]" />
                    <p className="text-[13px] font-medium text-[var(--color-text)]">
                      {workflowName ? `Chat with ${workflowName}` : 'Chat with workflow'}
                    </p>
                    <p className="text-[11.5px] leading-relaxed text-[var(--color-muted)]">
                      Ask anything — nodes run only when your request needs them.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => <AgentBubble key={m.id} message={m} />)
                )}
                <div ref={endRef} />
              </div>
            </div>

            {/* Composer */}
            <div className="flex-shrink-0 px-3 pb-3 pt-1">
              <Composer
                value={input}
                onChange={setInput}
                onSend={handleSend}
                onStop={stop}
                isStreaming={isStreaming}
                compact
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
