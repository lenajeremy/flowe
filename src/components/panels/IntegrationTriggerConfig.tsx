import { useEffect, useState } from 'react'
import { FormField } from '@/components/ui/FormField'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ResourcePicker } from '@/components/ui/ResourcePicker'
import { IntegrationConnect } from '@/components/ui/IntegrationConnect'
import {
  activeGitHubInstallations,
  githubMissingEventLabels,
  githubRepositoryInstallation,
  githubRepositoryIsInstalled,
  type GitHubSetupSnapshot,
} from '@/lib/githubSetup'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import { NODE_LABELS } from '@/lib/nodeColors'
import type { FlowNodeData, NodeType } from '@/types/workflow'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { toast } from 'sonner'

// Setting up "run this when something happens over there".
//
// Two things make this panel different from every other config block. First,
// saving is not a local edit — it persists a listener against the centrally
// installed GitHub App, so the panel distinguishes "configured on the canvas"
// from "actually listening on the server". Second, nothing here should be typed
// from memory: the account, the repository, the branch and the person are all
// things the provider can enumerate, so they are all lists.

interface FilterSpec {
  key: string
  label: string
  placeholder?: string
  resource_kind?: string
}

interface EventSpec {
  id: string
  label: string
  resource_kind?: string
  filters?: FilterSpec[]
}

interface ProviderEntry {
  provider: string
  delivery: string
  events: EventSpec[]
}

interface ServerTrigger {
  id: string
  node_id: string
  provider: string
  event: string
  resource_label: string
  enabled: boolean
  last_error?: string
  last_event_at?: string
}

// What to call the thing being picked, per provider. "Where" is a poor label
// when the answer is obviously a repository.
const RESOURCE_LABEL: Record<string, string> = {
  repo: 'Repository',
  channel: 'Channel',
  branch: 'Branch',
  user: 'Person',
  calendar: 'Calendar',
  folder: 'Folder',
}

// ResourcePicker accepts a fixed set of provider and kind strings; the registry
// is server-driven, so a new adapter can name a kind this build has never heard
// of. Those fall back to a text field rather than crashing the panel.
const PICKABLE_PROVIDERS = new Set(['github', 'gitlab', 'slack', 'notion', 'linear', 'gmail',
  'stripe', 'googlecalendar', 'googledrive', 'outlook', 'jira', 'confluence', 'bitbucket',
  'airtable', 'clickup', 'supabase', 'googlesearchconsole'])
const PICKABLE_KINDS = new Set(['database', 'page', 'team', 'project', 'repo', 'price', 'calendar',
  'folder', 'channel', 'user', 'label', 'space', 'board', 'tasklist', 'base', 'workspace',
  'property', 'branch'])
const canPick = (provider: string, kind?: string) =>
  !!kind && PICKABLE_PROVIDERS.has(provider) && PICKABLE_KINDS.has(kind)

