import { useState, useRef, useEffect, useCallback } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { API } from '@/lib/config'

// ── Types ───────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  workflowApplied?: boolean
  loading?: boolean
}

// Serialised form stored in DB — no ephemeral UI fields
interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  workflowApplied?: boolean
}

// ── Helpers ─────────────────────────────────────────────────────

function toStored(msgs: ChatMessage[]): StoredMessage[] {
  return msgs
    .filter((m) => !m.loading && m.content)
    .map(({ role, content, thinking, workflowApplied }) => ({ role, content, thinking, workflowApplied }))
}

function fromStored(msgs: StoredMessage[]): ChatMessage[] {
  return msgs.map((m) => ({ ...m, id: crypto.randomUUID() }))
}

// ── Component ───────────────────────────────────────────────────

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const { nodes, edges, dbId, importWorkflowVersion, applyPatch } = useWorkflowStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      dbId: s.dbId,
      importWorkflowVersion: s.importWorkflowVersion,
      applyPatch: s.applyPatch,
    })),
  )

  // ── Load chat history when workflow changes ──────────────────
  useEffect(() => {
    if (!dbId) {
      setMessages([])
      return
    }
    setLoadingHistory(true)
    fetch(`${API}/api/workflows/${dbId}/chat`)
      .then((r) => r.json())
      .then((data: { messages: StoredMessage[] }) => {
        setMessages(fromStored(data.messages ?? []))
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false))
  }, [dbId])

  // ── Persist chat after each completed turn ───────────────────
  const saveChat = useCallback((msgs: ChatMessage[]) => {
    if (!dbId) return
    void fetch(`${API}/api/workflows/${dbId}/chat`, {
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

    // Build history for context — only role/content, no UI metadata
    const historySnapshot = messages
      .filter((m) => !m.loading && m.content)
      .map(({ role, content }) => ({ role, content }))

    try {
      const res = await fetch(`${API}/api/ai/generate-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
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

      function dispatchSSE() {
        if (!currentEvent) return
        const data = dataLines.join('\n')
        dataLines.length = 0

        switch (currentEvent) {
          case 'thinking':
            thinkingAcc += data
            setMessages((m) =>
              m.map((msg) => msg.id === assistantId ? { ...msg, thinking: thinkingAcc } : msg),
            )
            break

          case 'text':
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

      // Clear loading, then save
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
  }, [input, isGenerating, messages, nodes, edges, importWorkflowVersion, applyPatch, saveChat])

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
      void fetch(`${API}/api/workflows/${dbId}/chat`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] }),
      })
    }
  }

  const suggestions = [
    'Sentiment analysis pipeline',
    'Webhook to email notification',
    'Content review with human approval',
  ]

  return (
    <div className="flex h-full flex-col bg-black">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full text-[11px] text-[var(--color-muted)]">
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <EmptyState suggestions={suggestions} onSelect={setInput} />
        ) : (
          <div className="flex flex-col gap-2 p-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-border)] p-3 flex flex-col gap-2">
        {messages.length > 0 && !isGenerating && (
          <button
            type="button"
            onClick={handleClear}
            className="self-start text-[10px] text-[var(--color-subtle)] hover:text-[var(--color-muted)] transition-colors"
          >
            Clear conversation
          </button>
        )}
        <div className="relative flex items-end gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 focus-within:border-[var(--color-border2)]">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={messages.length > 0 ? 'Ask a follow-up or request changes...' : 'Describe your workflow...'}
            rows={1}
            disabled={isGenerating}
            className="flex-1 resize-none bg-transparent text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-muted)] outline-none leading-relaxed disabled:opacity-50"
          />
          {isGenerating ? (
            <button
              type="button"
              onClick={handleStop}
              className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/20 text-red-400 transition-colors hover:bg-red-500/30"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="2" y="2" width="6" height="6" rx="1" fill="currentColor" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-white text-black transition-opacity disabled:opacity-30"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 10V2M6 2L2.5 5.5M6 2l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
        {!dbId && (
          <p className="text-[10px] text-[var(--color-subtle)]">Save the workflow first to persist this conversation.</p>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function EmptyState({ suggestions, onSelect }: { suggestions: string[]; onSelect: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16z" stroke="var(--color-muted)" strokeWidth="1.2" />
          <path d="M7 9.5h6M7 12h4" stroke="var(--color-muted)" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="10" cy="7" r="1" fill="var(--color-muted)" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-[13px] font-medium text-[var(--color-text)]">Build with AI</p>
        <p className="text-[11px] text-[var(--color-muted)] mt-1">Describe a workflow and it'll be generated on the canvas</p>
      </div>
      <div className="flex flex-col gap-1.5 w-full mt-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(s)}
            className="text-left text-[11px] text-[var(--color-muted)] px-3 py-2 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border2)] hover:text-[var(--color-text)] transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [thinkingOpen, setThinkingOpen] = useState(false)

  if (message.role === 'user') {
    return (
      <div className="flex justify-end min-w-0">
        <div className="max-w-[85%] min-w-0 rounded-xl px-3 py-2 text-[12px] leading-relaxed bg-white/10 text-[var(--color-text)] break-words">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start min-w-0">
      <div className="max-w-[95%] min-w-0 flex flex-col gap-1.5 w-full">
        {message.thinking && message.thinking.length > 0 && (
          <button
            type="button"
            onClick={() => setThinkingOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[10px] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors self-start"
          >
            <svg
              width="8" height="8" viewBox="0 0 8 8" fill="none"
              className={`transition-transform duration-150 ${thinkingOpen ? 'rotate-90' : ''}`}
            >
              <path d="M2 1l4 3-4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
              <path d="M5.5 8.5c0-.8.3-1.5.8-2s1.2-.7 1.7-.7.9.1 1.2.4.5.7.5 1.2c0 .4-.2.7-.5 1l-.7.5c-.3.3-.5.6-.5 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              <circle cx="8" cy="12" r=".6" fill="currentColor" />
            </svg>
            {message.loading ? 'Thinking...' : 'Reasoning'}
          </button>
        )}
        {thinkingOpen && message.thinking && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[11px] text-[var(--color-muted)] leading-relaxed max-h-[200px] overflow-y-auto whitespace-pre-wrap">
            {message.thinking}
          </div>
        )}

        {(message.content || message.loading) && (
          <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] leading-relaxed text-[var(--color-text)]">
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
                <Markdown remarkPlugins={[remarkGfm]}>{stripCodeBlocks(message.content)}</Markdown>
              </div>
            )}
          </div>
        )}

        {message.workflowApplied && (
          <div className="flex items-center gap-1.5 self-start rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-[11px] text-emerald-400">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6.5L5 9l4.5-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Workflow applied to canvas
          </div>
        )}
      </div>
    </div>
  )
}

function stripCodeBlocks(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim()
}
