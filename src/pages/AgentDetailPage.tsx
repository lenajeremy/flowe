import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Bot, Check, CircleAlert, ExternalLink, Hash, LoaderCircle,
  Pause, Play, Save, ShieldCheck, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { AgentPermissionEditor } from '@/components/agent/AgentPermissionEditor'
import { IntegrationLogo } from '@/components/IntegrationLogo'
import { Button } from '@/components/ui/button'
import {
  getAgentDeployment,
  joinAgentDeploymentSlackChannel,
  listAgentHostChannels,
  listAgentHosts,
  revokeAgentDeployment,
  updateAgentDeployment,
  cloneAgentCapabilityPolicy,
  type AgentCapabilityPolicy,
  type AgentDeploymentRecord,
  type AgentHostChannel,
  type AgentHostInstallation,
} from '@/lib/agentDeployments'
import { cn } from '@/lib/utils'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong'
}

function formattedDate(value?: string) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function AgentDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState<AgentDeploymentRecord | null>(null)
  const [policy, setPolicy] = useState<AgentCapabilityPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'permissions' | 'status' | 'revoke' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const next = await getAgentDeployment(id)
      setRecord(next)
      setPolicy(cloneAgentCapabilityPolicy(next.deployment.capability_policy))
      document.title = `${next.deployment.name} · Agents · Fernary`
    } catch (nextError) {
      setError(errorMessage(nextError))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  const dirty = useMemo(() => Boolean(record && policy && JSON.stringify(policy) !== JSON.stringify(record.deployment.capability_policy)), [policy, record])
  const canEdit = Boolean(record?.can_manage && record.deployment.status !== 'revoked')

  async function savePermissions() {
    if (!record || !policy || !dirty || !canEdit || policy.integrations.length === 0) return
    setBusy('permissions')
    try {
      const updated = await updateAgentDeployment(record.deployment.id, {
        policy,
        expectedUpdatedAt: record.deployment.updated_at,
      })
      setRecord(updated)
      setPolicy(cloneAgentCapabilityPolicy(updated.deployment.capability_policy))
      toast.success('Agent permissions updated', { description: 'Pending approvals from the previous policy were expired.' })
    } catch (nextError) {
      toast.error('Could not update permissions', { description: errorMessage(nextError) })
    } finally {
      setBusy(null)
    }
  }

  async function changeStatus() {
    if (!record || !canEdit) return
    const status = record.deployment.status === 'active' ? 'paused' : 'active'
    setBusy('status')
    try {
      const updated = await updateAgentDeployment(record.deployment.id, { status })
      setRecord(updated)
      setPolicy(cloneAgentCapabilityPolicy(updated.deployment.capability_policy))
      toast.success(status === 'active' ? 'Agent resumed' : 'Agent paused')
    } catch (nextError) {
      toast.error(`Could not ${status === 'active' ? 'resume' : 'pause'} agent`, { description: errorMessage(nextError) })
    } finally {
      setBusy(null)
    }
  }

  async function revoke() {
    if (!record || !canEdit || !window.confirm(`Revoke ${record.deployment.name}? This is permanent and Slack mentions will stop immediately.`)) return
    setBusy('revoke')
    try {
      await revokeAgentDeployment(record.deployment.id)
      toast.success('Agent revoked')
      navigate('/agents')
    } catch (nextError) {
      toast.error('Could not revoke agent', { description: errorMessage(nextError) })
      setBusy(null)
    }
  }

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center text-[var(--color-muted)]"><LoaderCircle className="animate-spin" size={22} /></div>
  if (!record || error) return <AgentLoadError message={error || 'Agent not found'} onRetry={() => void load()} />

  const capabilities = record.capabilities ?? []
  return (
    <main className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-10">
      <Link to="/agents" className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]"><ArrowLeft size={13} /> All agents</Link>
      <AgentHeader record={record} busy={busy} canEdit={canEdit} onStatus={() => void changeStatus()} onRevoke={() => void revoke()} />

      {record.health.status === 'needs_attention' && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-amber-800 dark:text-amber-200">
          <CircleAlert size={16} className="mt-0.5 shrink-0" />
          <div><p className="text-[12px] font-medium">{record.health.message}</p>{record.health.last_error && <p className="mt-1 break-words text-[10.5px] opacity-80">{record.health.last_error}</p>}</div>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,.75fr)]">
        <div className="space-y-5">
          <AgentDestinationEditor record={record} onUpdated={(updated) => { setRecord(updated); setPolicy(cloneAgentCapabilityPolicy(updated.deployment.capability_policy)) }} />
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-[var(--color-accent)]" /><h2 className="text-[14px] font-semibold">Permissions</h2></div>
              <p className="mt-1.5 max-w-xl text-[11.5px] leading-relaxed text-[var(--color-muted)]">Operations define what the agent may call. Editable fields are the only values it may change; every other value stays pinned to the deployed workflow. Writes always require approval in Slack.</p>
            </div>
            {canEdit && <Button onClick={() => void savePermissions()} disabled={!dirty || !policy?.integrations.length || busy !== null}><Save /> {busy === 'permissions' ? 'Saving…' : 'Save permissions'}</Button>}
          </div>
          {!record.can_manage && <div className="border-b border-[var(--color-border)] bg-[var(--color-hover)] px-5 py-3 text-[11px] text-[var(--color-muted)]">View only. The deployment owner or an organization admin can change these permissions.</div>}
          {record.deployment.status === 'revoked' && <div className="border-b border-[var(--color-border)] bg-[var(--color-hover)] px-5 py-3 text-[11px] text-[var(--color-muted)]">Revoked deployments are immutable audit history.</div>}
          <div className="p-5">
            {capabilities.length === 0 ? <p className="py-8 text-center text-[12px] text-[var(--color-muted)]">The stored capability catalog is unavailable.</p> : policy && <AgentPermissionEditor capabilities={capabilities} policy={policy} onChange={setPolicy} readOnly={!canEdit} />}
          </div>
        </section>
        </div>

        <AgentFacts record={record} />
      </div>
    </main>
  )
}

function AgentLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <CircleAlert size={24} className="text-[var(--color-fail)]" />
      <p className="mt-3 text-[13px] font-medium">Could not load this agent</p>
      <p className="mt-1 text-[11.5px] text-[var(--color-muted)]">{message}</p>
      <div className="mt-4 flex gap-2"><Button variant="outline" onClick={onRetry}>Try again</Button><Button variant="ghost" onClick={() => window.history.back()}>Go back</Button></div>
    </div>
  )
}

function AgentHeader({ record, busy, canEdit, onStatus, onRevoke }: {
  record: AgentDeploymentRecord
  busy: string | null
  canEdit: boolean
  onStatus: () => void
  onRevoke: () => void
}) {
  const attention = record.health.status === 'needs_attention'
  return (
    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]"><Bot size={20} /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-[24px] font-semibold tracking-[-0.02em]">{record.deployment.name}</h1>
            <span className={cn('rounded-full border px-2 py-1 text-[10.5px] font-medium', attention ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300' : record.deployment.status === 'active' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-[var(--color-border)] bg-[var(--color-hover)] text-[var(--color-muted)]')}>
              {attention ? 'Needs attention' : record.deployment.status}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] text-[var(--color-muted)]">{record.workflow.name} · handle {record.deployment.alias} · deployment v{record.deployment.version}</p>
        </div>
      </div>
      {canEdit && (
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={onStatus} disabled={busy !== null}>
            {busy === 'status' ? <LoaderCircle className="animate-spin" /> : record.deployment.status === 'active' ? <Pause /> : <Play />}
            {record.deployment.status === 'active' ? 'Pause' : 'Resume'}
          </Button>
          <Button variant="destructive" onClick={onRevoke} disabled={busy !== null}>{busy === 'revoke' ? <LoaderCircle className="animate-spin" /> : <Trash2 />} Revoke</Button>
        </div>
      )}
    </div>
  )
}

const REQUIRED_SLACK_SCOPES = [
  'app_mentions:read', 'chat:write', 'chat:write.customize',
  'channels:read', 'channels:history', 'groups:read', 'groups:history',
]

function agentHostReady(host: AgentHostInstallation) {
  const scopes = host.scopes.split(/[ ,]+/)
  return host.status === 'active' && REQUIRED_SLACK_SCOPES.every((scope) => scopes.includes(scope))
}

