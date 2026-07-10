import { API } from '@/lib/config'

export interface IntegrationResource {
  id: string
  name: string
  type: string
}

// One in-flight/settled fetch per provider so several fields in the same
// panel don't each hit the resources endpoint.
const resourceCache = new Map<string, Promise<IntegrationResource[]>>()

export class ResourceFetchError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function fetchResources(provider: string): Promise<IntegrationResource[]> {
  let cached = resourceCache.get(provider)
  if (!cached) {
    cached = fetch(`${API}/api/integrations/${provider}/resources`)
      .then(async (r) => {
        if (r.ok) return r.json() as Promise<IntegrationResource[]>
        let message = `HTTP ${r.status}`
        try {
          const body = await r.json() as { error?: string }
          if (body?.error) message = body.error
        } catch { /* non-JSON body */ }
        throw new ResourceFetchError(r.status, message)
      })
      .catch((err) => {
        resourceCache.delete(provider)
        throw err
      })
    resourceCache.set(provider, cached)
  }
  return cached
}

/** Fired on window whenever a provider is connected or disconnected. */
export const INTEGRATION_CHANGED_EVENT = 'flowe:integration-changed'

/** Invalidate cached resources and notify listeners (e.g. open ResourcePickers). */
export function clearResourceCache(provider?: string) {
  if (provider) resourceCache.delete(provider)
  else resourceCache.clear()
  window.dispatchEvent(new CustomEvent(INTEGRATION_CHANGED_EVENT, { detail: provider }))
}
