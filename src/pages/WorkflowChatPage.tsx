import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getWorkflow } from '@/lib/workflowApi'
import { listChatSessions, deleteChatSession, type ChatSessionSummary } from '@/lib/agentChat'
import { useAgentChat } from '@/components/agent/useAgentChat'
import { AgentBubble, Composer } from '@/components/agent/AgentMessages'
import { NODE_ACCENT_HEX, NODE_LABELS } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import { UserMenu } from '@/components/ui/UserMenu'
import { FloweIcon } from '@/components/FloweIcon'
import type { NodeType, WorkflowASTNode } from '@/types/workflow'

// Node types the backend never exposes as tools (mirrors agentSkipNode)
const NON_TOOL_TYPES = new Set<NodeType>(['branch', 'loop', 'textOutput', 'webhookTrigger', 'scheduledTrigger'])

// ── Page ────────────────────────────────────────────────────────

export function WorkflowChatPage() {
  const { id: workflowId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionId = searchParams.get('session')

  const [workflowName, setWorkflowName] = useState('')
  const [toolNodes, setToolNodes] = useState<WorkflowASTNode[]>([])
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, isStreaming, send, stop } = useAgentChat({
    workflowId,
    sessionId,
    onSessionCreated: (created) => {
      setSessions((s) => [
        { id: created.id, title: 'New chat', created_at: created.created_at, updated_at: created.updated_at },
        ...s,
      ])
      setSearchParams({ session: created.id }, { replace: true })
    },
    // Title is set server-side from the first message
    onTurnComplete: () => {
      if (workflowId) listChatSessions(workflowId).then(setSessions).catch(() => {})
    },
    onLoadError: () => setSearchParams({}, { replace: true }),
  })

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selectSession = useCallback((id: string | null) => {
    stop()
    setSearchParams(id ? { session: id } : {}, { replace: true })
  }, [stop, setSearchParams])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    const text = input
    setInput('')
    void send(text)
  }

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
          <div className="mx-auto max-w-[760px]">
            <Composer
              key={sessionId ?? 'new'}
              value={input}
              onChange={setInput}
              onSend={handleSend}
              onStop={stop}
              isStreaming={isStreaming}
              autoFocus
            />
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