export function IntegrationTriggerConfig({ data, nodeId, updateNodeData }: {
  data: FlowNodeData
  nodeId: string
  updateNodeData: (nodeId: string, partial: Partial<FlowNodeData>) => void
}) {
  const [catalog, setCatalog] = useState<ProviderEntry[]>([])
  const [existing, setExisting] = useState<ServerTrigger | null>(null)
  const [busy, setBusy] = useState(false)
  const [githubSetup, setGitHubSetup] = useState<GitHubSetupSnapshot>({
    phase: 'loading',
    status: null,
  })

  const { tabs, activeTabId } = useWorkflowStore(
    useShallow((s) => ({ tabs: s.tabs, activeTabId: s.activeTabId })),
  )
  const dbId = tabs.find((t) => t.id === activeTabId)?.dbId

  useEffect(() => {
    apiFetch(`${API}/api/trigger-catalog`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { providers: ProviderEntry[] }) => setCatalog(d.providers ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!dbId) return
    apiFetch(`${API}/api/workflows/${dbId}/triggers`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { triggers: ServerTrigger[] }) =>
        setExisting(d.triggers?.find((trigger) => trigger.node_id === nodeId) ?? null))
      .catch(() => setExisting(null))
  }, [dbId, nodeId])

  const provider = data.triggerProvider ?? ''
  const entry = catalog.find((p) => p.provider === provider)
  const event = data.triggerEvent ?? ''
  const spec = entry?.events.find((e) => e.id === event)
  const resourceID = data.triggerResourceId ?? ''
  const providerLabel = NODE_LABELS[provider as NodeType] ?? provider
  const githubInfrastructureReady = provider !== 'github' || (
    githubSetup.phase === 'ready' &&
    githubSetup.status?.connected === true &&
    githubSetup.status.app_configured === true &&
    githubSetup.status.installed === true &&
    githubSetup.status.webhook_configured === true &&
    githubSetup.status.webhook_events_configured === true &&
    githubSetup.status.token_kind === 'github_app' &&
    githubSetup.status.reconnect_required !== true &&
    activeGitHubInstallations(githubSetup.status).length > 0
  )
  const githubRepositoryCovered = provider !== 'github' || (
    githubInfrastructureReady &&
    githubSetup.status !== null &&
    githubRepositoryIsInstalled(githubSetup.status, resourceID)
  )
  const githubRepositoryInstallationStatus = provider === 'github' && githubSetup.status
    ? githubRepositoryInstallation(githubSetup.status, resourceID)
    : undefined
  const githubRepositoryNeedsPermissionApproval =
    githubRepositoryInstallationStatus?.permissions_configured === false

  function setFilter(key: string, val: string) {
    updateNodeData(nodeId, {
      triggerFilters: { ...(data.triggerFilters ?? {}), [key]: val },
    })
  }

  async function register() {
    if (!dbId) {
      toast.error('Save the workflow first')
      return
    }
    if (provider === 'github' && !githubRepositoryCovered) {
      if (githubSetup.phase === 'loading') {
        toast.info('Wait while Fernary checks the GitHub App installation')
      } else if (githubSetup.phase === 'failed') {
        toast.error('Fernary could not verify the GitHub App installation')
      } else if (!githubSetup.status?.connected || githubSetup.status.token_kind !== 'github_app' || githubSetup.status.reconnect_required) {
        toast.error('Install and authorize the Fernary GitHub App first')
      } else if (!githubSetup.status.installed) {
        toast.error('Install Fernary on the GitHub account first')
      } else if (githubSetup.status.webhook_events_error) {
        toast.error('Couldn’t verify GitHub App event subscriptions', {
          description: githubSetup.status.webhook_events_error,
        })
      } else if (!githubSetup.status.webhook_configured || !githubSetup.status.webhook_events_configured) {
        const missing = githubMissingEventLabels(githubSetup.status)
        const problems = [
          !githubSetup.status.webhook_configured
            ? 'The Fernary server webhook secret is missing.'
            : '',
          !githubSetup.status.webhook_events_configured
            ? `The GitHub App is missing Permissions & events subscriptions${missing.length > 0 ? `: ${missing.join(', ')}` : ''}.`
            : '',
        ].filter(Boolean)
        toast.error('GitHub App webhook setup is incomplete', {
          description: problems.join(' '),
        })
      } else if (githubRepositoryNeedsPermissionApproval && githubRepositoryInstallationStatus) {
        toast.error('Approve the GitHub App’s updated permissions', {
          description: githubRepositoryInstallationStatus.permissions_missing.length > 0
            ? githubRepositoryInstallationStatus.permissions_missing.join(', ')
            : `Approval is required for ${githubRepositoryInstallationStatus.account_login || 'this installation'}.`,
        })
      } else {
        toast.error('That repository is not included in the GitHub App installation')
      }
      return
    }
    setBusy(true)
    try {
      const res = await apiFetch(`${API}/api/workflows/${dbId}/triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: nodeId,
          provider,
          event,
          resource_id: resourceID,
          resource_label: data.triggerResourceLabel || resourceID,
          filters: data.triggerFilters ?? {},
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        // The server separates "you have not connected this app" from "the
        // provider refused"; passing it through verbatim is what tells the user
        // which of the two to go and fix.
        toast.error(body.error ?? 'Could not create the trigger')
        return
      }
      setExisting(body as ServerTrigger)
      toast.success('Listening for events')
    } catch {
      toast.error('Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!existing) return
    setBusy(true)
    try {
      await apiFetch(`${API}/api/triggers/${existing.id}`, { method: 'DELETE' })
      setExisting(null)
      toast.success('Trigger removed')
    } catch {
      toast.error('Could not remove the trigger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FormField label="App" htmlFor={`cfg-${nodeId}-provider`}>
        <Select
          id={`cfg-${nodeId}-provider`}
          value={provider}
          onChange={(val) =>
            // Everything below the app depends on it. Keeping a stale event id
            // would fail validation on save with "unknown trigger" instead of an
            // obviously empty field.
            updateNodeData(nodeId, {
              triggerProvider: val, triggerEvent: '',
              triggerResourceId: '', triggerResourceLabel: '', triggerFilters: {},
            })
          }
          options={[
            { value: '', label: 'Choose an app…' },
            ...catalog.map((p) => ({
              value: p.provider,
              label: NODE_LABELS[p.provider as NodeType] ?? p.provider,
            })),
          ]}
        />
      </FormField>

      {/* The connect card, in the same place every integration node puts it.
          Without it, a user whose account is not linked would pick an event,
          press the button and only then be told to go somewhere else. */}
      {provider && PICKABLE_PROVIDERS.has(provider) && (
        <IntegrationConnect
          provider={provider as Parameters<typeof IntegrationConnect>[0]['provider']}
          label={providerLabel}
          hasManualToken={false}
          manualField={null}
          onGitHubSetupChange={provider === 'github' ? setGitHubSetup : undefined}
        />
      )}

      {entry && (
        <FormField label="When" htmlFor={`cfg-${nodeId}-event`}>
          <Select
            id={`cfg-${nodeId}-event`}
            value={event}
            onChange={(val) => updateNodeData(nodeId, { triggerEvent: val, triggerFilters: {} })}
            options={[
              { value: '', label: 'Choose an event…' },
              ...entry.events.map((e) => ({ value: e.id, label: e.label })),
            ]}
          />
        </FormField>
      )}

      {spec?.resource_kind && (
        <FormField
          label={RESOURCE_LABEL[spec.resource_kind] ?? 'Where'}
          htmlFor={`cfg-${nodeId}-resource`}
        >
          {canPick(provider, spec.resource_kind) ? (
            <ResourcePicker
              provider={provider as Parameters<typeof ResourcePicker>[0]['provider']}
              kind={spec.resource_kind as Parameters<typeof ResourcePicker>[0]['kind']}
              id={`cfg-${nodeId}-resource`}
              value={resourceID}
              allowManual={!(provider === 'github' && spec.resource_kind === 'repo')}
              onChange={(val) =>
                // Changing the repository invalidates any branch or person
                // chosen beneath it — they came from the old one's lists.
                updateNodeData(nodeId, {
                  triggerResourceId: val, triggerResourceLabel: val, triggerFilters: {},
                })
              }
            />
          ) : (
            <Input
              id={`cfg-${nodeId}-resource`}
              value={resourceID}
              onChange={(e) => updateNodeData(nodeId, { triggerResourceId: e.target.value })}
            />
          )}
        </FormField>
      )}

      {provider === 'github' && resourceID && githubSetup.phase === 'ready' &&
        githubInfrastructureReady && !githubRepositoryCovered && (
          <p className="-mt-2 text-[10px] leading-relaxed text-[var(--color-fail)]">
            {githubRepositoryNeedsPermissionApproval && githubRepositoryInstallationStatus
              ? `GitHub requires approval for the installation’s updated permissions${githubRepositoryInstallationStatus.permissions_missing.length > 0 ? `: ${githubRepositoryInstallationStatus.permissions_missing.join(', ')}` : ''}. Review them in GitHub, then refresh above.`
              : 'This repository is not included in the Fernary GitHub App installation. Update the installation’s repository access, then refresh it above.'}
          </p>
        )}

      {/* Filters narrow the event at the source. Doing it here rather than with
          a branch node is the difference between a busy repository costing
          nothing and costing a workflow run per commit. */}
      {spec?.filters?.map((f) => (
        <FormField key={f.key} label={f.label} htmlFor={`cfg-${nodeId}-f-${f.key}`}>
          {canPick(provider, f.resource_kind) ? (
            <ResourcePicker
              provider={provider as Parameters<typeof ResourcePicker>[0]['provider']}
              kind={f.resource_kind as Parameters<typeof ResourcePicker>[0]['kind']}
              // Scoped to the chosen repository — its branches, not every branch
              // on the account. Empty string means "not chosen yet", which the
              // picker shows as "Pick the repository first".
              parent={resourceID}
              id={`cfg-${nodeId}-f-${f.key}`}
              value={data.triggerFilters?.[f.key] ?? ''}
              onChange={(val) => setFilter(f.key, val)}
            />
          ) : (
            <Input
              id={`cfg-${nodeId}-f-${f.key}`}
              value={data.triggerFilters?.[f.key] ?? ''}
              placeholder={f.placeholder ? `Any — e.g. ${f.placeholder}` : 'Any'}
              onChange={(e) => setFilter(f.key, e.target.value)}
            />
          )}
        </FormField>
      ))}

      {existing ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3">
          <p className="text-[11px] text-[var(--color-ok)]">Registered with {providerLabel}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-muted)]">
            Events only start runs once the workflow is published.
          </p>
          {existing.last_error && (
            <p className="mt-1 text-[10px] leading-relaxed text-[#f87171]">{existing.last_error}</p>
          )}
          <button
            onClick={() => void remove()}
            disabled={busy}
            className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-1 text-[10px] text-[var(--color-text)] transition-colors hover:border-[var(--color-border2)] disabled:opacity-40"
          >
            {busy ? 'Removing…' : 'Remove trigger'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => void register()}
          disabled={busy || !provider || !event || (!!spec?.resource_kind && !resourceID) || !dbId || !githubRepositoryCovered}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-[11px] text-[var(--color-text)] transition-colors hover:border-[var(--color-border2)] disabled:opacity-40"
        >
          {busy ? 'Setting up…' : dbId ? 'Start listening' : 'Save the workflow first'}
        </button>
      )}
    </div>
  )
}
