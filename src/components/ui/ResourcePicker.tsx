import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Select } from '@/components/ui/Select'
import { inputClass } from '@/components/ui/FormField'
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
export function ResourcePicker({ provider, kind, id, value, onChange, placeholder }: {
  provider: 'notion' | 'linear' | 'github' | 'gitlab' | 'stripe' | 'googlecalendar' | 'googledrive' | 'outlook' | 'slack'
  kind: 'database' | 'page' | 'team' | 'project' | 'repo' | 'price' | 'calendar' | 'folder' | 'channel'
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [resources, setResources] = useState<IntegrationResource[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'disconnected' | 'failed'>('loading')
  const [manual, setManual] = useState(false)

  useEffect(() => {
    let alive = true
    function load() {
      fetchResources(provider)
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
  }, [provider, kind])

  // A value that isn't a known resource (template token, pasted ID) needs the input.
  const valueIsForeign = value !== '' && !resources.some((r) => r.id === value)
  const showInput = manual || (valueIsForeign && state === 'ready')

  const placeholderLabel =
    state === 'loading' ? 'Loading…' :
    state === 'failed' ? `Couldn't load ${kind}s — retry or enter an ID` :
    state === 'disconnected' ? `Connect ${provider} to pick a ${kind}` :
    resources.length === 0 ? `No ${kind}s shared with your connection` :
    `Select a ${kind}…`

  return (
    <div className="flex flex-col gap-1">
      {showInput ? (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder={placeholder}
        />
      ) : (
        <Select
          id={id}
          value={value}
          onChange={onChange}
          options={[
            { value: '', label: placeholderLabel },
            ...resources.map((r) => ({ value: r.id, label: r.name })),
          ]}
        />
      )}
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
      {state === 'ready' && resources.length === 0 && (
        <p className="text-[10px] leading-relaxed text-[var(--color-subtle)]">
          {provider === 'notion'
            ? `Your Notion connection has no ${kind}s shared with it — reconnect and pick ${kind === 'database' ? 'a database' : 'pages'} in the Notion popup.`
            : 'No teams found on your Linear connection.'}
        </p>
      )}
    </div>
  )
}
