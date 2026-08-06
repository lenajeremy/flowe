import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { API } from '@/lib/config'
import { clearResourceCache } from '@/lib/integrationResources'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  activeGitHubInstallations,
  fetchGitHubSetup,
  githubMissingEventLabels,
  isGitHubInstallationSettingsURL,
  isGitHubInstallURL,
  readyGitHubInstallations,
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
  const [detailsOpen, setDetailsOpen] = useState(false)
  const detailsID = useId()
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

  function openGitHubPopup(url: string) {
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

  function install() {
    const url = snapshot.status?.install_url
    if (!isGitHubInstallURL(url)) {
      toast.error('The GitHub installation link is unavailable')
      return
    }
    openGitHubPopup(url)
  }

  function reviewPermissions() {
    const url = permissionApprovalInstallations[0]?.settings_url
    if (!isGitHubInstallationSettingsURL(url)) {
      toast.error('The GitHub permission settings link is unavailable', {
        description: 'Refresh the installation status and try again.',
      })
      return
    }
    openGitHubPopup(url)
  }

  function restoreSuspendedInstallation() {
    const url = suspendedInstallations[0]?.settings_url
    if (!isGitHubInstallationSettingsURL(url)) {
      toast.error('The GitHub installation settings link is unavailable', {
        description: 'Refresh the installation status and try again.',
      })
      return
    }
    openGitHubPopup(url)
  }

  function openAppPermissions() {
    const slug = snapshot.status?.app_slug
    if (!slug || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,98}[A-Za-z0-9])?$/.test(slug)) {
      toast.error('The GitHub App settings link is unavailable')
      return
    }
    openGitHubPopup(`https://github.com/settings/apps/${slug}/permissions`)
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
  const permissionApprovalInstallations = ready
    ? activeInstallations.filter((installation) => installation.permissions_configured !== true)
    : []
  const permissionsReady = ready && readyGitHubInstallations(status).length === activeInstallations.length &&
    activeInstallations.length > 0
  const permissionReviewURL = permissionApprovalInstallations[0]?.settings_url
  const canReviewPermissions = isGitHubInstallationSettingsURL(permissionReviewURL)
  const canInstall = ready && status.app_configured && isGitHubInstallURL(status.install_url)
  const missingEventLabels = ready ? githubMissingEventLabels(status) : []
  const suspendedSettingsAvailable = isGitHubInstallationSettingsURL(suspendedInstallations[0]?.settings_url)
  const appPermissionsAvailable = ready && typeof status.app_slug === 'string' &&
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,98}[A-Za-z0-9])?$/.test(status.app_slug)

  type RepairKind = 'refresh' | 'install' | 'permissions' | 'app_permissions' | 'suspended'
  type HealthIssue = {
    title: string
    description: string
    action: string
    repair: RepairKind
    disabled?: boolean
    tone: 'hold' | 'fail'
  }

  let healthIssue: HealthIssue | null = null
  if (snapshot.phase === 'failed') {
    healthIssue = {
      title: 'Couldn’t verify GitHub',
      description: snapshot.error ?? 'Fernary could not check the GitHub App installation.',
      action: 'Try again',
      repair: 'refresh',
      tone: 'fail',
    }
  } else if (ready && !status.app_configured) {
    healthIssue = {
      title: 'GitHub setup is unavailable',
      description: 'Fernary’s GitHub App configuration could not be verified.',
      action: 'Retry',
      repair: 'refresh',
      tone: 'fail',
    }
  } else if (ready && !authorized) {
    healthIssue = {
      title: 'Reconnect GitHub',
      description: 'Authorize Fernary again before repository events can run workflows.',
      action: 'Reconnect',
      repair: 'install',
      disabled: !canInstall,
      tone: 'hold',
    }
  } else if (ready && !installed) {
    healthIssue = {
      title: 'Install the GitHub App',
      description: 'Choose the GitHub account and repositories Fernary should listen to.',
      action: 'Install',
      repair: 'install',
      disabled: !canInstall,
      tone: 'hold',
    }
  } else if (ready && permissionApprovalInstallations.length > 0) {
    const accounts = permissionApprovalInstallations
      .map((installation) => installation.account_login || 'this installation')
      .join(', ')
    const missing = Array.from(new Set(permissionApprovalInstallations.flatMap((installation) =>
      installation.permissions_missing)))
    healthIssue = {
      title: 'Approve updated permissions',
      description: `GitHub needs approval for ${accounts}${missing.length > 0 ? `: ${missing.join(', ')}` : '.'}`,
      action: 'Review permissions',
      repair: 'permissions',
      disabled: !canReviewPermissions,
      tone: 'hold',
    }
  } else if (ready && !status.webhook_configured) {
    healthIssue = {
      title: 'Webhook delivery isn’t configured',
      description: 'This is a Fernary configuration issue. GitHub triggers cannot receive events yet.',
      action: 'Retry',
      repair: 'refresh',
      tone: 'fail',
    }
  } else if (ready && status.webhook_events_error) {
    healthIssue = {
      title: 'Couldn’t verify GitHub events',
      description: status.webhook_events_error,
      action: 'Try again',
      repair: 'refresh',
      tone: 'fail',
    }
  } else if (ready && !status.webhook_events_configured) {
    healthIssue = {
      title: 'GitHub events aren’t enabled',
      description: missingEventLabels.length > 0
        ? `Enable these Permissions & events settings: ${missingEventLabels.join(', ')}.`
        : 'Enable Fernary’s required Permissions & events settings in GitHub.',
      action: 'Open app settings',
      repair: 'app_permissions',
      disabled: !appPermissionsAvailable,
      tone: 'fail',
    }
  } else if (ready && suspendedInstallations.length > 0) {
    healthIssue = {
      title: 'Restore the GitHub installation',
      description: `${suspendedInstallations.length} installation${suspendedInstallations.length === 1 ? ' is' : 's are'} suspended.`,
      action: 'Open GitHub',
      repair: 'suspended',
      disabled: !suspendedSettingsAvailable,
      tone: 'hold',
    }
  }

  const healthy = ready && healthIssue === null
  function repairGitHub(kind: RepairKind) {
    if (kind === 'refresh') void refresh()
    else if (kind === 'install') install()
    else if (kind === 'permissions') reviewPermissions()
    else if (kind === 'app_permissions') openAppPermissions()
    else restoreSuspendedInstallation()
  }

  const subtitle = snapshot.phase === 'loading'
    ? 'Checking authorization and repository access…'
    : ready && installed
      ? installationSummary(status)
      : ready && status.connected
        ? 'No active GitHub installation'
        : 'GitHub is not connected'

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[var(--color-text)]">GitHub App</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--color-muted)]">
            {snapshot.phase === 'failed' ? 'Fernary could not verify the GitHub App installation.' : subtitle}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <HealthBadge
            state={snapshot.phase === 'loading'
              ? 'checking'
              : healthy
                ? 'ready'
                : healthIssue?.tone === 'fail'
                  ? 'failed'
                  : 'attention'}
          />
          {ready && status.connected && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label="GitHub connection actions"
                    className="pressable flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-subtle)] transition-colors hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)]"
                  />
                }
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="3" cy="7" r="1" fill="currentColor" />
                  <circle cx="7" cy="7" r="1" fill="currentColor" />
                  <circle cx="11" cy="7" r="1" fill="currentColor" />
                </svg>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[190px] bg-[var(--color-elevated)]">
                {canInstall && (
                  <DropdownMenuItem onClick={install} className="text-[11px]">
                    Manage repository access
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => void refresh()} className="text-[11px]">
                  Refresh status
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => void disconnect()}
                  className="text-[11px]"
                >
                  Disconnect GitHub
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {healthIssue && (
        <div
          className="mt-3 rounded-lg border p-2.5"
          style={{
            borderColor: `var(--color-${healthIssue.tone})`,
            background: `color-mix(in srgb, var(--color-${healthIssue.tone}) 7%, transparent)`,
          }}
        >
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full border text-[9px] font-semibold"
              style={{ borderColor: `var(--color-${healthIssue.tone})`, color: `var(--color-${healthIssue.tone})` }}
            >
              !
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-medium text-[var(--color-text)]">{healthIssue.title}</p>
              <p className="mt-0.5 text-[9.5px] leading-relaxed text-[var(--color-muted)]">
                {healthIssue.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => repairGitHub(healthIssue.repair)}
              disabled={healthIssue.disabled}
              className="pressable flex-none rounded-md bg-[var(--color-text)] px-2.5 py-1 text-[9.5px] font-medium text-[var(--color-canvas)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {healthIssue.action}
            </button>
          </div>

          {ready && (
            <div className="mt-2 border-t border-[var(--color-border)] pt-2">
              <button
                type="button"
                aria-expanded={detailsOpen}
                aria-controls={detailsID}
                onClick={() => setDetailsOpen((open) => !open)}
                className="pressable flex items-center gap-1 text-[9.5px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
              >
                {detailsOpen ? 'Hide details' : 'View details'}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                  className={`transition-transform duration-150 ${detailsOpen ? 'rotate-180' : ''}`}
                >
                  <path d="m2.5 3.75 2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {detailsOpen && (
                <div id={detailsID} className="mt-2 grid gap-1.5">
                  <StatusDetail label="Authorized" complete={authorized} />
                  <StatusDetail label="Installed" complete={installed} />
                  <StatusDetail label="Permissions approved" complete={permissionsReady} />
                  <StatusDetail label="Webhook configured" complete={status.webhook_configured} />
                  <StatusDetail
                    label="Events subscribed"
                    complete={status.webhook_events_configured}
                    verificationFailed={Boolean(status.webhook_events_error)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {healthy && (
        <p className="mt-2.5 text-[9.5px] leading-relaxed text-[var(--color-subtle)]">
          GitHub triggers are ready to receive repository events.
        </p>
      )}
    </div>
  )
}

function HealthBadge({ state }: {
  state: 'checking' | 'ready' | 'attention' | 'failed'
}) {
  const label = state === 'checking'
    ? 'Checking'
    : state === 'ready'
      ? 'Ready'
      : state === 'attention'
        ? 'Action needed'
        : 'Check failed'
  const color = state === 'ready'
    ? 'var(--color-ok)'
    : state === 'attention'
      ? 'var(--color-hold)'
      : state === 'failed'
        ? 'var(--color-fail)'
        : 'var(--color-subtle)'

  return (
    <span
      className="inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[9.5px] font-medium"
      style={{ borderColor: color, color }}
    >
      <span aria-hidden="true" className="flex h-3 w-3 items-center justify-center rounded-full border border-current text-[7px]">
        {state === 'ready' ? '✓' : state === 'checking' ? '·' : '!'}
      </span>
      {label}
    </span>
  )
}

function StatusDetail({ label, complete, verificationFailed = false }: {
  label: string
  complete: boolean
  verificationFailed?: boolean
}) {
  const color = complete
    ? 'var(--color-ok)'
    : verificationFailed
      ? 'var(--color-subtle)'
      : 'var(--color-hold)'

  return (
    <div className="flex items-center gap-2 text-[9.5px]">
      <span
        aria-hidden="true"
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[8px] font-semibold"
        style={{
          borderColor: color,
          color,
        }}
      >
        {complete ? '✓' : verificationFailed ? '?' : '—'}
      </span>
      <span className={complete ? 'text-[var(--color-muted)]' : 'text-[var(--color-text)]'}>{label}</span>
      <span className="ml-auto text-[var(--color-subtle)]">
        {complete ? 'Complete' : verificationFailed ? 'Couldn’t verify' : 'Needs attention'}
      </span>
    </div>
  )
}
