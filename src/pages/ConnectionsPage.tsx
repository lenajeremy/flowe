import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import { clearResourceCache } from '@/lib/integrationResources'
import { FloweIcon } from '@/components/FloweIcon'
import { IntegrationLogo } from '@/components/IntegrationLogo'
import { UserMenu } from '@/components/ui/UserMenu'
import { NODE_LABELS, NODE_DESCRIPTIONS } from '@/lib/nodeColors'
import type { NodeType } from '@/types/workflow'

interface Connection {
  provider: NodeType
  connected: boolean
  available: boolean
  workflows: number
  workspace_name?: string
  connected_at?: string
  updated_at?: string
  expires_at?: string
  expired?: boolean
}

const shortDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

/** Connected, but the stored token's expiry has passed — it may still refresh. */
const needsAttention = (c: Connection) => c.connected && c.expired === true

export function ConnectionsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Connection[] | null>(null)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [shop, setShop] = useState('')

  const refresh = useCallback(() => {
    apiFetch(`${API}/api/integrations`)
      .then((r) => r.json())
      .then((list: Connection[]) => setRows(list))
      .catch(() => setRows([]))
  }, [])

  useEffect(() => {
    document.title = 'Connections · Fernary'
    refresh()
  }, [refresh])

  // The OAuth popup posts back when it lands on the callback page.
  useEffect(() => {
    const apiOrigin = API ? new URL(API).origin : window.location.origin
    function onMessage(e: MessageEvent) {
      if (e.origin !== apiOrigin) return
      const d = e.data as { type?: string; provider?: string } | null
      if (d?.type === 'integration-oauth' && d.provider) {
        clearResourceCache(d.provider)
        refresh()
        setAdding(false)
        toast.success(`${NODE_LABELS[d.provider as NodeType] ?? d.provider} connected`)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [refresh])

  function connect(provider: NodeType) {
    if (provider === 'shopify' && !shop.trim()) return
    // Opened synchronously inside the click so the popup blocker allows it; the
    // authorize URL needs our bearer token, so it arrives a moment later.
    const win = window.open('about:blank', `connect-${provider}`, 'width=560,height=720,menubar=no,toolbar=no')
    let url = `${API}/api/integrations/${provider}/connect?origin=${encodeURIComponent(window.location.origin)}`
    if (provider === 'shopify') url += `&shop=${encodeURIComponent(shop.trim())}`
    apiFetch(url)
      .then((r) => r.json())
      .then((d: { url?: string; error?: string }) => {
        if (d.url && win) win.location.href = d.url
        else {
          win?.close()
          toast.error(d.error ?? 'Could not start the connection')
        }
      })
      .catch(() => { win?.close(); toast.error('Could not start the connection') })
  }

  async function disconnect(c: Connection) {
    const name = NODE_LABELS[c.provider] ?? c.provider
    const warning = c.workflows > 0
      ? `\n\n${c.workflows} workflow${c.workflows === 1 ? '' : 's'} use${c.workflows === 1 ? 's' : ''} ${name} and will start failing.`
      : ''
    if (!window.confirm(`Disconnect ${name}?${warning}\n\nThe stored token is deleted immediately.`)) return
    setBusy(c.provider)
    try {
      await apiFetch(`${API}/api/integrations/${c.provider}`, { method: 'DELETE' })
      clearResourceCache(c.provider)
      toast.success(`${name} disconnected`)
      refresh()
    } catch {
      toast.error(`Could not disconnect ${name}`)
    } finally {
      setBusy(null)
    }
  }

  const connected = useMemo(() => (rows ?? []).filter((r) => r.connected), [rows])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return connected
    return connected.filter((r) =>
      (NODE_LABELS[r.provider] ?? r.provider).toLowerCase().includes(q) ||
      (r.workspace_name ?? '').toLowerCase().includes(q))
  }, [connected, search])

  const connectable = useMemo(
    () => (rows ?? []).filter((r) => !r.connected).sort((a, b) => Number(b.available) - Number(a.available)),
    [rows],
  )
  const attention = connected.filter(needsAttention).length
  const orphaned = useMemo(
    () => (rows ?? []).filter((r) => !r.connected && r.workflows > 0),
    [rows],
  )

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] font-sans text-[var(--color-text)]">
      <div className="mx-auto max-w-[1280px] px-8 py-12">

        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="pressable flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border2)]"
              title="Home"
            >
              <FloweIcon size={18} />
            </button>
            <h1 className="text-[26px] font-semibold tracking-[-0.01em]">Connections</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/workflows')}
              className="text-[13px] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              Workflows
            </button>
            <span className="h-5 w-px bg-[var(--color-border)]" />
            <UserMenu />
          </div>
        </div>

        <p className="mb-8 max-w-2xl text-[13.5px] leading-relaxed text-[var(--color-muted)]">
          The accounts your workflows act on. Access tokens are{' '}
          <span className="text-[var(--color-text)]">encrypted at rest</span> and never shown back to
          you or to anyone else. Disconnect any account at any time — the token is deleted
          immediately and Fernary loses access on the spot.
        </p>

        {/* Toolbar */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative w-full max-w-[420px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search connections"
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-4 pr-10 text-[13px] outline-none transition-colors placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-accent)]"
            />
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setAdding(true)}
            className="pressable flex h-11 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-[var(--fern-forest)] hover:opacity-90"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Add connection
          </button>
        </div>

        {/* Something needs a look */}
        {(attention > 0 || orphaned.length > 0) && (
          <div className="mb-6 flex flex-col gap-2">
            {attention > 0 && (
              <Banner tone="hold">
                {attention} connection{attention === 1 ? '' : 's'} {attention === 1 ? 'has' : 'have'} an
                expired token. Fernary will try to refresh automatically; reconnect if a workflow starts failing.
              </Banner>
            )}
            {orphaned.length > 0 && (
              <Banner tone="fail">
                {orphaned.map((o) => NODE_LABELS[o.provider] ?? o.provider).join(', ')}{' '}
                {orphaned.length === 1 ? 'is' : 'are'} used by a workflow but not connected — those
                steps will fail until you connect.
              </Banner>
            )}
          </div>
        )}

        {/* Table */}
        {rows === null ? (
          <p className="py-16 text-center text-[13px] text-[var(--color-muted)]">Loading connections…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            searching={search.trim().length > 0}
            onAdd={() => setAdding(true)}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_120px_110px_120px_92px] items-center gap-4 border-b border-[var(--color-border)] px-5 py-3">
              {['Account', 'App', 'Status', 'Workflows', 'Connected', ''].map((h, i) => (
                <span key={h || i} className="micro text-[var(--color-subtle)]">{h}</span>
              ))}
            </div>
            {filtered.map((c) => (
              <Row
                key={c.provider}
                c={c}
                busy={busy === c.provider}
                onDisconnect={() => void disconnect(c)}
                onReconnect={() => connect(c.provider)}
              />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <p className="mt-4 font-mono text-[11.5px] text-[var(--color-subtle)]">
            {filtered.length} of {connected.length} connection{connected.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {adding && (
        <AddConnection
          options={connectable}
          shop={shop}
          onShop={setShop}
          onPick={connect}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  )
}

function Banner({ tone, children }: { tone: 'hold' | 'fail'; children: React.ReactNode }) {
  const color = tone === 'hold' ? 'var(--color-hold)' : 'var(--color-fail)'
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-[12.5px] leading-relaxed"
      style={{ background: `color-mix(in srgb, ${color} 9%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 28%, transparent)` }}
    >
      <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: color }} />
      <span className="text-[var(--color-muted)]">{children}</span>
    </div>
  )
}

function Row({ c, busy, onDisconnect, onReconnect }: {
  c: Connection
  busy: boolean
  onDisconnect: () => void
  onReconnect: () => void
}) {
  const label = NODE_LABELS[c.provider] ?? c.provider
  const attention = needsAttention(c)
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_120px_110px_120px_92px] items-center gap-4 border-b border-[var(--color-border)] px-5 py-3.5 last:border-b-0 hover:bg-[var(--color-surface2)]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--color-chip-border)] bg-[var(--color-chip)] p-1">
          <IntegrationLogo type={c.provider} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium">{c.workspace_name || label}</p>
          <p className="truncate text-[11.5px] text-[var(--color-subtle)]">{NODE_DESCRIPTIONS[c.provider]}</p>
        </div>
      </div>

      <span className="truncate text-[13px] text-[var(--color-muted)]">{label}</span>

      <span className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
          style={{ background: attention ? 'var(--color-hold)' : 'var(--color-ok)' }}
        />
        <span className="text-[12.5px]" style={{ color: attention ? 'var(--color-hold)' : 'var(--color-ok)' }}>
          {attention ? 'Expired' : 'Connected'}
        </span>
      </span>

      <span className="font-mono text-[12.5px] tabular-nums text-[var(--color-muted)]">
        {c.workflows}
      </span>

      <span className="font-mono text-[12px] text-[var(--color-muted)]" title={c.connected_at}>
        {shortDate(c.connected_at)}
      </span>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onReconnect}
          className="text-[12px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
          title="Run the OAuth flow again to refresh access"
        >
          Reconnect
        </button>
        <button
          onClick={onDisconnect}
          disabled={busy}
          className="text-[12px] text-[var(--color-subtle)] transition-colors hover:text-[var(--color-fail)] disabled:opacity-50"
        >
          {busy ? '…' : 'Remove'}
        </button>
      </div>
    </div>
  )
}

