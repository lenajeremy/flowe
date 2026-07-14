import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getWorkflow } from '@/lib/workflowApi'
import {
  createChatSession, listChatSessions, getChatSession, deleteChatSession, streamAgentTurn,
  type ChatSessionSummary, type StoredAgentMessage,
} from '@/lib/agentChat'
import { NODE_ACCENT_HEX, NODE_LABELS } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import { UserMenu } from '@/components/ui/UserMenu'
import { FloweIcon } from '@/components/FloweIcon'
import type { NodeType, WorkflowASTNode } from '@/types/workflow'

// ── Types ───────────────────────────────────────────────────────

interface ToolChip {
  id: string
  node: string
  nodeId: string
  status: 'running' | 'ok' | 'error'
  error?: string
}

interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls: ToolChip[]
  loading?: boolean
}

// Node types the backend never exposes as tools (mirrors agentSkipNode)
const NON_TOOL_TYPES = new Set<NodeType>(['branch', 'loop', 'textOutput', 'webhookTrigger', 'scheduledTrigger'])

const MODEL_STORAGE_KEY = 'flowe:chat-model'

function fromStored(msgs: StoredAgentMessage[]): AgentMessage[] {
  return msgs.map((m) => ({
    id: crypto.randomUUID(),
    role: m.role,
    content: m.content,
    toolCalls: (m.toolCalls ?? []).map((t) => ({
      id: crypto.randomUUID(),
      node: t.node,
      nodeId: t.nodeId,
      status: t.status,
    })),
  }))
}

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ── Page ────────────────────────────────────────────────────────

