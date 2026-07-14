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
    <div className="flex h-screen bg-[var(--color-canvas)] text-[var(--color-text)]">
      {/* ── Sidebar — tinted, borderless, plain rows ─────────── */}
      <aside className="flex w-[260px] flex-shrink-0 flex-col bg-[var(--color-surface)]">
        <div className="flex h-14 items-center px-4">
          <button
            onClick={() => navigate('/workflows')}
            className="pressable flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text)] hover:bg-[var(--color-hover)]"
            title="All Workflows"
          >
            <FloweIcon size={20} />
          </button>
        </div>

        <div className="px-2.5">
          <button
            onClick={() => selectSession(null)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[var(--color-text)] hover:bg-[var(--color-hover)]"
          >
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <path d="M12.9 1.9a1.4 1.4 0 012 2L7.6 11.2l-2.8.8.8-2.8 7.3-7.3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M13 8.5V12a1.5 1.5 0 01-1.5 1.5H3A1.5 1.5 0 011.5 12V3.5A1.5 1.5 0 013 2h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            New chat
          </button>
          <button
            onClick={() => navigate(`/workflow/${workflowId}`)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[var(--color-text)] hover:bg-[var(--color-hover)]"
          >
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="9" y="9" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <path d="M6 3.75h4.25v3.5M9 11.25H4.75v-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Editor
          </button>
        </div>

        <div className="px-5 pb-1 pt-5 text-[11px] font-medium text-[var(--color-subtle)]">
          Chats
        </div>
        <div className="flex-1 overflow-y-auto px-2.5 pb-3">
          {sessions.length === 0 && (
            <p className="px-2.5 pt-1 text-[12px] text-[var(--color-subtle)]">
              No conversations yet
            </p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group/sess relative rounded-lg ${
                s.id === sessionId ? 'bg-[var(--color-hover2)]' : 'hover:bg-[var(--color-hover)]'
              }`}
            >
              <button
                onClick={() => selectSession(s.id)}
                className="w-full truncate px-2.5 py-2 pr-7 text-left text-[13px] text-[var(--color-text)]"
              >
                {s.title || 'New chat'}
              </button>
              <button
                onClick={() => void removeSession(s.id)}
                title="Delete chat"
                className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-subtle)] opacity-0 transition-opacity hover:text-[var(--color-fail)] group-hover/sess:opacity-100"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main column ──────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Borderless header — workflow name + account */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between px-5">
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] font-semibold">{workflowName || '…'}</span>
            <span className="text-[11px] text-[var(--color-subtle)]">chat</span>
          </div>
          <UserMenu />
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[760px] flex-col gap-5 px-6 pb-6 pt-2">
            {messages.length === 0 ? (
              <EmptyState workflowName={workflowName} toolNodes={toolNodes} />
            ) : (
              messages.map((m) => <AgentBubble key={m.id} message={m} />)
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Floating pill input ─────────────────────────── */}
        <div className="px-6 pb-3 pt-1">
          <div
            className="mx-auto flex max-w-[760px] items-end gap-2 rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-4 pr-2 transition-colors focus-within:border-[var(--color-border2)]"
            style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.18)' }}
          >
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
              rows={Math.min(5, Math.max(1, input.split('\n').length))}
              placeholder="Ask anything"
              className="max-h-36 flex-1 resize-none bg-transparent py-1.5 text-[13.5px] leading-relaxed text-[var(--color-text)] outline-none placeholder:text-[var(--color-subtle)]"
            />
            {isStreaming ? (
              <button
                onClick={() => abortRef.current?.abort()}
                title="Stop"
                className="pressable flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-canvas)]"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <rect x="1.5" y="1.5" width="7" height="7" rx="1.5" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => void send()}
                disabled={!input.trim()}
                title="Send"
                className="pressable flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-canvas)] disabled:opacity-30"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 10V2M2.5 5.5L6 2l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[10.5px] text-[var(--color-subtle)]">
            Chat runs this workflow's nodes on demand — the workflow itself is never modified.
          </p>
        </div>
      </main>
    </div>
  )
}

// ── Empty state ─────────────────────────────────────────────────

function EmptyState({ workflowName, toolNodes }: {
  workflowName: string
  toolNodes: WorkflowASTNode[]
}) {
  return (
    <div className="flex flex-col items-center gap-4 pt-[16vh] text-center">
      <FloweIcon size={34} className="text-[var(--color-accent)]" />
      <div>
        <h1 className="text-[19px] font-semibold">{workflowName ? `Chat with ${workflowName}` : 'Chat with workflow'}</h1>
        <p className="mt-1.5 text-[13px] text-[var(--color-muted)]">
          Ask anything — nodes run only when your request needs them.
        </p>
      </div>
      {toolNodes.length > 0 && (
        <div className="flex max-w-[540px] flex-wrap items-center justify-center gap-1.5">
          {toolNodes.map((n) => (
            <span
              key={n.id}
              className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[11.5px] text-[var(--color-muted)]"
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
  // User — soft pill, right-aligned, no border
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] whitespace-pre-wrap break-words rounded-3xl bg-[var(--color-surface2)] px-4 py-2.5 text-[13.5px] leading-relaxed text-[var(--color-text)]">
          {message.content}
        </div>
      </div>
    )
  }

  // Assistant — plain text on the canvas, tool activity as quiet rows above
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {message.toolCalls.map((t) => <ToolActivityRow key={t.id} chip={t} />)}

      {message.loading && !message.content ? (
        <div className="flex items-center gap-1.5 py-1">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-muted)] [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-muted)] [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-muted)] [animation-delay:300ms]" />
          </div>
          <span className="text-[11px] text-[var(--color-muted)]">
            {message.toolCalls.some((t) => t.status === 'running') ? 'Running…' : 'Thinking…'}
          </span>
        </div>
      ) : message.content ? (
        <div className="chat-markdown min-w-0 text-[13.5px] leading-relaxed text-[var(--color-text)]">
          <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
        </div>
      ) : null}
    </div>
  )
}

function ToolActivityRow({ chip }: { chip: ToolChip }) {
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
        {chip.status === 'running' ? `Running ${chip.node}…` : chip.status === 'ok' ? `Ran ${chip.node}` : `${chip.node} failed`}
      </span>
      {chip.error && <span className="truncate text-[var(--color-subtle)]">— {chip.error}</span>}
    </div>
  )
}
