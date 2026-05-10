import type { WorkflowAST, ExecutionEvent } from '@/types/workflow'

// Matches models.Workflow from the Go server
export interface SavedWorkflow {
  id: string
  name: string
  nodes: WorkflowAST['nodes']
  edges: WorkflowAST['edges']
  created_at: string
  updated_at: string
}

export async function saveWorkflow(
  ast: WorkflowAST,
  dbId?: string,
): Promise<SavedWorkflow> {
  const method = dbId ? 'PUT' : 'POST'
  const url = dbId ? `/api/workflows/${dbId}` : '/api/workflows'
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: ast.name, nodes: ast.nodes, edges: ast.edges }),
  })
  if (!res.ok) throw new Error(`Failed to save workflow: ${res.status}`)
  return res.json() as Promise<SavedWorkflow>
}

export async function listWorkflows(): Promise<SavedWorkflow[]> {
  const res = await fetch('/api/workflows')
  if (!res.ok) throw new Error(`Failed to list workflows: ${res.status}`)
  return res.json() as Promise<SavedWorkflow[]>
}

export async function getWorkflow(id: string): Promise<SavedWorkflow> {
  const res = await fetch(`/api/workflows/${id}`)
  if (!res.ok) throw new Error(`Failed to get workflow: ${res.status}`)
  return res.json() as Promise<SavedWorkflow>
}

export async function deleteWorkflow(id: string): Promise<void> {
  const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete workflow: ${res.status}`)
}

// ── Run history ──────────────────────────────────────────────

export interface WorkflowRun {
  id: string
  workflow_id: string
  status: 'running' | 'completed' | 'error'
  error_msg?: string
  events?: ExecutionEvent[]
  created_at: string
  updated_at: string
}

export async function listRuns(workflowId: string): Promise<WorkflowRun[]> {
  const res = await fetch(`/api/workflows/${workflowId}/runs`)
  if (!res.ok) throw new Error(`Failed to list runs: ${res.status}`)
  return res.json() as Promise<WorkflowRun[]>
}

export async function getRun(runId: string): Promise<WorkflowRun> {
  const res = await fetch(`/api/runs/${runId}`)
  if (!res.ok) throw new Error(`Failed to get run: ${res.status}`)
  return res.json() as Promise<WorkflowRun>
}

// ── Approvals ────────────────────────────────────────────────

export async function approveRun(runId: string, nodeId: string): Promise<void> {
  const res = await fetch(`/api/runs/${runId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ node_id: nodeId, decision: 'approve' }),
  })
  if (!res.ok) throw new Error(`Failed to approve run: ${res.status}`)
}

export async function rejectRun(runId: string, nodeId: string): Promise<void> {
  const res = await fetch(`/api/runs/${runId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ node_id: nodeId, decision: 'reject' }),
  })
  if (!res.ok) throw new Error(`Failed to reject run: ${res.status}`)
}

// ── Programmatic API keys ────────────────────────────────────

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  created_at: string
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const res = await fetch('/api/keys')
  if (!res.ok) throw new Error(`Failed to list API keys: ${res.status}`)
  return res.json() as Promise<ApiKey[]>
}

export async function createApiKey(name: string): Promise<{ id: string; name: string; key: string; prefix: string }> {
  const res = await fetch('/api/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`Failed to create API key: ${res.status}`)
  return res.json() as Promise<{ id: string; name: string; key: string; prefix: string }>
}

export async function deleteApiKey(id: string): Promise<void> {
  const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete API key: ${res.status}`)
}