export function WorkflowChatPage() {
  const { id: workflowId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionId = searchParams.get('session')

  const [workflowName, setWorkflowName] = useState('')
  const [toolNodes, setToolNodes] = useState<WorkflowASTNode[]>([])
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Session whose transcript is already on screen — set before the lazy
  // session creation in send() updates the URL, so the load effect doesn't
  // clobber the in-flight optimistic messages with the (empty) stored ones.
  const loadedRef = useRef<string | null>(null)

  // ── Workflow + session list ──────────────────────────────────
  useEffect(() => {
    if (!workflowId) return
    getWorkflow(workflowId)
      .then((wf) => {
        setWorkflowName(wf.name)
        setToolNodes((wf.nodes ?? []).filter((n) => !NON_TOOL_TYPES.has(n.data.nodeType)))
      })
      .catch(() => navigate('/workflows'))
    listChatSessions(workflowId).then(setSessions).catch(() => {})
  }, [workflowId, navigate])

  // ── Load the active session's transcript ─────────────────────
  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      loadedRef.current = null
      return
    }
    if (loadedRef.current === sessionId) return
    loadedRef.current = sessionId
    getChatSession(sessionId)
      .then((s) => setMessages(fromStored(s.messages ?? [])))
      .catch(() => setSearchParams({}, { replace: true }))
  }, [sessionId, setSearchParams])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [sessionId])

  // Stop any in-flight stream when leaving the page
  useEffect(() => () => abortRef.current?.abort(), [])

  const selectSession = useCallback((id: string | null) => {
    abortRef.current?.abort()
    setIsStreaming(false)
    setSearchParams(id ? { session: id } : {}, { replace: true })
  }, [setSearchParams])

  // ── Send a turn ──────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming || !workflowId) return
    setInput('')
    setIsStreaming(true)

    const assistantId = crypto.randomUUID()
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', content: text, toolCalls: [] },
      { id: assistantId, role: 'assistant', content: '', toolCalls: [], loading: true },
    ])

    const patch = (fn: (msg: AgentMessage) => AgentMessage) =>
      setMessages((m) => m.map((msg) => (msg.id === assistantId ? fn(msg) : msg)))

    try {
      // Sessions are created lazily on the first message, not on page load
      let sid = sessionId
      if (!sid) {
        const created = await createChatSession(workflowId)
        sid = created.id
        setSessions((s) => [
          { id: created.id, title: 'New chat', created_at: created.created_at, updated_at: created.updated_at },
          ...s,
        ])
        loadedRef.current = sid
        setSearchParams({ session: sid }, { replace: true })
      }

      const controller = new AbortController()
      abortRef.current = controller
      const model = localStorage.getItem(MODEL_STORAGE_KEY) ?? undefined

      await streamAgentTurn(sid, text, model, {
        onText: (delta) => patch((msg) => ({ ...msg, content: msg.content + delta })),
        onToolStart: (chip) => patch((msg) => ({
          ...msg,
          toolCalls: [...msg.toolCalls, { id: crypto.randomUUID(), node: chip.node, nodeId: chip.nodeId, status: 'running' }],
        })),
        onToolResult: (chip) => patch((msg) => {
          // The same node can run more than once per turn — resolve the
          // most recent still-running chip for that node
          const calls = [...msg.toolCalls]
          for (let i = calls.length - 1; i >= 0; i--) {
            if (calls[i].nodeId === chip.nodeId && calls[i].status === 'running') {
              calls[i] = { ...calls[i], status: chip.status, error: chip.error }
              break
            }
          }
          return { ...msg, toolCalls: calls }
        }),
        onError: (message) => patch((msg) => ({ ...msg, content: msg.content ? `${msg.content}\n\n${message}` : message })),
      }, controller.signal)

      // Title is set server-side from the first message
      listChatSessions(workflowId).then(setSessions).catch(() => {})
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const detail = err instanceof Error ? err.message : 'Something went wrong'
        patch((msg) => ({ ...msg, content: msg.content || detail }))
      }
    } finally {
      abortRef.current = null
      setIsStreaming(false)
      patch((msg) => ({ ...msg, loading: false }))
    }
  }, [input, isStreaming, workflowId, sessionId, setSearchParams])

  const removeSession = useCallback(async (id: string) => {
    try {
      await deleteChatSession(id)
      setSessions((s) => s.filter((x) => x.id !== id))
      if (sessionId === id) selectSession(null)
    } catch { /* keep it in the list */ }
  }, [sessionId, selectSession])

  return (
    <div className="flex h-screen flex-col bg-[var(--color-canvas)] text-[var(--color-text)]">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[var(--color-border)] px-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/workflows')}
            className="pressable flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text)] hover:bg-[var(--color-hover)]"
            title="All Workflows"
          >
            <FloweIcon size={20} />
          </button>
          <button
            onClick={() => navigate(`/workflow/${workflowId}`)}
            className="pressable flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Editor
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold">{workflowName || '…'}</span>
          <span
            className="rounded-[15px] px-2 py-0.5 text-[10px] font-medium uppercase"
            style={{
              color: 'var(--color-accent)',
              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              letterSpacing: '0.04em',
            }}
          >
            chat
          </span>
        </div>

        <div className="flex items-center gap-2.5" style={{ minWidth: 120, justifyContent: 'flex-end' }}>
          <button
            onClick={() => selectSession(null)}
            className="pressable flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text)] hover:bg-[var(--color-hover)]"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            New chat
          </button>
          <UserMenu />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Session sidebar ─────────────────────────────── */}
        <aside className="flex w-60 flex-shrink-0 flex-col border-r border-[var(--color-border)]">
          <div className="px-4 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-[var(--color-subtle)]">
            Conversations
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {sessions.length === 0 && (
              <p className="px-2 pt-2 text-[12px] text-[var(--color-muted)]">
                No conversations yet — say hello.
              </p>
            )}
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group/sess relative mt-1 rounded-lg border ${
                  s.id === sessionId
                    ? 'border-[var(--color-border2)] bg-[var(--color-surface)]'
                    : 'border-transparent hover:bg-[var(--color-hover)]'
                }`}
              >
                <button
                  onClick={() => selectSession(s.id)}
                  className="w-full px-2.5 py-2 text-left"
                >
                  <div className="truncate pr-5 text-[12px] font-medium text-[var(--color-text)]">
                    {s.title || 'New chat'}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[var(--color-subtle)]">{timeAgo(s.updated_at)}</div>
                </button>
                <button
                  onClick={() => void removeSession(s.id)}
                  title="Delete conversation"
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md text-[var(--color-subtle)] opacity-0 transition-opacity hover:bg-[var(--color-hover)] hover:text-[var(--color-fail)] group-hover/sess:opacity-100"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Chat column ─────────────────────────────────── */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-5 py-6">
              {messages.length === 0 ? (
                <EmptyState workflowName={workflowName} toolNodes={toolNodes} />
              ) : (
                messages.map((m) => <AgentBubble key={m.id} message={m} />)
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* ── Input ───────────────────────────────────── */}
          <div className="border-t border-[var(--color-border)] px-5 py-3.5">
            <div className="mx-auto flex max-w-[720px] items-end gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 focus-within:border-[var(--color-border2)]">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
                rows={Math.min(4, Math.max(1, input.split('\n').length))}
                placeholder={`Message ${workflowName || 'this workflow'}…`}
                className="max-h-32 flex-1 resize-none bg-transparent py-1 text-[13px] leading-relaxed text-[var(--color-text)] outline-none placeholder:text-[var(--color-subtle)]"
              />
              {isStreaming ? (
                <button
                  onClick={() => abortRef.current?.abort()}
                  title="Stop"
                  className="pressable flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-text)] text-[var(--color-canvas)]"
                >
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
                    <rect x="1.5" y="1.5" width="7" height="7" rx="1" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => void send()}
                  disabled={!input.trim()}
                  title="Send"
                  className="pressable flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-text)] text-[var(--color-canvas)] disabled:opacity-40"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M6 10V2M2.5 5.5L6 2l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
            <p className="mx-auto mt-1.5 max-w-[720px] text-[10px] text-[var(--color-subtle)]">
              Chatting runs this workflow's nodes on demand — the workflow itself is never modified.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

// ── Empty state ─────────────────────────────────────────────────

function EmptyState({ workflowName, toolNodes }: {
  workflowName: string
  toolNodes: WorkflowASTNode[]
}) {
  return (
    <div className="flex flex-col items-center gap-4 pt-[14vh] text-center">
      <FloweIcon size={34} className="text-[var(--color-accent)]" />
      <div>
        <h1 className="text-[17px] font-semibold">{workflowName ? `Chat with ${workflowName}` : 'Chat with workflow'}</h1>
        <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">
          Ask anything — nodes run only when your request needs them.
        </p>
      </div>
      {toolNodes.length > 0 && (
        <div className="flex max-w-[520px] flex-wrap items-center justify-center gap-1.5">
          {toolNodes.map((n) => (
            <span
              key={n.id}
              className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] text-[var(--color-muted)]"
            >
              <span className="h-3.5 w-3.5" style={{ color: NODE_ACCENT_HEX[n.data.nodeType] }}>
                {NODE_ICONS[n.data.nodeType]}
              </span>
              {n.data.label || NODE_LABELS[n.data.nodeType]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Message bubble ──────────────────────────────────────────────

function AgentBubble({ message }: { message: AgentMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] break-words rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--color-text)]">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {message.toolCalls.map((t) => <ToolActivityChip key={t.id} chip={t} />)}

      {(message.content || message.loading) && (
        <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--color-text)]">
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
            <div className="chat-markdown">
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ToolActivityChip({ chip }: { chip: ToolChip }) {
  return (
    <div className="flex w-fit max-w-full items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-2.5 py-1.5 text-[11.5px]">
      {chip.status === 'running' ? (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 animate-spin text-[var(--color-accent)]">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
          <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : chip.status === 'ok' ? (
        <svg width="11" height="11" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 text-[var(--color-ok)]">
          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 text-[var(--color-fail)]">
          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      <span className="truncate text-[var(--color-muted)]">
        {chip.status === 'running' ? `Running ${chip.node}…` : chip.status === 'ok' ? `Ran ${chip.node}` : `${chip.node} failed`}
      </span>
      {chip.error && <span className="truncate text-[var(--color-subtle)]">— {chip.error}</span>}
    </div>
  )
}
