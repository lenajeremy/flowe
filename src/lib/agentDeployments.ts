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
  source: 'ai' | 'manual'
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
  /**
   * null when the server could not determine whether the bot is in this
   * channel — distinct from false, which means it definitely is not. Treating
   * null as false disables every channel over a failed lookup.
   */
  is_member: boolean | null
  is_private: boolean
}

export interface AgentDeployment {
  id: string
  workflow_id: string
  name: string
  alias: string
  provider: 'slack'
  model_id: string
  version: number
  status: 'draft' | 'active' | 'paused' | 'revoked'
  snapshot_name: string
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

export interface AgentDeploymentWorkflow {
  id: string
  name: string
}

export interface AgentDeploymentDeployer {
  id: string
  name?: string
  email?: string
  avatar_url?: string
}

export interface AgentDeploymentHost {
  id: string
  provider: 'slack'
  external_workspace_id: string
  external_workspace_name: string
  status: 'active' | 'reconnect_required' | 'revoked'
  last_error?: string
}

export interface AgentDeploymentHealth {
  status: 'healthy' | 'needs_attention' | 'paused' | 'revoked'
  message: string
  last_activity_at?: string
  last_delivery_status?: 'pending' | 'processing' | 'completed' | 'failed'
  last_error?: string
}

export interface AgentDeploymentRecord {
  deployment: AgentDeployment
  targets: AgentDeploymentTarget[]
  review: AgentPermissionReview
  capabilities?: AgentNodeCapability[]
  workflow: AgentDeploymentWorkflow
  deployer: AgentDeploymentDeployer
  host?: AgentDeploymentHost
  health: AgentDeploymentHealth
  can_manage: boolean
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

/**
 * The channels this user may deploy to.
 *
 * Scoped server-side to the caller's own Slack membership — the shared host bot
 * sits in channels that have nothing to do with whoever is asking. `scope` is
 * "public" when their Slack identity could not be matched, in which case
 * `notice` explains why private channels are missing.
 */
export interface AgentHostChannelInventory {
  channels: AgentHostChannel[]
  scope: 'member' | 'public'
  notice?: string
  /**
   * The bot's own channel list could not be read, so `is_member` on each
   * channel means "could not tell" rather than "the bot is not in it". Disabling
   * on it here would lock the user out of every channel over a failed lookup.
   */
  membership_unknown?: boolean
}

export function listAgentHostChannels(hostId: string): Promise<AgentHostChannelInventory> {
  return apiJSON(`/api/agent-hosts/${hostId}/channels`)
}

export function joinAgentDeploymentSlackChannel(deploymentId: string, hostInstallationId: string, channelId: string): Promise<AgentHostChannel> {
  return apiJSON(`/api/agent-deployments/${deploymentId}/slack-channels/${encodeURIComponent(channelId)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostInstallationId }),
  })
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

export function listAllAgentDeployments(): Promise<AgentDeploymentRecord[]> {
  return apiJSON('/api/agent-deployments')
}

export function getAgentDeployment(deploymentId: string): Promise<AgentDeploymentRecord> {
  return apiJSON(`/api/agent-deployments/${deploymentId}`)
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
  input: {
    name?: string
    status?: 'active' | 'paused'
    policy?: AgentCapabilityPolicy
    hostInstallationId?: string
    channels?: Array<{ id: string; name: string }>
    expectedUpdatedAt?: string
  },
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
