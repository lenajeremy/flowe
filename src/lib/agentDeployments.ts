import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

export type AgentEffect = 'read' | 'write' | 'destructive'

export interface AgentOperationCapability {
  id: string
  label: string
  effect: AgentEffect
  sensitive?: boolean
}

export interface AgentCapabilityResource {
  nodeId: string
  label: string
  pinnedSettings?: string
}

export interface AgentIntegrationCapability {
  nodeType: string
  label: string
  operationField?: string
  operations: AgentOperationCapability[]
  overridableFields: string[]
  resources: AgentCapabilityResource[]
}

interface LegacyAgentNodeCapability {
  nodeId: string
  nodeType: string
  label: string
  operationField?: string
  operations: AgentOperationCapability[]
  overridableFields: string[]
}

export interface AgentIntegrationGrant {
  nodeType: string
  nodeIds: string[]
  allowedOperations: string[]
  allowedOverrideFields: string[]
}

export interface LegacyAgentNodeGrant {
  nodeId: string
  allowedOperations: string[]
  allowedOverrideFields: string[]
}

export interface AgentCapabilityPolicy {
  version: number
  integrations: AgentIntegrationGrant[]
  nodes?: LegacyAgentNodeGrant[]
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
  is_member: boolean
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
  capabilities?: AgentIntegrationCapability[]
  workflow: AgentDeploymentWorkflow
  deployer: AgentDeploymentDeployer
  host?: AgentDeploymentHost
  health: AgentDeploymentHealth
  can_manage: boolean
}

export interface AgentCapabilitiesResponse {
  capabilities: AgentIntegrationCapability[]
  defaultPolicy: AgentCapabilityPolicy
  review: AgentPermissionReview
}

export function cloneAgentCapabilityPolicy(policy?: Partial<AgentCapabilityPolicy> | null): AgentCapabilityPolicy {
  const integrations = (Array.isArray(policy?.integrations) ? policy.integrations : []) as Array<Partial<AgentIntegrationGrant> | null>
  return {
    version: 2,
    integrations: integrations.filter((grant): grant is Partial<AgentIntegrationGrant> & { nodeType: string } => (
      Boolean(grant && typeof grant.nodeType === 'string' && grant.nodeType.trim())
    )).map((grant) => ({
      nodeType: grant.nodeType.trim(),
      nodeIds: Array.isArray(grant.nodeIds) ? [...grant.nodeIds] : [],
      allowedOperations: Array.isArray(grant.allowedOperations) ? [...grant.allowedOperations] : [],
      allowedOverrideFields: Array.isArray(grant.allowedOverrideFields) ? [...grant.allowedOverrideFields] : [],
    })),
  }
}

export function agentPermissionCount(policy?: AgentCapabilityPolicy | null) {
  return (policy?.integrations ?? []).reduce((total, grant) => total + grant.allowedOperations.length, 0)
}

export function normalizeAgentCapabilities(input: unknown): AgentIntegrationCapability[] {
  if (!Array.isArray(input)) return []
  const grouped = new Map<string, AgentIntegrationCapability>()
  for (const raw of input as Array<Partial<AgentIntegrationCapability & LegacyAgentNodeCapability>>) {
    if (!raw || typeof raw.nodeType !== 'string' || raw.nodeType === '') continue
    if (Array.isArray(raw.resources)) {
      grouped.set(raw.nodeType, {
        nodeType: raw.nodeType,
        label: typeof raw.label === 'string' ? raw.label : raw.nodeType,
        operationField: raw.operationField,
        operations: Array.isArray(raw.operations) ? raw.operations : [],
        overridableFields: Array.isArray(raw.overridableFields) ? raw.overridableFields : [],
        resources: raw.resources.filter((resource) => resource && typeof resource.nodeId === 'string'),
      })
      continue
    }
    if (typeof raw.nodeId !== 'string' || raw.nodeId === '') continue
    const current = grouped.get(raw.nodeType) ?? {
      nodeType: raw.nodeType,
      label: raw.nodeType,
      operationField: raw.operationField,
      operations: Array.isArray(raw.operations) ? raw.operations : [],
      overridableFields: Array.isArray(raw.overridableFields) ? raw.overridableFields : [],
      resources: [],
    }
    current.resources.push({ nodeId: raw.nodeId, label: typeof raw.label === 'string' ? raw.label : raw.nodeId })
    grouped.set(raw.nodeType, current)
  }
  return [...grouped.values()].sort((left, right) => left.label.localeCompare(right.label))
}

