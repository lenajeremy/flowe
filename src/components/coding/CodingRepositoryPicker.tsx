import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Select } from '@/components/ui/select'
import {
  fetchResources,
  INTEGRATION_CHANGED_EVENT,
  ResourceFetchError,
  type IntegrationResource,
} from '@/lib/integrationResources'

export type CodingRepositoryProvider = 'github' | 'gitlab'

interface RepositoryOption extends IntegrationResource {
  provider: CodingRepositoryProvider
}

const optionValue = (provider: CodingRepositoryProvider, id: string) => `${provider}:${id}`

export function CodingRepositoryPicker({
  provider,
  repositoryId,
  repository,
  onChange,
}: {
  provider: CodingRepositoryProvider
  repositoryId: string
  repository: string
  onChange: (selection: { provider: CodingRepositoryProvider; repositoryId: string; repository: string }) => void
}) {
  const [repositories, setRepositories] = useState<RepositoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [connectedProviders, setConnectedProviders] = useState<CodingRepositoryProvider[]>([])

  useEffect(() => {
    let alive = true
    let requestVersion = 0
    const providers: CodingRepositoryProvider[] = ['github', 'gitlab']
    function load() {
      const version = ++requestVersion
      void Promise.all(providers.map((candidate) => fetchResources(candidate)
        .then((resources) => ({
          provider: candidate,
          connected: true,
          resources: resources.filter((resource) => resource.type === (candidate === 'github' ? 'repo' : 'project')),
        }))
        .catch((error: unknown) => {
          if (!(error instanceof ResourceFetchError && error.status === 404)) {
            toast.error(`Couldn't load your ${candidate === 'github' ? 'GitHub' : 'GitLab'} repositories`, {
              id: `coding-repositories-${candidate}`,
              description: error instanceof Error ? error.message : 'Unknown error',
            })
          }
          return { provider: candidate, connected: false, resources: [] }
        })))
        .then((results) => {
          if (!alive || version !== requestVersion) return
          setConnectedProviders(results.filter((result) => result.connected).map((result) => result.provider))
          setRepositories(results.flatMap((result) => result.resources.map((resource) => ({
            ...resource,
            provider: result.provider,
          }))))
          setLoading(false)
        })
    }
    load()
    const onIntegrationChanged = (event: Event) => {
      const changed = (event as CustomEvent<string | undefined>).detail
      if (!changed || changed === 'github' || changed === 'gitlab') load()
    }
    window.addEventListener(INTEGRATION_CHANGED_EVENT, onIntegrationChanged)
    return () => {
      alive = false
      window.removeEventListener(INTEGRATION_CHANGED_EVENT, onIntegrationChanged)
    }
  }, [])

  const currentValue = repository
    ? optionValue(provider, repositoryId || (provider === 'github' ? repository : ''))
    : ''
  const currentIsUnavailable = currentValue !== '' && !repositories.some((item) => optionValue(item.provider, item.id) === currentValue)
  const options = useMemo(() => [
    {
      value: '',
      label: loading
        ? 'Loading connected repositories…'
        : connectedProviders.length === 0
          ? 'Connect GitHub or GitLab first'
          : repositories.length === 0
            ? 'No repositories available to your connections'
            : 'Select a repository…',
    },
    ...repositories.map((item) => ({
      value: optionValue(item.provider, item.id),
      label: `${item.provider === 'github' ? 'GitHub' : 'GitLab'} · ${item.name}`,
    })),
    ...(currentIsUnavailable ? [{
      value: currentValue,
      label: `${provider === 'github' ? 'GitHub' : 'GitLab'} · ${repository} (connection unavailable)`,
    }] : []),
  ], [connectedProviders.length, currentIsUnavailable, currentValue, loading, provider, repositories, repository])

  return (
    <div className="flex flex-col gap-1">
      <Select
        id="cfg-coding-repository"
        value={currentValue}
        onChange={(value) => {
          const selected = repositories.find((item) => optionValue(item.provider, item.id) === value)
          if (!selected) {
            onChange({ provider: 'github', repositoryId: '', repository: '' })
            return
          }
          onChange({
            provider: selected.provider,
            repositoryId: selected.id,
            repository: selected.name,
          })
        }}
        options={options}
      />
      {!loading && connectedProviders.length === 0 && (
        <p className="text-[10px] leading-relaxed text-[var(--color-subtle)]">
          Connect GitHub or GitLab from Integrations, then return here to choose a repository.
        </p>
      )}
    </div>
  )
}
