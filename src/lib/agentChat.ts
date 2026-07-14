import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

// ── Chat-with-workflow (agent mode) API ─────────────────────────
// Sessions live in Postgres; a turn is an SSE stream where the
// orchestrator may lazily execute workflow nodes as tools.

export interface ChatSessionSummary {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface AgentToolCallRecord {
  node: string
  nodeId: string
  status: 'ok' | 'error'
}

export interface StoredAgentMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: AgentToolCallRecord[]
}

export interface ChatSessionDetail {
  id: string
  workflow_id: string
  title: string
  messages: StoredAgentMessage[]
  created_at: string
  updated_at: string
}

export async function createChatSession(workflowId: string): Promise<ChatSessionDetail> {
  const res = await apiFetch(`${API}/api/workflows/${workflowId}/chat-sessions`, { method: 'POST' })
  if (!res.ok) throw new Error(`Failed to create chat session: ${res.status}`)
  return res.json() as Promise<ChatSessionDetail>
}

export async function listChatSessions(workflowId: string): Promise<ChatSessionSummary[]> {
  const res = await apiFetch(`${API}/api/workflows/${workflowId}/chat-sessions`)
  if (!res.ok) throw new Error(`Failed to list chat sessions: ${res.status}`)
  return res.json() as Promise<ChatSessionSummary[]>
}

export async function getChatSession(id: string): Promise<ChatSessionDetail> {
  const res = await apiFetch(`${API}/api/chat-sessions/${id}`)
  if (!res.ok) throw new Error(`Failed to load chat session: ${res.status}`)
  return res.json() as Promise<ChatSessionDetail>
}

export async function deleteChatSession(id: string): Promise<void> {
  const res = await apiFetch(`${API}/api/chat-sessions/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete chat session: ${res.status}`)
}

// ── Turn streaming ──────────────────────────────────────────────

export interface AgentTurnHandlers {
  onThinking?: (delta: string) => void
  onText: (delta: string) => void
  onToolStart: (chip: { node: string; nodeId: string }) => void
  onToolResult: (chip: { node: string; nodeId: string; status: 'ok' | 'error'; error?: string }) => void
  onError: (message: string) => void
}

/** POST a user message and consume the SSE turn stream until `done`. */
export async function streamAgentTurn(
  sessionId: string,
  message: string,
  model: string | undefined,
  handlers: AgentTurnHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await apiFetch(`${API}/api/chat-sessions/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, model }),
    signal,
  })
  if (!res.ok || !res.body) {
    let detail = `Request failed: ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) detail = body.error
    } catch { /* ignore */ }
    throw new Error(detail)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let currentEvent = ''
  let dataLines: string[] = []

  const dispatch = () => {
    const data = dataLines.join('\n')
    dataLines = []
    switch (currentEvent) {
      case 'thinking':
        handlers.onThinking?.(data)
        break
      case 'text':
        handlers.onText(data)
        break
      case 'tool_start':
        try { handlers.onToolStart(JSON.parse(data)) } catch { /* ignore */ }
        break
      case 'tool_result':
        try { handlers.onToolResult(JSON.parse(data)) } catch { /* ignore */ }
        break
      case 'error':
        handlers.onError(data)
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
        if (currentEvent && dataLines.length > 0) dispatch()
        currentEvent = line.slice(7)
      } else if (line.startsWith('data: ')) {
        dataLines.push(line.slice(6))
      } else if (line === '' && currentEvent) {
        dispatch()
      }
    }
  }
  if (currentEvent && dataLines.length > 0) dispatch()
}