export function normalizeAgentCapabilityPolicy(policy: Partial<AgentCapabilityPolicy> | null | undefined, capabilities: AgentIntegrationCapability[]): AgentCapabilityPolicy {
  const current = cloneAgentCapabilityPolicy(policy)
  if (current.integrations.length > 0) {
    if (capabilities.length === 0) return current
    const byType = new Map(capabilities.map((capability) => [capability.nodeType, capability]))
    current.integrations = current.integrations.flatMap((grant) => {
      const capability = byType.get(grant.nodeType)
      if (!capability) return []
      const nodeIds = grant.nodeIds.filter((nodeId) => capability.resources.some((resource) => resource.nodeId === nodeId))
      const allowedOperations = grant.allowedOperations.filter((operation) => capability.operations.some((candidate) => candidate.id === operation))
      const allowedOverrideFields = grant.allowedOverrideFields.filter((field) => capability.overridableFields.includes(field) && field !== capability.operationField)
      return nodeIds.length > 0 && allowedOperations.length > 0
        ? [{ ...grant, nodeIds: [...new Set(nodeIds)], allowedOperations: [...new Set(allowedOperations)], allowedOverrideFields: [...new Set(allowedOverrideFields)] }]
        : []
    })
    return current
  }
  if (!Array.isArray(policy?.nodes)) return current
  for (const capability of capabilities) {
    const resourceIds = new Set(capability.resources.map((resource) => resource.nodeId))
    const legacy = policy.nodes.filter((grant) => resourceIds.has(grant.nodeId))
    if (legacy.length === 0) continue
    const common = (key: 'allowedOperations' | 'allowedOverrideFields') => {
      const [first, ...rest] = legacy.map((grant) => Array.isArray(grant[key]) ? grant[key] : [])
      return (first ?? []).filter((value) => rest.every((values) => values.includes(value)))
    }
    const allowedOperations = common('allowedOperations')
    if (allowedOperations.length === 0) continue
    current.integrations.push({ nodeType: capability.nodeType, nodeIds: legacy.map((grant) => grant.nodeId), allowedOperations, allowedOverrideFields: common('allowedOverrideFields') })
  }
  return current
}

function normalizeDeploymentRecord(record: AgentDeploymentRecord): AgentDeploymentRecord {
  const capabilities = normalizeAgentCapabilities(record.capabilities)
  return {
    ...record,
    capabilities,
    deployment: {
      ...record.deployment,
      capability_policy: normalizeAgentCapabilityPolicy(record.deployment.capability_policy, capabilities),
    },
  }
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

export function joinAgentDeploymentSlackChannel(deploymentId: string, hostInstallationId: string, channelId: string): Promise<AgentHostChannel> {
  return apiJSON(`/api/agent-deployments/${deploymentId}/slack-channels/${encodeURIComponent(channelId)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostInstallationId }),
  })
}

export async function getAgentCapabilities(workflowId: string): Promise<AgentCapabilitiesResponse> {
  const response = await apiJSON<AgentCapabilitiesResponse>(`/api/workflows/${workflowId}/agent-deployments/capabilities`)
  return { ...response, capabilities: normalizeAgentCapabilities(response.capabilities) }
}

export function analyzeAgentDeployment(workflowId: string): Promise<AgentPermissionAnalysis> {
  return apiJSON(`/api/workflows/${workflowId}/agent-deployments/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
}

export async function listAgentDeployments(workflowId: string): Promise<AgentDeploymentRecord[]> {
  return (await apiJSON<AgentDeploymentRecord[]>(`/api/workflows/${workflowId}/agent-deployments`)).map(normalizeDeploymentRecord)
}

export async function listAllAgentDeployments(): Promise<AgentDeploymentRecord[]> {
  return (await apiJSON<AgentDeploymentRecord[]>('/api/agent-deployments')).map(normalizeDeploymentRecord)
}

export async function getAgentDeployment(deploymentId: string): Promise<AgentDeploymentRecord> {
  return normalizeDeploymentRecord(await apiJSON<AgentDeploymentRecord>(`/api/agent-deployments/${deploymentId}`))
}

export async function createAgentDeployment(workflowId: string, input: {
  name: string
  alias: string
  hostInstallationId: string
  analysisId: string
  policy: AgentCapabilityPolicy
  channels: Array<{ id: string; name: string }>
}): Promise<AgentDeploymentRecord> {
  return normalizeDeploymentRecord(await apiJSON(`/api/workflows/${workflowId}/agent-deployments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }))
}

export async function updateAgentDeployment(
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
  return normalizeDeploymentRecord(await apiJSON(`/api/agent-deployments/${deploymentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }))
}

export function revokeAgentDeployment(deploymentId: string): Promise<void> {
  return apiJSON(`/api/agent-deployments/${deploymentId}`, { method: 'DELETE' })
}
