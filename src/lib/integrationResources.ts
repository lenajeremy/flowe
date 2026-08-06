import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

export interface IntegrationResource {
  id: string
  name: string
  type: string
}

// One in-flight/settled fetch per provider — and per parent, since a
// repository's branches are a different list from the account's repositories —
// so several fields in the same panel don't each hit the resources endpoint.
const resourceCache = new Map<string, Promise<IntegrationResource[]>>()

const cacheKey = (provider: string, parent?: string) =>
  parent ? `${provider}\u0000${parent}` : provider

export class ResourceFetchError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * List a provider's resources. `parent` scopes the request to what lives inside
 * another resource — a repository's branches and collaborators — which is what
 * turns "type the branch name" into a dropdown.
 */
export function fetchResources(provider: string, parent?: string): Promise<IntegrationResource[]> {
  const key = cacheKey(provider, parent)
  let cached = resourceCache.get(key)
  if (!cached) {
    const url = `${API}/api/integrations/${provider}/resources` +
      (parent ? `?parent=${encodeURIComponent(parent)}` : '')
    cached = apiFetch(url)
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
        resourceCache.delete(key)
        throw err
      })
    resourceCache.set(key, cached)
  }
  return cached
}

/** Fired on window whenever a provider is connected or disconnected. */
export const INTEGRATION_CHANGED_EVENT = 'flowe:integration-changed'

/** Invalidate cached resources and notify listeners (e.g. open ResourcePickers). */
export function clearResourceCache(provider?: string) {
  // Clearing a provider has to drop its scoped lists too, or reconnecting an
  // account would refresh the repositories and leave stale branches beneath them.
  if (provider) {
    for (const key of resourceCache.keys()) {
      if (key === provider || key.startsWith(`${provider}\u0000`)) resourceCache.delete(key)
    }
  } else resourceCache.clear()
  window.dispatchEvent(new CustomEvent(INTEGRATION_CHANGED_EVENT, { detail: provider }))
}
