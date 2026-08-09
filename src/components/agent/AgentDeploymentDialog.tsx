import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bot,
  Check,
  ChevronDown,
  CircleAlert,
  Hash,
  LoaderCircle,
  LockKeyhole,
  Pause,
  Play,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { IntegrationLogo } from '@/components/IntegrationLogo'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  analyzeAgentDeployment,
  createAgentDeployment,
  getAgentCapabilities,
  getAgentHostConnectURL,
  listAgentDeployments,
  listAgentHostChannels,
  listAgentHosts,
  revokeAgentDeployment,
  updateAgentDeployment,
  type AgentCapabilityPolicy,
  type AgentDeploymentRecord,
  type AgentHostChannel,
  type AgentHostInstallation,
  type AgentNodeCapability,
  type AgentPermissionAnalysis,
} from '@/lib/agentDeployments'

interface Props {
  open: boolean
  workflowId: string
  workflowName: string
  onOpenChange: (open: boolean) => void
}

interface SlackDestinationState {
  hostId: string
  channels: AgentHostChannel[]
  selectedChannels: string[]
  channelsLoading: boolean
  loadVersion: number
}

const REQUIRED_SLACK_SCOPES = [
  'app_mentions:read', 'chat:write', 'chat:write.customize',
  'channels:read', 'channels:history', 'groups:read', 'groups:history',
]

function slugAgentName(value: string) {
  let slug = value.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  if (slug.length < 2) slug = 'workflow-agent'
  return slug.slice(0, 32)
}

function hasSlackScope(host: AgentHostInstallation, scope: string) {
  return host.scopes.split(/[ ,]+/).includes(scope)
}

function hostReady(host: AgentHostInstallation) {
  return host.status === 'active' && REQUIRED_SLACK_SCOPES.every((scope) => hasSlackScope(host, scope))
}

function humanizeField(field: string) {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
}

