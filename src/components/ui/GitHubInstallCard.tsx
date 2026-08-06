import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { API } from '@/lib/config'
import { clearResourceCache } from '@/lib/integrationResources'
import {
  activeGitHubInstallations,
  fetchGitHubSetup,
  isGitHubInstallURL,
  type GitHubSetupSnapshot,
  type GitHubSetupStatus,
} from '@/lib/githubSetup'

function installationSummary(status: GitHubSetupStatus): string {
  const activeInstallations = activeGitHubInstallations(status)
  const activeIDs = new Set(activeInstallations.map((installation) => installation.id))
  const accounts = activeInstallations.length
  const repositories = status.repositories.filter((repository) =>
    !repository.installation_id || activeIDs.has(repository.installation_id)).length
  if (accounts === 0) return 'No active GitHub account installation is available'
  const accountLabel = `${accounts} account${accounts === 1 ? '' : 's'}`
  const repositoryLabel = `${repositories} repositor${repositories === 1 ? 'y' : 'ies'}`
  return `${accountLabel} · ${repositoryLabel}`
}

/**
 * GitHub authorization and GitHub App installation are deliberately shown as
 * separate facts. The install URL starts GitHub's installation flow and the
 * backend setup callback then continues through user authorization when it is
 * still needed.
 */
