import { useState, useEffect, useRef, useCallback } from 'react'
import {
  createChatSession, getChatSession, streamAgentTurn,
  type ChatSessionDetail, type StoredAgentMessage,
} from '@/lib/agentChat'

// ── Shared chat-with-workflow state machine ─────────────────────
// Used by the full chat page and the editor's FAB popover: transcript
// loading, lazy session creation, SSE turn streaming, tool chips.

export interface ToolChip {
  id: string
  node: string
  nodeId: string
  op?: string
  status: 'running' | 'ok' | 'error'
  error?: string
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls: ToolChip[]
  loading?: boolean
}

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
      op: t.op,
      status: t.status,
    })),
  }))
}

export function useAgentChat(opts: {
  workflowId?: string
  /** Controlled by the caller — URL param on the page, local state in the FAB */
  sessionId: string | null
  /** A session was lazily created on first send — persist its id */
  onSessionCreated?: (session: ChatSessionDetail) => void
  /** Turn finished — e.g. refresh the session list for the auto-title */
  onTurnComplete?: () => void
  /** Stored transcript failed to load (deleted session, bad id) */
  onLoadError?: () => void
}) {
  const { workflowId, sessionId, onSessionCreated, onTurnComplete, onLoadError } = opts
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  // Session whose transcript is already on screen — set before lazy session
  // creation updates the caller's sessionId, so the load effect doesn't
  // clobber the in-flight optimistic messages with the (empty) stored ones.
  const loadedRef = useRef<string | null>(null)
  // Callbacks live in refs so the load effect only depends on sessionId
  const callbacksRef = useRef({ onSessionCreated, onTurnComplete, onLoadError })
  callbacksRef.current = { onSessionCreated, onTurnComplete, onLoadError }

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
      .catch(() => {
        loadedRef.current = null
        setMessages([])
        callbacksRef.current.onLoadError?.()
      })
  }, [sessionId])

  // Stop any in-flight stream on unmount
  useEffect(() => () => abortRef.current?.abort(), [])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const send = useCallback(async (raw: string) => {
    const text = raw.trim()
    if (!text || isStreaming || !workflowId) return
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
      // Sessions are created lazily on the first message
      let sid = sessionId
      if (!sid) {
        const created = await createChatSession(workflowId)
        sid = created.id
        loadedRef.current = sid
        callbacksRef.current.onSessionCreated?.(created)
      }

      const controller = new AbortController()
      abortRef.current = controller
      const model = localStorage.getItem(MODEL_STORAGE_KEY) ?? undefined

      await streamAgentTurn(sid, text, model, {
        onText: (delta) => patch((msg) => ({ ...msg, content: msg.content + delta })),
        onToolStart: (chip) => patch((msg) => ({
          ...msg,
          toolCalls: [...msg.toolCalls, { id: crypto.randomUUID(), node: chip.node, nodeId: chip.nodeId, op: chip.op, status: 'running' }],
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

      callbacksRef.current.onTurnComplete?.()
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
  }, [isStreaming, workflowId, sessionId])

  return { messages, isStreaming, send, stop }
}
