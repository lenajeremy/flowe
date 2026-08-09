import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bot, CircleAlert, Hash, LoaderCircle, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { listAllAgentDeployments, type AgentDeploymentHealth, type AgentDeploymentRecord } from '@/lib/agentDeployments'
import { cn } from '@/lib/utils'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong'
}

function formattedDate(value?: string) {
  if (!value) return 'No requests yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const healthStyles: Record<AgentDeploymentHealth['status'], string> = {
  healthy: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  needs_attention: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  paused: 'border-[var(--color-border)] bg-[var(--color-hover)] text-[var(--color-muted)]',
  revoked: 'border-[var(--color-border)] bg-[var(--color-hover)] text-[var(--color-subtle)]',
}

function HealthBadge({ health }: { health: AgentDeploymentHealth }) {
  const label = health.status === 'needs_attention'
    ? 'Needs attention'
    : health.status[0].toUpperCase() + health.status.slice(1)
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10.5px] font-medium', healthStyles[health.status])}>
      <span className={cn('h-1.5 w-1.5 rounded-full', health.status === 'healthy' ? 'bg-emerald-500' : health.status === 'needs_attention' ? 'bg-amber-500' : 'bg-[var(--color-subtle)]')} />
      {label}
    </span>
  )
}

export function AgentsPage() {
  const [records, setRecords] = useState<AgentDeploymentRecord[] | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'current' | 'history'>('current')
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true)
    try {
      setRecords(await listAllAgentDeployments())
    } catch (error) {
      setRecords((current) => current ?? [])
      toast.error('Could not load deployed agents', { description: errorMessage(error) })
    } finally {
      if (!quiet) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Agents · Fernary'
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onFocus = () => void refresh(true)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const current = useMemo(() => (records ?? []).filter((record) => record.deployment.status !== 'revoked'), [records])
  const history = useMemo(() => (records ?? []).filter((record) => record.deployment.status === 'revoked'), [records])
  const active = current.filter((record) => record.deployment.status === 'active').length
  const attention = current.filter((record) => record.health.status === 'needs_attention').length
  const paused = current.filter((record) => record.deployment.status === 'paused').length

  const filtered = useMemo(() => {
    const source = view === 'current' ? current : history
    const query = search.trim().toLowerCase()
    const matched = !query ? source : source.filter((record) => [
      record.deployment.name, record.deployment.alias, record.workflow.name,
      record.host?.external_workspace_name, record.deployer.name, record.deployer.email,
      record.deployment.model_id,
      ...record.targets.flatMap((target) => [target.external_channel_name, target.external_channel_id]),
    ].some((value) => value?.toLowerCase().includes(query)))
    return [...matched].sort((left, right) => {
      if (left.health.status === 'needs_attention' && right.health.status !== 'needs_attention') return -1
      if (right.health.status === 'needs_attention' && left.health.status !== 'needs_attention') return 1
      return new Date(right.deployment.created_at).getTime() - new Date(left.deployment.created_at).getTime()
    })
  }, [current, history, search, view])

  return (
    <main className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Agents</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-[var(--color-muted)]">
            Every workflow agent deployed by your organization, where it can answer, and the authority it has.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Active" value={active} icon={<ShieldCheck />} detail="Accepting Slack mentions" />
        <SummaryCard label="Needs attention" value={attention} icon={<CircleAlert />} detail="Connection or delivery issue" warning={attention > 0} />
        <SummaryCard label="Paused" value={paused} icon={<Bot />} detail="Retained but unavailable" />
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          {(['current', 'history'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setView(item)} className={cn('rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors', view === item ? 'bg-[var(--color-hover2)] text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]')}>
              {item === 'current' ? 'Current' : 'History'} <span className="ml-1 text-[10px] text-[var(--color-subtle)]">{item === 'current' ? current.length : history.length}</span>
            </button>
          ))}
        </div>
        <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:w-72">
          <Search size={14} className="shrink-0 text-[var(--color-subtle)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search agents, workflows, channels…" className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[var(--color-subtle)]" />
        </label>
      </div>

      {records === null ? (
        <div className="flex min-h-72 items-center justify-center text-[var(--color-muted)]"><LoaderCircle className="animate-spin" size={21} /></div>
      ) : filtered.length === 0 ? (
        <EmptyAgents search={search} view={view} />
      ) : (
        <div className="mt-5 space-y-3">
          {filtered.map((record) => <AgentRow key={record.deployment.id} record={record} />)}
        </div>
      )}
    </main>
  )
}

