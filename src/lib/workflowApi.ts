import { throwApiError } from '@/lib/apiError'
import type { WorkflowAST, ExecutionEvent } from '@/types/workflow'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

// Matches models.Workflow from the Go server (single-workflow endpoints)
export interface SavedWorkflow {
  id: string
  name: string
  nodes: WorkflowAST['nodes']
  edges: WorkflowAST['edges']
  published: boolean
  created_at: string
  updated_at: string
}

// List payload — metadata only; nodes/edges are fetched per-workflow
export interface WorkflowSummary {
  id: string
  name: string
  description: string
  node_count: number
  node_types: string[] | null // distinct nodeType values, for card icons
  published: boolean
  created_at: string
  updated_at: string
}

/** Create an empty workflow shell (dashboard / AI-builder entry points). */
export async function createWorkflow(opts?: { name?: string; description?: string }): Promise<SavedWorkflow> {
  const res = await apiFetch(`${API}/api/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: opts?.name ?? 'New Workflow',
      description: opts?.description ?? '',
      nodes: [],
      edges: [],
    }),
  })
  if (!res.ok) await throwApiError(res, 'Could not create the workflow')
  return res.json() as Promise<SavedWorkflow>
}

export async function saveWorkflow(
  ast: WorkflowAST,
  dbId?: string,
): Promise<SavedWorkflow> {
  const method = dbId ? 'PUT' : 'POST'
  const url = dbId ? `${API}/api/workflows/${dbId}` : `${API}/api/workflows`
  const res = await apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: ast.name, nodes: ast.nodes, edges: ast.edges }),
  })
  if (!res.ok) await throwApiError(res, 'Could not save the workflow')
  return res.json() as Promise<SavedWorkflow>
}

export async function listWorkflows(): Promise<WorkflowSummary[]> {
  const res = await apiFetch(`${API}/api/workflows`)
  if (!res.ok) await throwApiError(res, 'Could not load your workflows')
  return res.json() as Promise<WorkflowSummary[]>
}

export async function getWorkflow(id: string): Promise<SavedWorkflow> {
  const res = await apiFetch(`${API}/api/workflows/${id}`)
  if (!res.ok) await throwApiError(res, 'Could not load that workflow')
  return res.json() as Promise<SavedWorkflow>
}

export async function deleteWorkflow(id: string): Promise<void> {
  const res = await apiFetch(`${API}/api/workflows/${id}`, { method: 'DELETE' })
  if (!res.ok) await throwApiError(res, 'Could not delete the workflow')
}

/** Publishing gates SCHEDULED runs only — manual, webhook, and API triggers
 *  work either way. */
export async function setWorkflowPublished(id: string, published: boolean): Promise<void> {
  const res = await apiFetch(`${API}/api/workflows/${id}/${published ? 'publish' : 'unpublish'}`, {
    method: 'POST',
  })
  if (!res.ok) {
    await throwApiError(res, `Could not ${published ? 'publish' : 'unpublish'} the workflow`)
  }
}

// ── Run history ──────────────────────────────────────────────

export interface WorkflowRun {
  id: string
  workflow_id: string
  workflow_name?: string
  status: 'running' | 'completed' | 'error'
  error_message?: string
  // Present on GET /runs/:id only — list endpoints return summaries
  events?: ExecutionEvent[]
  // The graph this run actually executed, captured at admission. Lets a past
  // run be compared against the workflow as it stands now, which may have been
  // edited since — or, for a manual run, never saved in the first place.
  graph?: { nodes: { id: string }[]; edges: { id: string }[] }
  created_at: string
  updated_at: string
}

export async function listRuns(workflowId: string): Promise<WorkflowRun[]> {
  const res = await apiFetch(`${API}/api/workflows/${workflowId}/runs`)
  if (!res.ok) throw new Error(`Failed to list runs: ${res.status}`)
  return res.json() as Promise<WorkflowRun[]>
}

export async function getRun(runId: string): Promise<WorkflowRun> {
  const res = await apiFetch(`${API}/api/runs/${runId}`)
  if (!res.ok) throw new Error(`Failed to get run: ${res.status}`)
  return res.json() as Promise<WorkflowRun>
}

// ── Approvals ────────────────────────────────────────────────

export async function approveRun(runId: string, nodeId: string): Promise<void> {
  const res = await apiFetch(`${API}/api/runs/${runId}/node/${nodeId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Failed to approve run: ${res.status}`)
}

export async function rejectRun(runId: string, nodeId: string): Promise<void> {
  const res = await apiFetch(`${API}/api/runs/${runId}/node/${nodeId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await apiFetch(`${API}/api/apikeys`)
  if (!res.ok) throw new Error(`Failed to list API keys: ${res.status}`)
  return res.json() as Promise<ApiKey[]>
}

export async function createApiKey(name: string): Promise<{ id: string; name: string; key: string; prefix: string }> {
  const res = await apiFetch(`${API}/api/apikeys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`Failed to create API key: ${res.status}`)
  return res.json() as Promise<{ id: string; name: string; key: string; prefix: string }>
}

export async function deleteApiKey(id: string): Promise<void> {
  const res = await apiFetch(`${API}/api/apikeys/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete API key: ${res.status}`)
}
