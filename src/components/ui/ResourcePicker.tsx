import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  fetchResources,
  INTEGRATION_CHANGED_EVENT,
  ResourceFetchError,
  type IntegrationResource,
} from '@/lib/integrationResources'

/**
 * Picker for provider resources (Notion databases/pages, Linear teams).
 * The select is always the primary UI — even while loading, when empty, or
 * after a failed fetch (which raises a toast). The manual ID input only
 * appears via the explicit toggle, or when the current value is a template
 * token / unknown ID that the dropdown can't represent.
 */
export function ResourcePicker({
  provider,
  kind,
  parent,
  id,
  value,
  onChange,
  placeholder,
  allowManual = true,
}: {
  provider: 'sentry' | 'notion' | 'linear' | 'github' | 'gitlab' | 'monday' | 'asana' | 'gmail' | 'stripe' | 'googlecalendar' | 'googledrive' | 'outlook' | 'slack' | 'jira' | 'confluence' | 'bitbucket' | 'googlemeet' | 'googleslides' | 'googleforms' | 'googletasks' | 'googlechat' | 'googlekeep' | 'airtable' | 'clickup' | 'supabase' | 'googlesearchconsole'
  kind: 'database' | 'page' | 'team' | 'project' | 'repo' | 'price' | 'calendar' | 'folder' | 'channel' | 'user' | 'label' | 'space' | 'board' | 'tasklist' | 'base' | 'workspace' | 'property' | 'branch' | 'group' | 'column' | 'section' | 'task'
  /**
   * Scopes the list to what lives inside another resource — a repository's
   * branches. Undefined keeps the account-wide behaviour every other caller
   * relies on; set-but-empty means the parent has not been chosen yet, so the
   * picker waits instead of fetching a list it knows will be wrong.
   */
  parent?: string
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Disable for security-scoped lists where a free-form ID would imply access the app does not have. */
  allowManual?: boolean
}) {
  const [resources, setResources] = useState<IntegrationResource[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'disconnected' | 'failed'>('loading')
  const [manual, setManual] = useState(false)

  const awaitingParent = parent === ''

  useEffect(() => {
    let alive = true
    // Nothing to fetch until the parent is chosen. Derived below rather than
    // written to state here, so this effect never triggers a cascading render.
    if (awaitingParent) return
    function load() {
      fetchResources(provider, parent || undefined)
        .then((all) => {
          if (!alive) return
          setResources(all.filter((r) => r.type === kind))
          setState('ready')
        })
        .catch((err: unknown) => {
          if (!alive) return
          setResources([])
          if (err instanceof ResourceFetchError && err.status === 404) {
            // Not connected — the connect card right above explains this state.
            setState('disconnected')
            return
          }
          setState('failed')
          const message = err instanceof Error ? err.message : 'Unknown error'
          toast.error(`Couldn't load your ${provider} ${kind}s`, {
            id: `resources-${provider}`,
            description: message,
            action: { label: 'Retry', onClick: () => load() },
          })
        })
    }
    load()
    // Refetch when the user connects/disconnects while this panel is open
    function onChanged(e: Event) {
      const detail = (e as CustomEvent<string | undefined>).detail
      if (!detail || detail === provider) load()
    }
    window.addEventListener(INTEGRATION_CHANGED_EVENT, onChanged)
    return () => {
      alive = false
      window.removeEventListener(INTEGRATION_CHANGED_EVENT, onChanged)
    }
  }, [provider, kind, parent, awaitingParent])

  // While the parent is unchosen the last list is stale (it belongs to the
  // previous repository), so show nothing rather than the wrong thing.
  const visible = awaitingParent ? [] : resources
  const phase = awaitingParent ? 'ready' : state

  // A value that isn't a known resource (template token, pasted ID) needs the input.
  const valueIsForeign = value !== '' && !visible.some((r) => r.id === value)
  const showInput = allowManual && (manual || (valueIsForeign && phase === 'ready' && !awaitingParent))

  const placeholderLabel =
    awaitingParent ? 'Pick the parent resource first' :
    phase === 'loading' ? 'Loading…' :
    phase === 'failed' ? `Couldn't load ${kind}s — retry or enter an ID` :
    phase === 'disconnected' ? `Connect ${provider} to pick a ${kind}` :
    visible.length === 0 ? `No ${kind}s shared with your connection` :
    `Select a ${kind}…`

  return (
    <div className="flex flex-col gap-1">
      {showInput ? (
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-auto rounded-[7px] bg-[var(--color-surface2)] px-2.5 py-1.5 font-mono text-xs"
          placeholder={placeholder}
        />
      ) : (
        <Select
          id={id}
          value={value}
          onChange={onChange}
          options={[
            { value: '', label: placeholderLabel },
            ...visible.map((r) => ({ value: r.id, label: r.name })),
          ]}
        />
      )}
      {allowManual && (
        <button
          type="button"
          onClick={() => {
            if (showInput) { setManual(false); if (valueIsForeign) onChange('') }
            else setManual(true)
          }}
          className="self-start text-[10px] text-[var(--color-subtle)] transition-colors hover:text-[var(--color-text)]"
        >
          {showInput ? `− Pick from your ${kind === 'team' ? 'teams' : kind + 's'}` : '+ Enter ID manually'}
        </button>
      )}
      {phase === 'ready' && !awaitingParent && visible.length === 0 && (
        <p className="text-[10px] leading-relaxed text-[var(--color-subtle)]">
          {provider === 'notion'
            ? `Your Notion connection has no ${kind}s shared with it — reconnect and pick ${kind === 'database' ? 'a database' : 'pages'} in the Notion popup.`
            : provider === 'github'
              ? 'No repositories are available to this GitHub App installation. Add repository access above, then refresh.'
            : provider === 'gitlab'
              ? `No ${kind}s are available in this GitLab project.`
            : `No ${kind}s found on your ${provider} connection.`}
        </p>
      )}
    </div>
  )
}