function clonePolicy(policy: AgentCapabilityPolicy): AgentCapabilityPolicy {
  return {
    version: policy.version,
    nodes: policy.nodes.map((node) => ({
      nodeId: node.nodeId,
      allowedOperations: [...node.allowedOperations],
      allowedOverrideFields: [...node.allowedOverrideFields],
    })),
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong'
}

export function AgentDeploymentDialog({ open, workflowId, workflowName, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [hosts, setHosts] = useState<AgentHostInstallation[]>([])
  const [destination, setDestination] = useState<SlackDestinationState>({
    hostId: '', channels: [], selectedChannels: [], channelsLoading: false, loadVersion: 0,
  })
  const [capabilities, setCapabilities] = useState<AgentNodeCapability[]>([])
  const [deployments, setDeployments] = useState<AgentDeploymentRecord[]>([])
  const [name, setName] = useState(workflowName || 'Workflow agent')
  const [alias, setAlias] = useState(slugAgentName(workflowName))
  const [analysis, setAnalysis] = useState<AgentPermissionAnalysis | null>(null)
  const [policy, setPolicy] = useState<AgentCapabilityPolicy | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [managingId, setManagingId] = useState<string | null>(null)

  const { hostId, channels, selectedChannels, channelsLoading, loadVersion } = destination

  const refreshHosts = useCallback(async () => {
    const next = await listAgentHosts()
    setHosts(next)
    setDestination((current) => {
      const retained = next.find((host) => host.id === current.hostId && hostReady(host))
      const nextHostId = retained?.id || next.find(hostReady)?.id || ''
      return {
        hostId: nextHostId,
        channels: [],
        selectedChannels: [],
        channelsLoading: Boolean(nextHostId),
        loadVersion: current.loadVersion + 1,
      }
    })
  }, [])

  const refreshDeployments = useCallback(async () => {
    const records = await listAgentDeployments(workflowId)
    setDeployments(records.filter((record) => record.deployment.status !== 'revoked'))
  }, [workflowId])

  useEffect(() => {
    if (!open) return
    let active = true
    setName(workflowName || 'Workflow agent')
    setAlias(slugAgentName(workflowName))
    setDestination((current) => ({
      ...current, channels: [], selectedChannels: [], channelsLoading: false,
    }))
    setAnalysis(null)
    setPolicy(null)
    setLoading(true)
    Promise.all([
      listAgentHosts(),
      getAgentCapabilities(workflowId),
      listAgentDeployments(workflowId),
    ])
      .then(([nextHosts, capabilityResult, nextDeployments]) => {
        if (!active) return
        setHosts(nextHosts)
        setCapabilities(capabilityResult.capabilities)
        setDeployments(nextDeployments.filter((record) => record.deployment.status !== 'revoked'))
        const nextHostId = nextHosts.find(hostReady)?.id || ''
        setDestination((current) => ({
          hostId: nextHostId,
          channels: [],
          selectedChannels: [],
          channelsLoading: Boolean(nextHostId),
          loadVersion: current.loadVersion + 1,
        }))
      })
      .catch((error) => {
        if (active) toast.error('Could not load agent deployment', { description: errorMessage(error) })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [open, workflowId, workflowName])

  useEffect(() => {
    if (!open || !hostId) return
    let active = true
    const requestedHostId = hostId
    const requestedLoadVersion = loadVersion
    listAgentHostChannels(requestedHostId)
      .then((next) => {
        if (!active) return
        setDestination((current) => {
          if (current.hostId !== requestedHostId || current.loadVersion !== requestedLoadVersion) return current
          return {
            ...current,
            channels: [...next].sort((a, b) => a.name.localeCompare(b.name)),
            channelsLoading: false,
          }
        })
      })
      .catch((error) => {
        if (!active) return
        setDestination((current) => {
          if (current.hostId !== requestedHostId || current.loadVersion !== requestedLoadVersion) return current
          return { ...current, channels: [], selectedChannels: [], channelsLoading: false }
        })
        toast.error('Could not load Slack channels', { description: errorMessage(error) })
      })
    return () => { active = false }
  }, [hostId, loadVersion, open])

  useEffect(() => {
    if (!open) return
    const apiOrigin = import.meta.env.VITE_BACKEND_URL
      ? new URL(import.meta.env.VITE_BACKEND_URL as string).origin
      : window.location.origin
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== apiOrigin) return
      const data = event.data as { type?: string; provider?: string; status?: string; error?: string } | null
      if (data?.type !== 'integration-oauth' || data.provider !== 'slack') return
      setConnecting(false)
      if (data.status === 'connected') {
        void refreshHosts()
        toast.success('Slack connected')
      } else {
        toast.error('Slack connection failed', { description: data.error || 'Try connecting again.' })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [open, refreshHosts])

  const policySummary = useMemo(() => {
    const byNode = new Map(capabilities.map((capability) => [capability.nodeId, capability]))
    const reads: string[] = []
    const writes: string[] = []
    const fixed: string[] = []
    for (const grant of policy?.nodes ?? []) {
      const capability = byNode.get(grant.nodeId)
      if (!capability) continue
      for (const operationId of grant.allowedOperations) {
        const operation = capability.operations.find((item) => item.id === operationId)
        if (!operation) continue
        const line = `${capability.label} can ${operation.label.toLowerCase()}`
        if (operation.effect === 'read') reads.push(line)
        else writes.push(`${line} after the requesting teammate approves it`)
      }
      fixed.push(grant.allowedOverrideFields.length === 0
        ? `${capability.label} uses its deployed settings exactly`
        : `${capability.label} stays fixed except: ${grant.allowedOverrideFields.map(humanizeField).join(', ')}`)
    }
    return { reads, writes, fixed }
  }, [capabilities, policy])

  const reviewWarnings = useMemo(() => {
    const warnings = [...(analysis?.warnings ?? [])]
    const byNode = new Map(capabilities.map((capability) => [capability.nodeId, capability]))
    for (const grant of policy?.nodes ?? []) {
      const capability = byNode.get(grant.nodeId)
      if (!capability) continue
      for (const operationId of grant.allowedOperations) {
        const operation = capability.operations.find((item) => item.id === operationId)
        if (!operation) continue
        if (operation.id.toLowerCase().startsWith('search')) {
          warnings.push(`${capability.label}: search may reach beyond a saved folder, project or other pinned target.`)
        }
        if (operation.effect === 'destructive') {
          warnings.push(`${capability.label}: ${operation.label} is destructive and will require the requester’s approval every time.`)
        }
        if (capability.nodeType === 'httpRequest') {
          warnings.push(`${capability.label}: Fernary cannot prove the effect of a generic HTTP endpoint, so every request requires approval.`)
        }
      }
    }
    return [...new Set(warnings)]
  }, [analysis, capabilities, policy])

  const selectedHost = hosts.find((host) => host.id === hostId)
  const reconnectHost = hosts.find((host) => !hostReady(host))
  const validAlias = /^[a-z0-9][a-z0-9_-]{1,31}$/.test(alias)
  const validChannelSelection = selectedChannels.length > 0 && selectedChannels.every((channelId) =>
    channels.some((channel) => channel.id === channelId && channel.is_member))
  const canDeploy = Boolean(
    analysis && policy && policy.nodes.length > 0 && name.trim() && validAlias &&
    selectedHost && validChannelSelection && !channelsLoading && !connecting && !deploying,
  )

  async function connectSlack() {
    const popup = window.open('about:blank', 'connect-slack-agent', 'width=560,height=720,menubar=no,toolbar=no')
    setConnecting(true)
    try {
      const result = await getAgentHostConnectURL()
      const target = new URL(result.url)
      if (target.protocol !== 'https:' || target.hostname !== 'slack.com') throw new Error('Unexpected Slack authorization URL')
      if (!popup) throw new Error('Allow popups for Fernary, then try again.')
      popup.location.href = target.href
      popup.focus()
    } catch (error) {
      popup?.close()
      setConnecting(false)
      toast.error('Could not connect Slack', { description: errorMessage(error) })
    }
  }

  async function analyze() {
    setAnalyzing(true)
    try {
      const result = await analyzeAgentDeployment(workflowId)
      setAnalysis(result)
      setPolicy(clonePolicy(result.policy))
    } catch (error) {
      toast.error('Could not analyze agent access', { description: errorMessage(error) })
    } finally {
      setAnalyzing(false)
    }
  }

  function toggleChannel(channelId: string) {
    setDestination((current) => {
      const channel = current.channels.find((item) => item.id === channelId)
      if (!channel?.is_member) return current
      return {
        ...current,
        selectedChannels: current.selectedChannels.includes(channelId)
          ? current.selectedChannels.filter((id) => id !== channelId)
          : [...current.selectedChannels, channelId],
      }
    })
  }

  function toggleOperation(nodeId: string, operationId: string) {
    setPolicy((current) => {
      if (!current) return current
      const next = clonePolicy(current)
      let grant = next.nodes.find((node) => node.nodeId === nodeId)
      if (!grant) {
        grant = { nodeId, allowedOperations: [], allowedOverrideFields: [] }
        next.nodes.push(grant)
      }
      grant.allowedOperations = grant.allowedOperations.includes(operationId)
        ? grant.allowedOperations.filter((id) => id !== operationId)
        : [...grant.allowedOperations, operationId]
      if (grant.allowedOperations.length === 0) next.nodes = next.nodes.filter((node) => node.nodeId !== nodeId)
      return next
    })
  }

  function toggleField(nodeId: string, field: string) {
    setPolicy((current) => {
      if (!current) return current
      const next = clonePolicy(current)
      const grant = next.nodes.find((node) => node.nodeId === nodeId)
      if (!grant) return current
      grant.allowedOverrideFields = grant.allowedOverrideFields.includes(field)
        ? grant.allowedOverrideFields.filter((item) => item !== field)
        : [...grant.allowedOverrideFields, field]
      return next
    })
  }

  async function deploy() {
    if (!analysis || !policy || !selectedHost || channelsLoading || connecting) return
    const selected = channels
      .filter((channel) => selectedChannels.includes(channel.id) && channel.is_member)
      .map((channel) => ({ id: channel.id, name: channel.name }))
    if (selected.length === 0 || selected.length !== selectedChannels.length) return
    setDeploying(true)
    try {
      await createAgentDeployment(workflowId, {
        name: name.trim(),
        alias,
        hostInstallationId: selectedHost.id,
        analysisId: analysis.analysisId,
        policy,
        channels: selected,
      })
      await refreshDeployments()
      setDestination((current) => ({ ...current, selectedChannels: [] }))
      setAnalysis(null)
      setPolicy(null)
      toast.success(`${name.trim()} is live in Slack`, {
        description: `Mention Fernary in ${selected.map((channel) => `#${channel.name}`).join(', ')} to start a thread.`,
      })
    } catch (error) {
      toast.error('Could not deploy agent', { description: errorMessage(error) })
    } finally {
      setDeploying(false)
    }
  }

  async function changeStatus(record: AgentDeploymentRecord) {
    const status = record.deployment.status === 'active' ? 'paused' : 'active'
    setManagingId(record.deployment.id)
    try {
      const updated = await updateAgentDeployment(record.deployment.id, { status })
      setDeployments((current) => current.map((item) => item.deployment.id === updated.deployment.id ? updated : item))
      toast.success(status === 'active' ? 'Agent resumed' : 'Agent paused')
    } catch (error) {
      toast.error(`Could not ${status === 'active' ? 'resume' : 'pause'} agent`, { description: errorMessage(error) })
    } finally {
      setManagingId(null)
    }
  }

  async function revoke(record: AgentDeploymentRecord) {
    if (!window.confirm(`Revoke ${record.deployment.name}? Mentions in its allowed channels will stop working immediately.`)) return
    setManagingId(record.deployment.id)
    try {
      await revokeAgentDeployment(record.deployment.id)
      setDeployments((current) => current.filter((item) => item.deployment.id !== record.deployment.id))
      toast.success('Agent revoked')
    } catch (error) {
      toast.error('Could not revoke agent', { description: errorMessage(error) })
    } finally {
      setManagingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[88vh] w-[calc(100vw-2rem)] max-w-[920px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden bg-[var(--color-surface)] p-0 sm:max-w-[920px]">
        <DialogHeader className="border-b border-[var(--color-border)] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Bot size={18} />
            </span>
            <div>
              <DialogTitle className="text-[15px] font-semibold">Deploy this workflow as an agent</DialogTitle>
              <DialogDescription className="mt-1 text-[12px]">
                Teammates mention Fernary in Slack. The agent runs as you, against this saved snapshot.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex min-h-56 items-center justify-center text-[var(--color-muted)]">
              <LoaderCircle className="animate-spin" size={20} />
            </div>
          ) : (
            <div className="space-y-7">
              {deployments.length > 0 && (
                <section>
                  <SectionTitle number="" title="Live deployments" />
                  <div className="mt-3 space-y-2">
                    {deployments.map((record) => {
                      const busy = managingId === record.deployment.id
                      return (
                        <div key={record.deployment.id} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3.5 py-3">
                          <span className={`h-2 w-2 rounded-full ${record.deployment.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-[13px] font-medium">{record.deployment.name}</span>
                              <span className="rounded-full bg-[var(--color-hover)] px-2 py-0.5 text-[10px] text-[var(--color-muted)]">
                                {record.deployment.status} · v{record.deployment.version}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-[var(--color-subtle)]">
                              {record.targets.length > 0
                                ? record.targets.map((target) => `#${target.external_channel_name || target.external_channel_id}`).join(', ')
                                : 'No active channels'}
                            </p>
                          </div>
                          {(record.deployment.status === 'active' || record.deployment.status === 'paused') && (
                            <Button variant="ghost" size="icon-sm" disabled={busy} title={record.deployment.status === 'active' ? 'Pause' : 'Resume'} onClick={() => void changeStatus(record)}>
                              {busy ? <LoaderCircle className="animate-spin" /> : record.deployment.status === 'active' ? <Pause /> : <Play />}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-sm" disabled={busy} title="Revoke" className="text-[var(--color-fail)]" onClick={() => void revoke(record)}>
                            <Trash2 />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              <section>
                <SectionTitle number="1" title="Name and destination" />
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="agent-name" className="text-[11.5px]">Agent name</Label>
                    <Input id="agent-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Sales assistant" />
                    <p className="text-[10.5px] text-[var(--color-subtle)]">Shown in Fernary and used when the agent introduces itself.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="agent-alias" className="text-[11.5px]">Agent handle</Label>
                    <Input id="agent-alias" value={alias} maxLength={32} aria-invalid={alias !== '' && !validAlias} onChange={(event) => setAlias(event.target.value.toLowerCase())} placeholder="sales-agent" />
                    <p className={`text-[10.5px] ${alias && !validAlias ? 'text-[var(--color-fail)]' : 'text-[var(--color-subtle)]'}`}>
                      {alias && !validAlias ? 'Use 2–32 lowercase letters, numbers, hyphens or underscores.' : 'Reserved for multi-agent channel routing later.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-3.5">
                  {selectedHost ? (
                    <div className="flex items-center gap-3">
                      <IntegrationLogo type="slack" size={24} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{selectedHost.external_workspace_name || 'Slack workspace'}</p>
                        <p className="text-[10.5px] text-[var(--color-subtle)]">Connected with mention and reply access</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void connectSlack()} disabled={connecting}>
                        {connecting && <LoaderCircle className="animate-spin" />} Reconnect
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <IntegrationLogo type="slack" size={24} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium">{reconnectHost ? 'Reconnect Slack' : 'Connect Slack'}</p>
                        <p className="text-[10.5px] text-[var(--color-subtle)]">
                          {reconnectHost ? 'The existing connection predates mention support.' : 'Install Fernary so it can receive mentions and answer in threads.'}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => void connectSlack()} disabled={connecting}>
                        {connecting && <LoaderCircle className="animate-spin" />} {reconnectHost ? 'Reconnect' : 'Connect'}
                      </Button>
                    </div>
                  )}
                </div>

                {selectedHost && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11.5px]">Allowed channels</Label>
                      <span className="flex items-center gap-1 text-[10.5px] text-[var(--color-subtle)]"><LockKeyhole size={11} /> Starts closed</span>
                    </div>
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-1.5">
                      {channelsLoading ? (
                        <div className="flex h-20 items-center justify-center"><LoaderCircle className="animate-spin text-[var(--color-muted)]" size={17} /></div>
                      ) : channels.length === 0 ? (
                        <p className="px-3 py-6 text-center text-[11.5px] text-[var(--color-muted)]">No channels are available. Invite Fernary to a private channel before selecting it.</p>
                      ) : channels.map((channel) => {
                        const checked = selectedChannels.includes(channel.id)
                        return (
                          <button key={channel.id} type="button" disabled={!channel.is_member} onClick={() => toggleChannel(channel.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--color-hover)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent">
                            <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--primary-foreground)]' : 'border-[var(--color-border)]'}`}>
                              {checked && <Check size={11} strokeWidth={3} />}
                            </span>
                            <Hash size={13} className="text-[var(--color-subtle)]" />
                            <span className="flex-1 text-[12px]">{channel.name}</span>
                            <span className="text-[10px] text-[var(--color-subtle)]">{!channel.is_member ? 'invite Fernary first' : channel.is_private ? 'private' : ''}</span>
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-1.5 text-[10.5px] text-[var(--color-subtle)]">A channel can host one workflow agent in this release.</p>
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between gap-4">
                  <SectionTitle number="2" title="Review what the agent can do" />
                  <Button variant={analysis ? 'outline' : 'default'} size="sm" onClick={() => void analyze()} disabled={analyzing || capabilities.length === 0}>
                    {analyzing ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
                    {analysis ? 'Analyze again' : 'Analyze access'}
                  </Button>
                </div>
                {!analysis && !analyzing && (
                  <div className="mt-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-5 text-center">
                    <p className="text-[12px] text-[var(--color-muted)]">Fernary will infer the agent’s goal from the workflow and Builder conversation, then recommend least-privilege access.</p>
                  </div>
                )}
                {analyzing && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-5">
                    <LoaderCircle className="animate-spin text-[var(--color-accent)]" size={18} />
                    <div><p className="text-[12.5px] font-medium">Analyzing this workflow</p><p className="mt-0.5 text-[10.5px] text-[var(--color-subtle)]">Checking each operation and which settings need to stay pinned.</p></div>
                  </div>
                )}
                {analysis && policy && (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
                      <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-subtle)]">Inferred goal</p>
                      <p className="mt-1.5 text-[13px] leading-5">{analysis.goal || analysis.summary}</p>
                    </div>
                    <PermissionGroup icon={<ShieldCheck size={15} />} title="Can read without asking" lines={policySummary.reads} empty="No read operations selected" />
                    <PermissionGroup icon={<CircleAlert size={15} />} title="Must ask the requester first" lines={policySummary.writes} empty="No write operations selected" tone="warning" />
                    <PermissionGroup icon={<LockKeyhole size={15} />} title="Settings that stay fixed" lines={policySummary.fixed} empty="No nodes exposed" />
                    {reviewWarnings.length > 0 && (
                      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
                        <p className="text-[11.5px] font-medium text-amber-700 dark:text-amber-300">Review notes</p>
                        <ul className="mt-1.5 space-y-1 text-[11px] leading-4 text-[var(--color-muted)]">
                          {reviewWarnings.map((warning, index) => <li key={`${warning}-${index}`}>• {warning}</li>)}
                        </ul>
                      </div>
                    )}

                    <details className="group rounded-xl border border-[var(--color-border)]">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[12px] font-medium">
                        Advanced access customization
                        <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="border-t border-[var(--color-border)] px-4 py-3">
                        <p className="mb-3 text-[10.5px] leading-4 text-[var(--color-subtle)]">Operations control what a node may do. Editable fields control which saved settings the model may change per request. Every write still needs the requester’s approval.</p>
                        <div className="space-y-3">
                          {capabilities.map((capability) => {
                            const grant = policy.nodes.find((node) => node.nodeId === capability.nodeId)
                            return (
                              <div key={capability.nodeId} className="rounded-lg bg-[var(--color-canvas)] p-3">
                                <p className="text-[11.5px] font-medium">{capability.label}</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {capability.operations.map((operation) => {
                                    const checked = grant?.allowedOperations.includes(operation.id) ?? false
                                    return (
                                      <button key={operation.id} type="button" onClick={() => toggleOperation(capability.nodeId, operation.id)} className={`rounded-full border px-2.5 py-1 text-[10.5px] transition-colors ${checked ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]' : 'border-[var(--color-border)] text-[var(--color-subtle)] hover:text-[var(--color-text)]'}`}>
                                        {operation.label}{operation.effect !== 'read' ? ' · approval' : ''}
                                      </button>
                                    )
                                  })}
                                </div>
                                {grant && capability.overridableFields.filter((field) => field !== capability.operationField).length > 0 && (
                                  <div className="mt-2.5 border-t border-[var(--color-border)] pt-2.5">
                                    <p className="mb-1.5 text-[10px] text-[var(--color-subtle)]">Fields the agent may set</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {capability.overridableFields.filter((field) => field !== capability.operationField).map((field) => {
                                        const checked = grant.allowedOverrideFields.includes(field)
                                        return <button key={field} type="button" onClick={() => toggleField(capability.nodeId, field)} className={`rounded-full border px-2.5 py-1 text-[10.5px] ${checked ? 'border-violet-500/60 bg-violet-500/10' : 'border-[var(--color-border)] text-[var(--color-subtle)]'}`}>{humanizeField(field)}</button>
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        <DialogFooter className="m-0 flex-row items-center justify-between rounded-none border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
          <p className="hidden text-[10.5px] text-[var(--color-subtle)] sm:block">Text only in this release · writes require Slack approval</p>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button disabled={!canDeploy} onClick={() => void deploy()}>
              {deploying && <LoaderCircle className="animate-spin" />} Deploy to Slack
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return <div className="flex items-center gap-2.5">{number && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-hover)] text-[10.5px] font-semibold text-[var(--color-muted)]">{number}</span>}<h2 className="text-[13px] font-semibold">{title}</h2></div>
}

function PermissionGroup({ icon, title, lines, empty, tone }: {
  icon: React.ReactNode
  title: string
  lines: string[]
  empty: string
  tone?: 'warning'
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${tone === 'warning' ? 'border-amber-500/25' : 'border-[var(--color-border)]'}`}>
      <div className={`flex items-center gap-2 text-[11.5px] font-medium ${tone === 'warning' ? 'text-amber-700 dark:text-amber-300' : ''}`}>{icon}{title}</div>
      {lines.length > 0 ? <ul className="mt-2 space-y-1.5 text-[11px] leading-4 text-[var(--color-muted)]">{lines.map((line) => <li key={line}>• {line}</li>)}</ul> : <p className="mt-2 text-[11px] text-[var(--color-subtle)]">{empty}</p>}
    </div>
  )
}
