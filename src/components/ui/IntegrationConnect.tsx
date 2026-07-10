import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { API } from '@/lib/config'
import { clearResourceCache } from '@/lib/integrationResources'

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
  provider: 'notion' | 'linear'
  label: string
  hasManualToken: boolean
  manualField: ReactNode
}) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showManual, setShowManual] = useState(hasManualToken)

  const refresh = useCallback(() => {
    fetch(`${API}/api/integrations`)
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
    function onMessage(e: MessageEvent) {
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
    window.open(
      `${API}/api/integrations/${provider}/connect`,
      `connect-${provider}`,
      'width=560,height=720,menubar=no,toolbar=no',
    )
  }

  async function disconnect() {
    await fetch(`${API}/api/integrations/${provider}`, { method: 'DELETE' }).catch(() => {})
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
            style={{ background: connected ? '#0DDF1E' : '#667179' }}
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
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={loading}
            className="pressable flex-shrink-0 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            Connect {label}
          </button>
        )}
      </div>

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
