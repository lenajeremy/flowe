import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { API } from '@/lib/config'
import { clearResourceCache } from '@/lib/integrationResources'
import { apiFetch } from '@/lib/http'

interface IntegrationStatus {
  provider: string
  connected: boolean
  available: boolean
  workspace_name?: string
}

/**
 * OAuth connection card for integration nodes (Notion, Linear).
 * Shows a Connect button when the app has no access yet; a connected
 * state with the workspace name + Disconnect once authorized.
 * `manualField` renders the legacy token input — shown directly when the
 * server has no OAuth app configured, or behind a toggle as an override.
 */
export function IntegrationConnect({ provider, label, hasManualToken, manualField }: {
  provider: 'notion' | 'linear' | 'github' | 'gitlab' | 'gmail' | 'stripe' | 'shopify'
  label: string
  hasManualToken: boolean
  manualField: ReactNode
}) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showManual, setShowManual] = useState(hasManualToken)
  const [shop, setShop] = useState('')

  const refresh = useCallback(() => {
    apiFetch(`${API}/api/integrations`)
      .then((r) => r.json())
      .then((list: IntegrationStatus[]) => {
        setStatus(list.find((s) => s.provider === provider) ?? null)
      })
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [provider])

  useEffect(() => { refresh() }, [refresh])

  // The OAuth popup posts back { type: 'integration-oauth', provider, status }
  useEffect(() => {
    const apiOrigin = API ? new URL(API).origin : window.location.origin
    function onMessage(e: MessageEvent) {
      if (e.origin !== apiOrigin) return
      const d = e.data as { type?: string; provider?: string } | null
      if (d?.type === 'integration-oauth' && d.provider === provider) {
        clearResourceCache(provider)
        refresh()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [provider, refresh])

  function connect() {
    // Pass our origin so the popup's postMessage can target it exactly —
    // the dev server port changes between runs. Shopify additionally needs the
    // shop domain to build its per-store authorize URL.
    let connectUrl = `${API}/api/integrations/${provider}/connect?origin=${encodeURIComponent(window.location.origin)}`
    if (provider === 'shopify') {
      if (!shop.trim()) return
      connectUrl += `&shop=${encodeURIComponent(shop.trim())}`
    }
    window.open(connectUrl, `connect-${provider}`, 'width=560,height=720,menubar=no,toolbar=no')
  }

  async function disconnect() {
    await apiFetch(`${API}/api/integrations/${provider}`, { method: 'DELETE' }).catch(() => {})
    clearResourceCache(provider)
    refresh()
  }

  // Server has no OAuth app configured for this provider — legacy token input only.
  if (!loading && status && !status.available) {
    return (
      <>
        {manualField}
        <p className="-mt-2 text-[10px] text-[var(--color-subtle)]">
          OAuth not configured on the server — set {provider.toUpperCase()}_CLIENT_ID / _SECRET to enable Connect.
        </p>
      </>
    )
  }

  const connected = status?.connected ?? false

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
            style={{ background: connected ? 'var(--color-ok)' : 'var(--color-dim)' }}
          />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-[var(--color-text)]">{label}</p>
            <p className="truncate text-[10px] text-[var(--color-muted)]">
              {loading
                ? 'Checking connection…'
                : connected
                  ? `Connected${status?.workspace_name ? ' · ' + status.workspace_name : ''}`
                  : `Flowe doesn't have access to ${label} yet`}
            </p>
          </div>
        </div>
        {connected ? (
          <button
            type="button"
            onClick={disconnect}
            className="flex-shrink-0 text-[10px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-fail)]"
          >
            Disconnect
          </button>
        ) : provider === 'shopify' ? null : (
          <button
            type="button"
            onClick={connect}
            disabled={loading}
            className="pressable flex-shrink-0 rounded-lg bg-[var(--color-text)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-canvas)] hover:opacity-90 disabled:opacity-50"
          >
            Connect {label}
          </button>
        )}
      </div>

      {/* Shopify needs the store domain before it can build the authorize URL */}
      {!connected && provider === 'shopify' && (
        <div className="flex items-center gap-2">
          <input
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder="your-store.myshopify.com"
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-2.5 py-1.5 text-[11px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="button"
            onClick={connect}
            disabled={loading || !shop.trim()}
            className="pressable flex-shrink-0 rounded-lg bg-[var(--color-text)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-canvas)] hover:opacity-90 disabled:opacity-50"
          >
            Connect
          </button>
        </div>
      )}

      {/* Manual token override */}
      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="self-start text-[10px] text-[var(--color-subtle)] transition-colors hover:text-[var(--color-text)]"
      >
        {showManual ? '− Hide manual token' : '+ Use a manual token instead'}
      </button>
      {showManual && manualField}
    </div>
  )
}
