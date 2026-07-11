import { useState, useRef, useEffect, useCallback } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useWorkflowStore } from '@/store/workflowStore'
import { useAuthStore } from '@/store/authStore'
import { useShallow } from 'zustand/react/shallow'
import { API } from '@/lib/config'
import { FloweIcon } from '@/components/FloweIcon'
import LiquidGlass from 'liquid-glass-react'
import { apiFetch } from '@/lib/http'
// ── Types ───────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  thinkingDuration?: number
  workflowApplied?: boolean
  loading?: boolean
}

interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  thinkingDuration?: number
  workflowApplied?: boolean
}

interface ChatModelInfo {
  id: string
  name: string
  description: string
  providerLabel: string
  keyEnv: string
  available: boolean
}

// ── Helpers ─────────────────────────────────────────────────────

function toStored(msgs: ChatMessage[]): StoredMessage[] {
  return msgs
    .filter((m) => !m.loading && m.content)
    .map(({ role, content, thinking, thinkingDuration, workflowApplied }) => ({
      role, content, thinking, thinkingDuration, workflowApplied,
    }))
}

function fromStored(msgs: StoredMessage[]): ChatMessage[] {
  return msgs.map((m) => ({ ...m, id: crypto.randomUUID() }))
}

// ── Constants ────────────────────────────────────────────────────


const SUGGESTIONS = [
  'Every Monday, search for top AI news and email me a digest',
  'Every Friday, summarize closed Linear tickets and post to Slack',
  'Every morning, summarise my unread Gmail and send a digest to Slack',
]

const MODEL_STORAGE_KEY = 'flowe:chat-model'
const DEFAULT_CHAT_MODEL = 'claude-sonnet-4-6'

// Used until /api/ai/models responds (or if it never does)
const FALLBACK_MODELS: ChatModelInfo[] = [
  { id: 'claude-fable-5', name: 'Fable 5', description: 'Most capable — complex multi-step workflows', providerLabel: 'Anthropic', keyEnv: 'ANTHROPIC_API_KEY', available: true },
  { id: 'claude-opus-4-8', name: 'Opus 4.8', description: 'Deep reasoning for demanding builds', providerLabel: 'Anthropic', keyEnv: 'ANTHROPIC_API_KEY', available: true },
  { id: 'claude-sonnet-4-6', name: 'Sonnet 4.6', description: 'Balanced speed and intelligence', providerLabel: 'Anthropic', keyEnv: 'ANTHROPIC_API_KEY', available: true },
  { id: 'claude-haiku-4-5-20251001', name: 'Haiku 4.5', description: 'Fastest — quick edits and simple flows', providerLabel: 'Anthropic', keyEnv: 'ANTHROPIC_API_KEY', available: true },
]

