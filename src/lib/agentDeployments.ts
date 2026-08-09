import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

export type AgentEffect = 'read' | 'write' | 'destructive'

export interface AgentOperationCapability {
  id: string
  label: string
  effect: AgentEffect
  sensitive?: boolean
}

export interface AgentNodeCapability {
  nodeId: string
  nodeType: string
  label: string
  operationField?: string
  operations: AgentOperationCapability[]
  overridableFields: string[]
}

export interface AgentNodeGrant {
  nodeId: string
  allowedOperations: string[]
  allowedOverrideFields: string[]
}

export interface AgentCapabilityPolicy {
  version: number
  nodes: AgentNodeGrant[]
}

export interface AgentPermissionReview {
  goal?: string
  canRead: string[]
  writesRequiringApproval: string[]
  fixedSettings: string[]
  warnings: string[]
}

export interface AgentPermissionAnalysis {
  analysisId: string
  goal: string
  summary: string
  policy: AgentCapabilityPolicy
  review: AgentPermissionReview
  warnings: string[]
  source: 'ai'
}

export interface AgentHostInstallation {
  id: string
  provider: 'slack'
  external_workspace_id: string
  external_workspace_name: string
  scopes: string
  status: 'active' | 'reconnect_required' | 'revoked'
  last_error?: string
}

export interface AgentHostChannel {
  id: string
  name: string
  is_member: boolean
  is_private: boolean
}

export interface AgentDeployment {
  id: string
  workflow_id: string
  name: string
  alias: string
  provider: 'slack'
  version: number
  status: 'draft' | 'active' | 'paused' | 'revoked'
  snapshot_hash: string
  source_updated_at: string
  capability_policy: AgentCapabilityPolicy
  created_at: string
  updated_at: string
}

export interface AgentDeploymentTarget {
  id: string
  external_channel_id: string
  external_channel_name: string
  enabled: boolean
}

export interface AgentDeploymentRecord {
  deployment: AgentDeployment
  targets: AgentDeploymentTarget[]
  review: AgentPermissionReview
}

export interface AgentCapabilitiesResponse {
  capabilities: AgentNodeCapability[]
  defaultPolicy: AgentCapabilityPolicy
  review: AgentPermissionReview
}

async function apiJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API}${path}`, init)
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json() as { error?: string; detail?: string }
      message = body.error || message
      if (body.detail) message += `: ${body.detail}`
    } catch { /* response was not JSON */ }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function listAgentHosts(): Promise<AgentHostInstallation[]> {
  return apiJSON('/api/agent-hosts')
}

export function getAgentHostConnectURL(): Promise<{ url: string }> {
  const origin = encodeURIComponent(window.location.origin)
  return apiJSON(`/api/agent-hosts/slack/connect?origin=${origin}`)
}

export function listAgentHostChannels(hostId: string): Promise<AgentHostChannel[]> {
  return apiJSON(`/api/agent-hosts/${hostId}/channels`)
}

export function getAgentCapabilities(workflowId: string): Promise<AgentCapabilitiesResponse> {
  return apiJSON(`/api/workflows/${workflowId}/agent-deployments/capabilities`)
}

export function analyzeAgentDeployment(workflowId: string): Promise<AgentPermissionAnalysis> {
  return apiJSON(`/api/workflows/${workflowId}/agent-deployments/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
}

export function listAgentDeployments(workflowId: string): Promise<AgentDeploymentRecord[]> {
  return apiJSON(`/api/workflows/${workflowId}/agent-deployments`)
}

export function createAgentDeployment(workflowId: string, input: {
  name: string
  alias: string
  hostInstallationId: string
  analysisId: string
  policy: AgentCapabilityPolicy
  channels: Array<{ id: string; name: string }>
}): Promise<AgentDeploymentRecord> {
  return apiJSON(`/api/workflows/${workflowId}/agent-deployments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function updateAgentDeployment(
  deploymentId: string,
  input: { name?: string; status?: 'active' | 'paused' },
): Promise<AgentDeploymentRecord> {
  return apiJSON(`/api/agent-deployments/${deploymentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function revokeAgentDeployment(deploymentId: string): Promise<void> {
  return apiJSON(`/api/agent-deployments/${deploymentId}`, { method: 'DELETE' })
}