function AgentDestinationEditor({ record, onUpdated }: { record: AgentDeploymentRecord; onUpdated: (record: AgentDeploymentRecord) => void }) {
  const originalHostID = record.host?.id || ''
  const originalChannels = record.targets.filter((target) => target.enabled).map((target) => target.external_channel_id).sort()
  const [hosts, setHosts] = useState<AgentHostInstallation[]>([])
  const [hostID, setHostID] = useState(originalHostID)
  const [channels, setChannels] = useState<AgentHostChannel[]>([])
  const [selected, setSelected] = useState<string[]>(originalChannels)
  const [loadingHosts, setLoadingHosts] = useState(true)
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [joiningChannel, setJoiningChannel] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    setHostID(originalHostID)
    setSelected(originalChannels)
    setLoadingHosts(true)
    listAgentHosts().then((next) => {
      if (!active) return
      setHosts(next)
      if (!next.some((host) => host.id === originalHostID && agentHostReady(host))) {
        const fallback = next.find(agentHostReady)
        setHostID(fallback?.id || '')
        setSelected([])
      }
    }).catch((nextError) => {
      if (active) toast.error('Could not load Slack workspaces', { description: errorMessage(nextError) })
    }).finally(() => {
      if (active) setLoadingHosts(false)
    })
    return () => { active = false }
    // The timestamp changes after a successful destination update and resets
    // this editor to the authoritative response.
  }, [record.deployment.id, record.deployment.updated_at]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedHost = hosts.find((host) => host.id === hostID)
  useEffect(() => {
    if (!selectedHost || !agentHostReady(selectedHost)) {
      setChannels([])
      setLoadingChannels(false)
      return
    }
    let active = true
    setLoadingChannels(true)
    setChannels([])
    listAgentHostChannels(selectedHost.id).then((next) => {
      if (active) setChannels([...next].sort((left, right) => left.name.localeCompare(right.name)))
    }).catch((nextError) => {
      if (active) toast.error('Could not load Slack channels', { description: errorMessage(nextError) })
    }).finally(() => {
      if (active) setLoadingChannels(false)
    })
    return () => { active = false }
  }, [selectedHost])

  const selectedSorted = [...selected].sort()
  const dirty = hostID !== originalHostID || JSON.stringify(selectedSorted) !== JSON.stringify(originalChannels)
  const validSelection = selected.length > 0 && selected.length <= 20 && selected.every((channelID) => channels.some((channel) => channel.id === channelID && channel.is_member))
  const editable = record.can_manage && record.deployment.status !== 'revoked'
  const canSave = editable && dirty && Boolean(selectedHost && agentHostReady(selectedHost)) && validSelection && !loadingChannels && !saving

  function selectHost(nextHostID: string) {
    setHostID(nextHostID)
    setSelected(nextHostID === originalHostID ? originalChannels : [])
  }

  function toggleChannel(channel: AgentHostChannel) {
    if (!editable || !channel.is_member) return
    setSelected((current) => {
      if (current.includes(channel.id)) return current.filter((item) => item !== channel.id)
      if (current.length >= 20) {
        toast.error('A deployment can allow at most 20 channels')
        return current
      }
      return [...current, channel.id]
    })
  }

  async function addPublicChannel(channel: AgentHostChannel) {
    if (!editable || !selectedHost || channel.is_private || joiningChannel) return
    if (!selected.includes(channel.id) && selected.length >= 20) {
      toast.error('A deployment can allow at most 20 channels')
      return
    }
    setJoiningChannel(channel.id)
    try {
      const joined = await joinAgentDeploymentSlackChannel(record.deployment.id, selectedHost.id, channel.id)
      setChannels((current) => current.map((item) => item.id === joined.id ? { ...item, ...joined, is_member: true } : item))
      setSelected((current) => current.includes(joined.id) ? current : [...current, joined.id])
      toast.success(`Fernary joined #${joined.name || channel.name}`)
    } catch (nextError) {
      toast.error('Could not add Fernary to the channel', { description: errorMessage(nextError) })
    } finally {
      setJoiningChannel(null)
    }
  }

  async function save() {
    if (!canSave || !selectedHost) return
    const destinationChannels = channels.filter((channel) => selected.includes(channel.id) && channel.is_member).map((channel) => ({ id: channel.id, name: channel.name }))
    setSaving(true)
    try {
      const updated = await updateAgentDeployment(record.deployment.id, {
        hostInstallationId: selectedHost.id,
        channels: destinationChannels,
        expectedUpdatedAt: record.deployment.updated_at,
      })
      onUpdated(updated)
      toast.success('Slack destination updated', { description: 'Pending approvals from the previous destination were expired.' })
    } catch (nextError) {
      toast.error('Could not update Slack destination', { description: errorMessage(nextError) })
    } finally {
      setSaving(false)
    }
  }

  const readyHosts = hosts.filter(agentHostReady)
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><IntegrationLogo type="slack" size={17} /><h2 className="text-[14px] font-semibold">Slack destination</h2></div>
          <p className="mt-1.5 max-w-xl text-[11.5px] leading-relaxed text-[var(--color-muted)]">Only mentions in these channels can reach this agent. Changing the destination is atomic and invalidates approval buttons left in the old destination.</p>
        </div>
        {editable && <Button onClick={() => void save()} disabled={!canSave}><Save /> {saving ? 'Saving…' : 'Save destination'}</Button>}
      </div>
      <div className="p-5">
        {!record.can_manage && <p className="mb-4 rounded-lg bg-[var(--color-hover)] px-3 py-2.5 text-[10.5px] text-[var(--color-muted)]">View only. The deployment owner or an organization admin can change this destination.</p>}
        {loadingHosts ? <div className="flex h-24 items-center justify-center text-[var(--color-muted)]"><LoaderCircle className="animate-spin" size={18} /></div> : readyHosts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-center"><p className="text-[11.5px] text-[var(--color-muted)]">No Slack workspace is ready for hosted agents.</p><Link to={`/workflows/${record.workflow.id}/chat`} className="mt-2 inline-block text-[11px] font-medium text-[var(--color-accent)] hover:underline">Open workflow chat to connect Slack</Link></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[minmax(180px,.7fr)_minmax(0,1.3fr)]">
            <label className="block"><span className="text-[10.5px] font-medium text-[var(--color-muted)]">Workspace</span><select value={hostID} disabled={!editable} onChange={(event) => selectHost(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-[11.5px] outline-none focus:border-[var(--color-accent)] disabled:opacity-60">{readyHosts.map((host) => <option key={host.id} value={host.id}>{host.external_workspace_name || host.external_workspace_id}</option>)}</select></label>
            <div>
              <div className="flex items-center justify-between"><span className="text-[10.5px] font-medium text-[var(--color-muted)]">Allowed channels</span><span className="text-[9.5px] text-[var(--color-subtle)]">{selected.length}/20</span></div>
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-1.5">
                {loadingChannels ? (
                  <div className="flex h-20 items-center justify-center"><LoaderCircle className="animate-spin text-[var(--color-muted)]" size={17} /></div>
                ) : channels.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[10.5px] text-[var(--color-muted)]">No available channels.</p>
                ) : channels.map((channel) => (
                  <DestinationChannelRow
                    key={channel.id}
                    channel={channel}
                    workspaceID={selectedHost?.external_workspace_id || ''}
                    selected={selected.includes(channel.id)}
                    editable={editable}
                    canAutoJoin={Boolean(selectedHost?.scopes.split(/[ ,]+/).includes('channels:join'))}
                    joining={joiningChannel === channel.id}
                    onToggle={() => toggleChannel(channel)}
                    onJoin={() => void addPublicChannel(channel)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function DestinationChannelRow({ channel, workspaceID, selected, editable, canAutoJoin, joining, onToggle, onJoin }: {
  channel: AgentHostChannel
  workspaceID: string
  selected: boolean
  editable: boolean
  canAutoJoin: boolean
  joining: boolean
  onToggle: () => void
  onJoin: () => void
}) {
  const slackURL = `https://app.slack.com/client/${encodeURIComponent(workspaceID)}/${encodeURIComponent(channel.id)}`
  return (
    <div className="rounded-lg hover:bg-[var(--color-hover)]">
      <div className="flex items-center gap-1.5 pr-1.5">
        <button
          type="button"
          disabled={!editable || !channel.is_member}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left disabled:cursor-default"
        >
          <CheckBox checked={selected} />
          <Hash size={11} className="shrink-0 text-[var(--color-subtle)]" />
          <span className={cn('min-w-0 flex-1 truncate text-[11px]', !channel.is_member && 'text-[var(--color-muted)]')}>{channel.name}</span>
        </button>
        {!channel.is_member && editable && canAutoJoin && !channel.is_private ? (
          <Button type="button" variant="outline" size="xs" disabled={joining} onClick={onJoin}>
            {joining ? <LoaderCircle className="animate-spin" /> : 'Add Fernary'}
          </Button>
        ) : !channel.is_member && editable ? (
          <a href={slackURL} target="_blank" rel="noreferrer" className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]">
            Open in Slack <ExternalLink size={9} />
          </a>
        ) : null}
      </div>
      {!channel.is_member && editable && (!canAutoJoin || channel.is_private) && (
        <p className="px-9 pb-2 text-[9px] text-[var(--color-subtle)]">In Slack, run <span className="font-medium text-[var(--color-muted)]">/invite</span> and select the Fernary app.</p>
      )}
    </div>
  )
}

function CheckBox({ checked }: { checked: boolean }) {
  return <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', checked ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--primary-foreground)]' : 'border-[var(--color-border)]')}>{checked && <Check size={11} strokeWidth={3} />}</span>
}

function AgentFacts({ record }: { record: AgentDeploymentRecord }) {
  return (
    <aside className="space-y-4">
      <FactCard title="Slack destination">
        <div className="flex items-center gap-2.5"><IntegrationLogo type="slack" size={22} /><div className="min-w-0"><p className="truncate text-[12px] font-medium">{record.host?.external_workspace_name || 'Workspace unavailable'}</p><p className="mt-0.5 text-[10px] text-[var(--color-subtle)]">{record.host?.status || 'missing connection'}</p></div></div>
        <div className="mt-3 space-y-1.5">{record.targets.length > 0 ? record.targets.map((target) => <div key={target.id} className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]"><Hash size={11} /> {target.external_channel_name || target.external_channel_id}{!target.enabled && <span className="ml-auto text-[9px] text-[var(--color-subtle)]">disabled</span>}</div>) : <p className="text-[11px] text-[var(--color-muted)]">No channel recorded</p>}</div>
      </FactCard>

      <FactCard title="Source and runtime">
        <Fact label="Workflow" value={<Link to={`/workflows/${record.workflow.id}`} className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline">{record.workflow.name}<ExternalLink size={10} /></Link>} />
        <Fact label="Snapshot" value={`v${record.deployment.version} · ${record.deployment.snapshot_hash.slice(0, 8)}`} />
        <Fact label="Model" value={record.deployment.model_id || 'Organization default'} />
        <Fact label="Deployed" value={formattedDate(record.deployment.created_at)} />
        <Fact label="Source saved" value={formattedDate(record.deployment.source_updated_at)} />
      </FactCard>

      <FactCard title="Delegated authority">
        <div className="flex items-center gap-2.5">
          {record.deployer.avatar_url ? <img src={record.deployer.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-hover)] text-[var(--color-muted)]"><Bot size={14} /></span>}
          <div className="min-w-0"><p className="truncate text-[11.5px] font-medium">{record.deployer.name || 'Former member'}</p><p className="truncate text-[10px] text-[var(--color-subtle)]">{record.deployer.email || record.deployer.id}</p></div>
        </div>
        <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--color-muted)]">Tools use this person’s Fernary connections. Slack requesters never lend their own integration identity.</p>
      </FactCard>

      <FactCard title="Recent activity">
        <Fact label="Last request" value={formattedDate(record.health.last_activity_at)} />
        <Fact label="Delivery" value={record.health.last_delivery_status || 'No deliveries'} />
        <Fact label="Health" value={record.health.message} />
        {record.health.last_error && <div className="mt-3 rounded-lg bg-[var(--color-hover)] p-2.5 text-[10px] leading-relaxed text-[var(--color-muted)]">{record.health.last_error}</div>}
      </FactCard>

      <FactCard title="Plain-language access">
        <ReviewGroup title="Can read" items={record.review.canRead} empty="No read operations" />
        <ReviewGroup title="Writes with approval" items={record.review.writesRequiringApproval} empty="No write operations" />
        <ReviewGroup title="Pinned settings" items={record.review.fixedSettings} empty="No exposed nodes" />
      </FactCard>
    </aside>
  )
}

function FactCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--color-subtle)]">{title}</h2>{children}</section>
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] py-2.5 first:pt-0 last:border-0 last:pb-0"><span className="shrink-0 text-[10.5px] text-[var(--color-subtle)]">{label}</span><span className="min-w-0 break-words text-right text-[10.5px] font-medium">{value}</span></div>
}

function ReviewGroup({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="mb-3 last:mb-0"><p className="text-[10px] font-medium text-[var(--color-muted)]">{title}</p><div className="mt-1.5 space-y-1">{items.length > 0 ? items.map((item) => <p key={item} className="flex gap-1.5 text-[10px] leading-relaxed text-[var(--color-subtle)]"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--color-subtle)]" />{item}</p>) : <p className="text-[10px] text-[var(--color-subtle)]">{empty}</p>}</div></div>
  )
}
