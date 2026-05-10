import type { WorkflowAST } from '@/types/workflow'

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