function EmptyState({ searching, onAdd }: { searching: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-border2)] py-20">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-subtle)]">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
          <path d="M6.5 9.5L9.5 6.5M5 11l-1 1a2.5 2.5 0 01-3.5-3.5l2-2A2.5 2.5 0 015 6.5M11 5l1-1a2.5 2.5 0 013.5 3.5l-2 2A2.5 2.5 0 0111 9.5"
            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </span>
      <p className="text-[14px] font-medium">
        {searching ? 'No connections match that' : 'No connected accounts yet'}
      </p>
      <p className="max-w-sm text-center text-[12.5px] leading-relaxed text-[var(--color-muted)]">
        {searching
          ? 'Try a different name.'
          : 'Connect an account and your workflows can read from it and act in it while you’re away.'}
      </p>
      {!searching && (
        <button
          onClick={onAdd}
          className="pressable mt-1 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-[13px] font-semibold text-[var(--fern-forest)] hover:opacity-90"
        >
          Add connection
        </button>
      )}
    </div>
  )
}

function AddConnection({ options, shop, onShop, onPick, onClose }: {
  options: Connection[]
  shop: string
  onShop: (v: string) => void
  onPick: (p: NodeType) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const shown = options.filter((o) =>
    (NODE_LABELS[o.provider] ?? o.provider).toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      style={{ background: 'rgba(3,6,5,0.66)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-[var(--color-border2)] bg-[var(--color-surface)]"
        style={{ boxShadow: 'var(--pop-shadow)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <p className="text-[14px] font-semibold">Add a connection</p>
          <button onClick={onClose} className="text-[var(--color-subtle)] hover:text-[var(--color-text)]" title="Close">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 pt-4">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for an app"
            className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3.5 text-[13px] outline-none placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-accent)]"
          />
        </div>

        <div className="max-h-[46vh] overflow-y-auto p-2.5">
          {shown.length === 0 ? (
            <p className="py-8 text-center text-[12.5px] text-[var(--color-muted)]">Nothing matches that.</p>
          ) : shown.map((o) => (
            <div key={o.provider}>
              <button
                onClick={() => o.available && o.provider !== 'shopify' && onPick(o.provider)}
                disabled={!o.available}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-[var(--color-surface2)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--color-chip-border)] bg-[var(--color-chip)] p-0.5">
                  <IntegrationLogo type={o.provider} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{NODE_LABELS[o.provider]}</span>
                  <span className="block truncate text-[11.5px] text-[var(--color-subtle)]">
                    {o.available ? NODE_DESCRIPTIONS[o.provider] : 'Not configured on this server'}
                  </span>
                </span>
                {o.workflows > 0 && (
                  <span className="micro flex-shrink-0 rounded-full bg-[var(--tint-fail)] px-2 py-0.5 text-[var(--color-fail)]">
                    {o.workflows} waiting
                  </span>
                )}
              </button>

              {/* Shopify's authorize URL is per-store, so it needs the domain first */}
              {o.provider === 'shopify' && o.available && (
                <div className="flex items-center gap-2 px-2.5 pb-2.5">
                  <input
                    value={shop}
                    onChange={(e) => onShop(e.target.value)}
                    placeholder="your-store.myshopify.com"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-[12px] outline-none placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-accent)]"
                  />
                  <button
                    onClick={() => onPick('shopify')}
                    disabled={!shop.trim()}
                    className="pressable h-9 flex-shrink-0 rounded-lg bg-[var(--color-text)] px-3 text-[12px] font-semibold text-[var(--color-canvas)] disabled:opacity-40"
                  >
                    Connect
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="border-t border-[var(--color-border)] px-5 py-3.5 text-[11.5px] leading-relaxed text-[var(--color-subtle)]">
          You’ll authorise on the provider’s own site. Fernary stores an encrypted access token and
          nothing else — never your password.
        </p>
      </div>
    </div>
  )
}
