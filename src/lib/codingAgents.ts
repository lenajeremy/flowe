import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import type { FlowEdge, FlowNode } from '@/types/workflow'

export type CodingAgentToolEffect = 'read' | 'write' | 'destructive'

export interface CodingAgentToolGrant {
  nodeId: string
  allowedOperations: string[]
  allowedOverrideFields: string[]
}

export interface CodingAgentToolCapability {
  nodeId: string
  nodeType: string
  label: string
  operationField?: string
  operations: Array<{ id: string; label: string; effect: CodingAgentToolEffect; sensitive?: boolean }>
  overridableFields: string[]
}

export interface CodingAgentToolCall {
  id: string
  job_id: string
  node_id: string
  node_label: string
  tool_name: string
  operation: string
  effect: CodingAgentToolEffect
  reason?: string
  arguments: Record<string, unknown>
  effective_config: Record<string, unknown>
  status: 'pending_approval' | 'approved' | 'executing' | 'succeeded' | 'failed' | 'outcome_unknown' | 'rejected' | 'cancelled'
  result?: Record<string, unknown>
  last_error?: string
  requested_at: string
}

export interface CodingAgentCredential {
  id: string
  runtime: string
  status: 'connected' | 'expired' | 'revoked' | 'error'
  account_label?: string
  connected_at: string
  last_verified_at?: string
  last_error?: string
}

export interface CodingAgentRuntimeStatus {
  id: 'codex'
  name: string
  configured: boolean
  connected: boolean
  credential?: CodingAgentCredential | null
}

export interface CodingAgentAuthAttempt {
  id: string
  runtime: 'codex'
  status: 'provisioning' | 'waiting' | 'connected' | 'failed' | 'cancelled' | 'expired'
  verification_url?: string
  user_code?: string
  expires_at: string
  last_error?: string
}

export type CodingAgentJobStatus = 'pending' | 'claimed' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timed_out'

export interface CodingAgentJob {
  id: string
  workflow_id: string
  workflow_run_id: string
  node_id: string
  environment_id?: string
  runtime: 'codex'
  task: string
  execution_policy: Record<string, unknown>
  status: CodingAgentJobStatus
  summary?: string
  last_error?: string
  created_at: string
  started_at?: string
  completed_at?: string
  cancel_requested_at?: string
}

export interface CodingAgentArtifact {
  id: string
  kind: string
  path?: string
  media_type?: string
  size_bytes: number
  sha256?: string
  inline_content?: string
}

export interface CodingAgentJobDetails {
  job: CodingAgentJob
  artifacts: CodingAgentArtifact[]
}

export interface CodingAgentEnvironment {
  id: string
  workflow_id: string
  node_id: string
  status: 'provisioning' | 'ready' | 'busy' | 'stopped' | 'archived' | 'error' | 'deleting'
  repository: string
  branch?: string
  current_job_id?: string
  last_error?: string
  updated_at: string
}

async function apiJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API}${path}`, init)
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error || `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function loadCodingAgentRuntimes(): Promise<CodingAgentRuntimeStatus[]> {
  const response = await apiJSON<{ runtimes: CodingAgentRuntimeStatus[] }>('/api/coding-agents/runtimes')
  return response.runtimes
}

export async function loadCodingAgentCapabilities(nodes: FlowNode[], edges: FlowEdge[]): Promise<{
  capabilities: CodingAgentToolCapability[]
  defaultPolicy: { version: number; nodes: CodingAgentToolGrant[] }
}> {
  return apiJSON('/api/coding-agents/capabilities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: '1.0', name: 'Current canvas', nodes, edges }),
  })
}

export async function loadCodingAgentToolCalls(jobId: string): Promise<CodingAgentToolCall[]> {
  return apiJSON(`/api/coding-agent-tool-calls?jobId=${encodeURIComponent(jobId)}`)
}

export function loadCodingAgentToolCall(id: string): Promise<CodingAgentToolCall> {
  return apiJSON(`/api/coding-agent-tool-calls/${encodeURIComponent(id)}`)
}

export function approveCodingAgentToolCall(id: string): Promise<CodingAgentToolCall> {
  return apiJSON(`/api/coding-agent-tool-calls/${encodeURIComponent(id)}/approve`, { method: 'POST' })
}

export function rejectCodingAgentToolCall(id: string): Promise<CodingAgentToolCall> {
  return apiJSON(`/api/coding-agent-tool-calls/${encodeURIComponent(id)}/reject`, { method: 'POST' })
}

export function reconcileCodingAgentToolCall(id: string, outcome: 'completed' | 'not_completed'): Promise<CodingAgentToolCall> {
  return apiJSON(`/api/coding-agent-tool-calls/${encodeURIComponent(id)}/reconcile`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome }),
  })
}

export function startCodexConnection(): Promise<CodingAgentAuthAttempt> {
  return apiJSON('/api/coding-agents/codex/connect', { method: 'POST' })
}

export function loadCodingAgentAuthAttempt(id: string): Promise<CodingAgentAuthAttempt> {
  return apiJSON(`/api/coding-agents/auth-attempts/${encodeURIComponent(id)}`)
}

export async function cancelCodingAgentAuthAttempt(id: string): Promise<void> {
  const response = await apiFetch(`${API}/api/coding-agents/auth-attempts/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) throw new Error('Could not cancel Codex sign-in')
}

export async function disconnectCodingAgent(runtime: string): Promise<void> {
  const response = await apiFetch(`${API}/api/coding-agents/credentials/${encodeURIComponent(runtime)}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Could not disconnect the coding agent')
}

export async function loadCodingAgentJobs(filters: { workflowId?: string; nodeId?: string; limit?: number } = {}): Promise<CodingAgentJob[]> {
  const query = new URLSearchParams()
  if (filters.workflowId) query.set('workflowId', filters.workflowId)
  if (filters.nodeId) query.set('nodeId', filters.nodeId)
  if (filters.limit) query.set('limit', String(filters.limit))
  const response = await apiJSON<{ jobs: CodingAgentJob[] }>(`/api/coding-agent-jobs?${query.toString()}`)
  return response.jobs
}

export function loadCodingAgentJob(id: string): Promise<CodingAgentJobDetails> {
  return apiJSON(`/api/coding-agent-jobs/${encodeURIComponent(id)}`)
}

export function cancelCodingAgentJob(id: string): Promise<CodingAgentJob> {
  return apiJSON(`/api/coding-agent-jobs/${encodeURIComponent(id)}/cancel`, { method: 'POST' })
}

export async function loadCodingAgentEnvironments(filters: { workflowId?: string; nodeId?: string } = {}): Promise<CodingAgentEnvironment[]> {
  const query = new URLSearchParams()
  if (filters.workflowId) query.set('workflowId', filters.workflowId)
  if (filters.nodeId) query.set('nodeId', filters.nodeId)
  const response = await apiJSON<{ environments: CodingAgentEnvironment[] }>(`/api/coding-agent-environments?${query.toString()}`)
  return response.environments
}

export async function resetCodingAgentEnvironment(id: string): Promise<void> {
  const response = await apiFetch(`${API}/api/coding-agent-environments/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error || 'Could not reset the coding-agent workspace')
  }
}