// ── Component ───────────────────────────────────────────────────

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [models, setModels] = useState<ChatModelInfo[]>(FALLBACK_MODELS)
  const [chatModel, setChatModel] = useState<string>(
    () => localStorage.getItem(MODEL_STORAGE_KEY) ?? DEFAULT_CHAT_MODEL,
  )
  const [inputWidth, setInputWidth] = useState(0)
  const [inputHeight, setInputHeight] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const inputContainerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const el = inputContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setInputWidth(entry.contentRect.width)
      setInputHeight(entry.contentRect.height)
      // LiquidGlass only remeasures on window resize — notify it
      window.dispatchEvent(new Event('resize'))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { nodes, edges, dbId, importWorkflowVersion, applyPatch, undo } = useWorkflowStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      dbId: s.dbId,
      importWorkflowVersion: s.importWorkflowVersion,
      applyPatch: s.applyPatch,
      undo: s.undo,
    })),
  )

  // ── Available models ─────────────────────────────────────────
  useEffect(() => {
    apiFetch(`${API}/api/ai/models`)
      .then((r) => r.json())
      .then((data: { models: ChatModelInfo[]; default: string }) => {
        if (!Array.isArray(data.models) || data.models.length === 0) return
        setModels(data.models)
        // A stored model the server no longer accepts (or whose provider key
        // was removed) falls back to the server default
        setChatModel((cur) => (data.models.some((m) => m.id === cur && m.available) ? cur : data.default))
      })
      .catch(() => {})
  }, [])

  const selectModel = useCallback((id: string) => {
    setChatModel(id)
    localStorage.setItem(MODEL_STORAGE_KEY, id)
  }, [])

  // ── Load chat history ────────────────────────────────────────
  useEffect(() => {
    if (!dbId) { setMessages([]); return }
    setLoadingHistory(true)
    apiFetch(`${API}/api/workflows/${dbId}/chat`)
      .then((r) => r.json())
      .then((data: { messages: StoredMessage[] }) => setMessages(fromStored(data.messages ?? [])))
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false))
  }, [dbId])

  // ── Persist chat ─────────────────────────────────────────────
  const saveChat = useCallback((msgs: ChatMessage[]) => {
    if (!dbId) return
    void apiFetch(`${API}/api/workflows/${dbId}/chat`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: toStored(msgs) }),
    })
  }, [dbId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  // ── Send ─────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isGenerating) return

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text }
    const assistantId = crypto.randomUUID()
    const loadingMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', thinking: '', loading: true }

    setMessages((m) => [...m, userMsg, loadingMsg])
    setInput('')
    setIsGenerating(true)

    const controller = new AbortController()
    abortRef.current = controller

    const historySnapshot = messages
      .filter((m) => !m.loading && m.content)
      .map(({ role, content }) => ({ role, content }))

    try {
      const res = await apiFetch(`${API}/api/ai/generate-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          model: chatModel,
          history: historySnapshot,
          currentNodes: nodes.map(({ id, type, position, data }) => ({
            id, type, position,
            data: { ...data, executionStatus: undefined, executionOutput: undefined },
          })),
          currentEdges: edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
            id, source, target,
            ...(sourceHandle ? { sourceHandle } : {}),
            ...(targetHandle ? { targetHandle } : {}),
          })),
        }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error(await res.text())

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let thinkingAcc = ''
      let textAcc = ''
      let currentEvent = ''
      const dataLines: string[] = []
      let thinkingStartMs: number | null = null
      let thinkingDuration: number | undefined = undefined

      function dispatchSSE() {
        if (!currentEvent) return
        const data = dataLines.join('\n')
        dataLines.length = 0

        switch (currentEvent) {
          case 'thinking':
            if (!thinkingStartMs) thinkingStartMs = Date.now()
            thinkingAcc += data
            setMessages((m) =>
              m.map((msg) => msg.id === assistantId ? { ...msg, thinking: thinkingAcc } : msg),
            )
            break

          case 'text':
            if (thinkingStartMs && thinkingDuration === undefined) {
              thinkingDuration = Math.round((Date.now() - thinkingStartMs) / 1000)
              setMessages((m) =>
                m.map((msg) => msg.id === assistantId ? { ...msg, thinkingDuration } : msg),
              )
            }
            textAcc += data
            setMessages((m) =>
              m.map((msg) => msg.id === assistantId ? { ...msg, content: textAcc, loading: false } : msg),
            )
            break

          case 'workflow': {
            try {
              const parsed = JSON.parse(data)
              if (parsed.nodes && parsed.edges) {
                importWorkflowVersion(parsed.nodes, parsed.edges)
                setMessages((m) =>
                  m.map((msg) => msg.id === assistantId ? { ...msg, workflowApplied: true } : msg),
                )
              }
            } catch { /* ignore */ }
            break
          }

          case 'patch': {
            try {
              const parsed = JSON.parse(data)
              if (Array.isArray(parsed.operations) && parsed.operations.length > 0) {
                applyPatch(parsed.operations)
                setMessages((m) =>
                  m.map((msg) => msg.id === assistantId ? { ...msg, workflowApplied: true } : msg),
                )
              }
            } catch { /* ignore */ }
            break
          }

          case 'error':
            setMessages((m) =>
              m.map((msg) => msg.id === assistantId ? { ...msg, content: data, loading: false } : msg),
            )
            break
        }
        currentEvent = ''
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            if (currentEvent && dataLines.length > 0) dispatchSSE()
            currentEvent = line.slice(7)
          } else if (line.startsWith('data: ')) {
            dataLines.push(line.slice(6))
          } else if (line === '' && currentEvent) {
            dispatchSSE()
          }
        }
      }
      if (currentEvent && dataLines.length > 0) dispatchSSE()

      setMessages((prev) => {
        const finalMsgs = prev.map((msg) =>
          msg.id === assistantId ? { ...msg, loading: false } : msg,
        )
        saveChat(finalMsgs)
        return finalMsgs
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const errMsg = err instanceof Error ? err.message : 'Something went wrong'
        setMessages((prev) => {
          const finalMsgs = prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: errMsg, loading: false } : msg,
          )
          saveChat(finalMsgs)
          return finalMsgs
        })
      }
    } finally {
      setIsGenerating(false)
      abortRef.current = null
    }
  }, [input, isGenerating, messages, nodes, edges, chatModel, importWorkflowVersion, applyPatch, saveChat])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setIsGenerating(false)
  }

  function handleClear() {
    setMessages([])
    if (dbId) {
      void apiFetch(`${API}/api/workflows/${dbId}/chat`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] }),
      })
    }
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-[var(--color-canvas)]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full text-[11px] text-[var(--color-muted)]">
            Loading...
          </div>
        ) : messages.length === 0 ? (
          <EmptyState suggestions={SUGGESTIONS} onSelect={setInput} />
        ) : (
          <div className="flex flex-col p-4 gap-5">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onRollback={undo} />
            ))}
            <div ref={messagesEndRef} />
            {/* Restart Chat at bottom of conversation */}
            {!isGenerating && (
              <div className="flex justify-center pt-1 pb-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-hover)]"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1.5 6a4.5 4.5 0 1 1 .9 2.7M1.5 9.5V6.5H4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Restart Chat
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-3 flex flex-col gap-2">
        {/* Layer stack: gradient → glass → content */}
        <div ref={inputContainerRef} className="relative w-full rounded-[20px]">
          {/* Layer 1 — gradient fill */}
          <div
            className="absolute inset-0 rounded-[20px]"
            style={{ background: 'linear-gradient(135deg, #3900F415 0%, #F34CFF15 50%, #0AA41215 100%)' }}
          />

          {/* Layer 2 — LiquidGlass over the gradient */}
          {inputWidth > 0 && (
            <LiquidGlass
              cornerRadius={20}
              displacementScale={64}
              blurAmount={0.1}
              saturation={130}
              aberrationIntensity={1.5}
              style={{
                position: 'absolute',
                inset: 0,
                width: inputWidth,
                height: inputHeight,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >{null}</LiquidGlass>
          )}

          {/* Layer 3 — content, 4px margin exposes gradient as border */}
          <div
            className="relative m-[4px] rounded-[16px] px-4 pt-4 pb-3"
            style={{
              zIndex: 2,
              border: '1px solid transparent',
              background: 'linear-gradient(var(--color-canvas), var(--color-canvas)) padding-box, linear-gradient(135deg, var(--color-border2), var(--color-chip-border)) border-box',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Eg. Build a workflow that sends top product design articles to my email every day"
              rows={3}
              disabled={isGenerating}
              className="w-full resize-none bg-transparent text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-muted)] outline-none leading-relaxed disabled:opacity-50"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-hover)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover2)] transition-colors"
                  tabIndex={-1}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M13 6.5L7 12.5a4 4 0 0 1-5.66-5.66l6-6a2.5 2.5 0 0 1 3.54 3.54L5.5 10.16a1 1 0 0 1-1.42-1.42L9.5 3.33" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <ModelPicker models={models} value={chatModel} onChange={selectModel} />
              </div>
              {isGenerating ? (
                <button type="button" onClick={handleStop} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black hover:opacity-80 transition-opacity">
                  <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                    <rect x="2.5" y="2.5" width="5" height="5" rx="0.5" fill="currentColor" />
                  </svg>
                </button>
              ) : (
                <button type="button" onClick={() => void handleSend()} disabled={!input.trim()} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-opacity disabled:opacity-30 hover:opacity-80">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 10V2M6 2L2.5 5.5M6 2l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {!dbId && (
          <p className="text-[10px] text-[var(--color-subtle)]">
            Save the workflow first to persist this conversation.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Model Picker ─────────────────────────────────────────────────

function ModelPicker({
  models,
  value,
  onChange,
}: {
  models: ChatModelInfo[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const current = models.find((m) => m.id === value)

  // Group by provider, preserving server order
  const groups: { label: string; items: ChatModelInfo[] }[] = []
  for (const m of models) {
    const group = groups.find((g) => g.label === m.providerLabel)
    if (group) group.items.push(m)
    else groups.push({ label: m.providerLabel, items: [m] })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--color-hover)] px-2.5 text-[11px] font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover2)] transition-colors"
      >
        <span>{current?.name ?? 'Model'}</span>
        <svg
          width="9" height="9" viewBox="0 0 10 10" fill="none"
          className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 6.5L5 3.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="pop-in absolute bottom-full left-0 z-50 mb-2 max-h-[440px] w-[260px] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-1 shadow-[var(--pop-shadow)]"
            style={{ '--pop-origin': 'bottom left' } as React.CSSProperties}
          >
            {groups.map((group) => (
              <div key={group.label}>
                <div className="px-2.5 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)] opacity-70">
                  {group.label}
                </div>
                {group.items.map((m) => {
                  const active = m.id === value
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={!m.available}
                      onClick={() => { onChange(m.id); setOpen(false) }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--color-hover)] transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    >
                      <div className="min-w-0">
                        <div className={`text-[12px] ${active ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-text)]'}`}>
                          {m.name}
                        </div>
                        <div className="text-[10px] text-[var(--color-muted)] truncate">
                          {m.available ? m.description : `Add ${m.keyEnv} to enable`}
                        </div>
                      </div>
                      {active && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 text-[var(--color-text)]">
                          <path d="M2.5 6.5L5 9l4.5-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────────

function EmptyState({ suggestions, onSelect }: { suggestions: string[]; onSelect: (s: string) => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Centered icon + title */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3">
        <div className="flex items-center justify-center opacity-30">
          <FloweIcon size={48} />
        </div>
        <div className="text-center">
          <h3 className="text-[15px] font-semibold text-[var(--color-text)]">Meet Flowe AI</h3>
          <p className="text-[12px] text-[var(--color-muted)] mt-1">Send a message to create a flow</p>
        </div>
      </div>

      {/* Suggestions pinned to bottom — fade from transparent (top) to opaque (bottom) */}
      <div className="pb-2">
        {suggestions.map((s, i) => {
          const opacity = i === 0 ? 0.3 : i === 1 ? 0.65 : 1
          return (
            <button
              key={s}
              type="button"
              onClick={() => onSelect(s)}
              className="flex items-center justify-between w-full px-4 py-4 transition-opacity hover:opacity-100"
              style={{ opacity }}
            >
              <span
                className="text-left pr-3"
                style={{ color: 'var(--color-dim)', fontSize: 12, lineHeight: '16px', fontWeight: 400 }}
              >{s}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0" style={{ color: 'var(--color-dim)' }}>
                <path d="M5 10.5l4-3.5-4-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Message Bubble ───────────────────────────────────────────────

function MessageBubble({ message, onRollback }: { message: ChatMessage; onRollback: () => void }) {
  const [reasoningOpen, setReasoningOpen] = useState(false)
  const user = useAuthStore((s) => s.user)

  // User message — right-aligned with avatar
  if (message.role === 'user') {
    const initial = ((user?.name || user?.email || '?')[0] ?? '?').toUpperCase()
    return (
      <div className="flex justify-end items-start gap-2">
        <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] break-words">
          {message.content}
        </div>
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-semibold mt-0.5 select-none overflow-hidden">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            initial
          )}
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex flex-col gap-2 min-w-0">
      {/* Builder Reasoning — collapsible */}
      {message.thinking && message.thinking.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setReasoningOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors mb-1.5"
          >
            <span className="font-medium">Builder Reasoning</span>
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              className={`transition-transform duration-150 ${reasoningOpen ? 'rotate-90' : ''}`}
            >
              <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {reasoningOpen && (
            <div className="flex flex-col gap-1.5 mb-2">
              <p className="text-[11px] text-[var(--color-muted)] italic">
                {message.loading && message.thinkingDuration === undefined
                  ? 'Thinking...'
                  : `Thought for ${message.thinkingDuration ?? 0}s`}
              </p>
              <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] px-3.5 py-2.5 text-[11px] text-[var(--color-muted)] leading-relaxed max-h-[180px] overflow-y-auto whitespace-pre-wrap">
                {message.thinking}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      {(message.content || message.loading) && (
        <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--color-text)]">
          {message.loading && !message.content ? (
            <div className="flex items-center gap-1.5">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-muted)] animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-muted)] animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-muted)] animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-[var(--color-muted)] text-[11px]">
                {message.thinking ? 'Writing...' : 'Thinking...'}
              </span>
            </div>
          ) : (
            <div className="chat-markdown">
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            </div>
          )}
        </div>
      )}

      {/* Output of thinking process — workflow applied */}
      {message.workflowApplied && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-[12px] text-[var(--color-muted)]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L7 7.9l-2.6 1.5.5-2.9-2.1-2 2.9-.4L7 1.5z"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            </svg>
            Output of thinking process
          </div>
          <button
            type="button"
            onClick={onRollback}
            className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 5a4.5 4.5 0 1 1 .9 2.7M1.5 2V5H4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Rollback to Version
          </button>
        </div>
      )}
    </div>
  )
}