function EmptyAgents({ search, view }: { search: string; view: 'current' | 'history' }) {
  return (
    <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-hover)] text-[var(--color-muted)]"><Bot size={20} /></span>
      <p className="mt-3 text-[13px] font-medium">{search ? 'No agents match that search' : view === 'history' ? 'No revoked agents' : 'No deployed agents yet'}</p>
      <p className="mt-1 max-w-md text-[11.5px] leading-relaxed text-[var(--color-muted)]">
        {view === 'current' ? 'Open a workflow’s chat and choose Deploy as agent to publish it to an allowed Slack channel.' : 'Revoked deployments stay here as an audit trail.'}
      </p>
      {view === 'current' && !search && <Link to="/workflows" className="mt-4 text-[12px] font-medium text-[var(--color-accent)] hover:underline">Choose a workflow</Link>}
    </div>
  )
}

function AgentRow({ record }: { record: AgentDeploymentRecord }) {
  return (
    <Link to={`/agents/${record.deployment.id}`} className="group block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-subtle)] hover:bg-[var(--color-hover)] sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,.9fr)_minmax(0,.9fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]"><Bot size={17} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="truncate text-[13.5px] font-semibold">{record.deployment.name}</p><HealthBadge health={record.health} /></div>
            <p className="mt-1 truncate text-[11px] text-[var(--color-muted)]">{record.workflow.name} · handle {record.deployment.alias} · v{record.deployment.version}</p>
            <p className="mt-1 truncate text-[10.5px] text-[var(--color-subtle)]">{record.health.message}</p>
          </div>
        </div>
        <div className="min-w-0 lg:border-l lg:border-[var(--color-border)] lg:pl-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-subtle)]">Slack destination</p>
          <p className="mt-1 truncate text-[12px] font-medium">{record.host?.external_workspace_name || 'Workspace unavailable'}</p>
          <p className="mt-1 flex items-center gap-1 truncate text-[10.5px] text-[var(--color-muted)]"><Hash size={11} /> {record.targets.length > 0 ? record.targets.map((target) => target.external_channel_name || target.external_channel_id).join(', ') : 'No channel'}</p>
        </div>
        <div className="min-w-0 lg:border-l lg:border-[var(--color-border)] lg:pl-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-subtle)]">Authority and activity</p>
          <p className="mt-1 truncate text-[12px] font-medium">{record.deployer.name || record.deployer.email || 'Former member'}</p>
          <p className="mt-1 truncate text-[10.5px] text-[var(--color-muted)]">Last request: {formattedDate(record.health.last_activity_at)}</p>
        </div>
        <span className="hidden h-8 w-8 items-center justify-center rounded-lg text-[var(--color-subtle)] transition-colors group-hover:bg-[var(--color-hover2)] group-hover:text-[var(--color-text)] lg:flex"><ArrowRight size={15} /></span>
      </div>
    </Link>
  )
}

function SummaryCard({ label, value, icon, detail, warning = false }: { label: string; value: number; icon: React.ReactNode; detail: string; warning?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between">
        <div><p className="text-[11px] font-medium text-[var(--color-muted)]">{label}</p><p className={cn('mt-1 text-[23px] font-semibold tracking-[-0.02em]', warning && 'text-amber-600 dark:text-amber-300')}>{value}</p></div>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-hover)] text-[var(--color-muted)] [&>svg]:h-4 [&>svg]:w-4', warning && 'bg-amber-500/10 text-amber-600 dark:text-amber-300')}>{icon}</span>
      </div>
      <p className="mt-2 text-[10.5px] text-[var(--color-subtle)]">{detail}</p>
    </div>
  )
}