export function GitHubInstallCard({
  onChange,
  onDisconnect,
}: {
  onChange?: (snapshot: GitHubSetupSnapshot) => void
  onDisconnect: () => void | Promise<void>
}) {
  const [snapshot, setSnapshot] = useState<GitHubSetupSnapshot>({
    phase: 'loading',
    status: null,
  })
  const popup = useRef<Window | null>(null)
  const popupPoll = useRef<number | null>(null)

  const publish = useCallback((next: GitHubSetupSnapshot) => {
    setSnapshot(next)
    onChange?.(next)
  }, [onChange])

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) publish({ phase: 'loading', status: null })
    try {
      const status = await fetchGitHubSetup()
      publish({ phase: 'ready', status })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not check the GitHub App installation'
      publish({ phase: 'failed', status: null, error: message })
    }
  }, [publish])

  useEffect(() => {
    let alive = true
    fetchGitHubSetup()
      .then((status) => {
        if (alive) publish({ phase: 'ready', status })
      })
      .catch((error: unknown) => {
        if (!alive) return
        publish({
          phase: 'failed',
          status: null,
          error: error instanceof Error ? error.message : 'Could not check the GitHub App installation',
        })
      })
    return () => { alive = false }
  }, [publish])

  useEffect(() => {
    const apiOrigin = API ? new URL(API).origin : window.location.origin
    function onMessage(event: MessageEvent) {
      if (event.origin !== apiOrigin) return
      const data = event.data as { type?: string; provider?: string } | null
      if ((data?.type === 'integration-oauth' && data.provider === 'github') ||
          data?.type === 'github-app-installation') {
        clearResourceCache('github')
        void refresh(true)
      }
    }
    function onFocus() {
      // The GitHub installation page is cross-origin, so focus returning to
      // Fernary is the reliable fallback when its callback cannot postMessage.
      void refresh(true)
    }
    window.addEventListener('message', onMessage)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  useEffect(() => () => {
    if (popupPoll.current !== null) window.clearInterval(popupPoll.current)
  }, [])

  function install() {
    const url = snapshot.status?.install_url
    if (!isGitHubInstallURL(url)) {
      toast.error('The GitHub installation link is unavailable')
      return
    }
    popup.current = window.open(
      url,
      'install-fernary-github',
      'width=720,height=760,menubar=no,toolbar=no',
    )
    if (!popup.current) {
      toast.error('Your browser blocked the GitHub window', {
        description: 'Allow popups for Fernary, then try again.',
      })
      return
    }
    popup.current.focus()
    if (popupPoll.current !== null) window.clearInterval(popupPoll.current)
    popupPoll.current = window.setInterval(() => {
      if (!popup.current || popup.current.closed) {
        if (popupPoll.current !== null) window.clearInterval(popupPoll.current)
        popupPoll.current = null
        clearResourceCache('github')
        void refresh(true)
      }
    }, 800)
  }

  async function disconnect() {
    await onDisconnect()
    void refresh()
  }

  const status = snapshot.status
  const ready = snapshot.phase === 'ready' && status !== null
  const authorized = ready && status.connected && status.token_kind === 'github_app' && !status.reconnect_required
  const activeInstallations = ready ? activeGitHubInstallations(status) : []
  const suspendedInstallations = ready
    ? status.installations.filter((installation) => installation.suspended === true)
    : []
  const installed = ready && status.installed && activeInstallations.length > 0
  const legacyToken = ready && status.connected && !authorized
  const canInstall = ready && status.app_configured && isGitHubInstallURL(status.install_url)

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[var(--color-text)]">GitHub App</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--color-muted)]">
            {snapshot.phase === 'loading' && 'Checking authorization and repository access…'}
            {snapshot.phase === 'failed' && 'Fernary could not verify the GitHub App installation.'}
            {ready && !status.app_configured && 'GitHub App installation is not configured on this server.'}
            {ready && status.app_configured && legacyToken && 'This account needs to reconnect through the GitHub App before it can receive repository events.'}
            {ready && status.app_configured && !legacyToken && !installed && 'Install Fernary on the GitHub accounts and repositories this workflow may use.'}
            {ready && status.app_configured && !legacyToken && installed && installationSummary(status)}
          </p>
        </div>
        {ready && status.connected && (
          <button
            type="button"
            onClick={() => void disconnect()}
            className="flex-shrink-0 text-[10px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-fail)]"
          >
            Disconnect
          </button>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <StatusStep label="Authorized" complete={authorized} loading={snapshot.phase === 'loading'} />
        <StatusStep label="Installed" complete={installed} loading={snapshot.phase === 'loading'} />
        <StatusStep label="Webhooks" complete={ready && status.webhook_configured} loading={snapshot.phase === 'loading'} />
      </div>

      {ready && status.app_configured && !status.webhook_configured && (
        <p className="mt-2.5 text-[10px] leading-relaxed text-[var(--color-fail)]">
          GitHub webhook delivery is not configured on Fernary’s server. Triggers cannot listen
          until the webhook secret is added.
        </p>
      )}

      {ready && suspendedInstallations.length > 0 && (
        <p className="mt-2.5 text-[10px] leading-relaxed text-[var(--color-hold)]">
          {suspendedInstallations.length} GitHub installation{suspendedInstallations.length === 1 ? ' is' : 's are'}
          {' '}suspended. Restore access in GitHub before using repositories from that installation.
        </p>
      )}

      {snapshot.phase === 'failed' ? (
        <div className="mt-2.5">
          <p className="text-[10px] leading-relaxed text-[var(--color-fail)]">{snapshot.error}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="pressable mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-1 text-[10px] text-[var(--color-text)]"
          >
            Try again
          </button>
        </div>
      ) : ready && status.app_configured ? (
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={install}
            disabled={!canInstall}
            className="pressable rounded-lg bg-[var(--color-text)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-canvas)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {installed
              ? 'Add or update access'
              : suspendedInstallations.length > 0
                ? 'Restore access in GitHub'
                : 'Install Fernary on GitHub'}
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-[10px] text-[var(--color-subtle)] transition-colors hover:text-[var(--color-text)]"
          >
            Refresh
          </button>
        </div>
      ) : null}

      <p className="mt-2.5 text-[10px] leading-relaxed text-[var(--color-subtle)]">
        Authorization identifies you. Installation separately grants Fernary access only to the
        GitHub accounts and repositories you choose.
      </p>
    </div>
  )
}

function StatusStep({ label, complete, loading }: {
  label: string
  complete: boolean
  loading: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-[var(--color-surface2)] px-2 py-1.5">
      <span
        aria-hidden="true"
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[8px] font-semibold"
        style={{
          borderColor: complete ? 'var(--color-ok)' : 'var(--color-border2)',
          color: complete ? 'var(--color-ok)' : 'var(--color-subtle)',
        }}
      >
        {complete ? '✓' : loading ? '·' : '—'}
      </span>
      <span className="text-[9.5px] text-[var(--color-muted)]">{label}</span>
    </div>
  )
}
