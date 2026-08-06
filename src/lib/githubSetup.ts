import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

export interface GitHubInstalledRepository {
  id: string
  name: string
  type: 'repo'
  installation_id?: string
  account_login?: string
}

export interface GitHubInstallation {
  id: string
  account_login?: string
  account_type?: string
  avatar_url?: string
  repository_selection?: 'all' | 'selected' | string
  suspended?: boolean
  permissions_configured: boolean
  permissions_missing: string[]
  settings_url?: string
  repositories?: Array<{
    id: number
    full_name?: string
    name?: string
    private?: boolean
    type?: 'repo'
  }>
}

export interface GitHubSetupStatus {
  connected: boolean
  installed: boolean
  app_configured: boolean
  webhook_configured: boolean
  webhook_events_configured: boolean
  webhook_events_missing: string[]
  token_kind?: 'github_app' | 'oauth_app' | 'unknown' | string
  reconnect_required?: boolean
  app_slug?: string
  install_url?: string
  installations: GitHubInstallation[]
  repositories: GitHubInstalledRepository[]
}

export interface GitHubSetupSnapshot {
  phase: 'loading' | 'ready' | 'failed'
  status: GitHubSetupStatus | null
  error?: string
}

/** Only allow the trusted public GitHub host for app installation navigation. */
export function isGitHubInstallURL(value?: string): value is string {
  if (!value) return false
  try {
    const url = new URL(value)
    const installPath = /^\/apps\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,98}[A-Za-z0-9])?\/installations\/new$/
    return url.protocol === 'https:' &&
      url.hostname === 'github.com' &&
      url.port === '' &&
      url.username === '' &&
      url.password === '' &&
      url.hash === '' &&
      installPath.test(url.pathname)
  } catch {
    return false
  }
}

/** Only allow GitHub's personal or organization installation settings pages. */
export function isGitHubInstallationSettingsURL(value?: string): value is string {
  if (!value) return false
  try {
    const url = new URL(value)
    const safeLogin = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,98}[A-Za-z0-9])?'
    const settingsPath = new RegExp(
      `^/(?:settings/installations|organizations/${safeLogin}/settings/installations)/[1-9]\\d*$`,
    )
    return url.protocol === 'https:' &&
      url.hostname === 'github.com' &&
      url.port === '' &&
      url.username === '' &&
      url.password === '' &&
      url.search === '' &&
      url.hash === '' &&
      settingsPath.test(url.pathname)
  } catch {
    return false
  }
}

export async function fetchGitHubSetup(): Promise<GitHubSetupStatus> {
  const origin = encodeURIComponent(window.location.origin)
  const response = await apiFetch(`${API}/api/integrations/github/setup?origin=${origin}`)
  const body = await response.json().catch(() => ({})) as Partial<GitHubSetupStatus> & { error?: string }
  if (!response.ok) throw new Error(body.error ?? 'Could not check the GitHub App installation')
  return {
    connected: body.connected === true,
    installed: body.installed === true,
    // Security-sensitive configuration is always fail-closed. A malformed or
    // older server response must never make the UI claim triggers are ready.
    app_configured: body.app_configured === true,
    webhook_configured: body.webhook_configured === true,
    webhook_events_configured: body.webhook_events_configured === true,
    webhook_events_missing: Array.isArray(body.webhook_events_missing)
      ? body.webhook_events_missing
        .filter((event): event is string => typeof event === 'string' && event.trim() !== '')
        .map((event) => event.trim())
        .slice(0, 10)
      : [],
    token_kind: body.token_kind,
    reconnect_required: body.reconnect_required === true,
    app_slug: body.app_slug,
    install_url: body.install_url,
    installations: Array.isArray(body.installations)
      ? body.installations.map((installation) => ({
        ...installation,
        permissions_configured: installation.permissions_configured === true,
        permissions_missing: Array.isArray(installation.permissions_missing)
          ? installation.permissions_missing
            .filter((permission): permission is string =>
              typeof permission === 'string' && permission.trim() !== '')
            .map((permission) => permission.trim())
            .slice(0, 10)
          : [],
        settings_url: isGitHubInstallationSettingsURL(installation.settings_url)
          ? installation.settings_url
          : undefined,
      }))
      : [],
    repositories: Array.isArray(body.repositories) ? body.repositories : [],
  }
}

export const activeGitHubInstallations = (status: GitHubSetupStatus) =>
  status.installations.filter((installation) =>
    installation.suspended === false && /^[1-9]\d*$/.test(installation.id))

export const readyGitHubInstallations = (status: GitHubSetupStatus) =>
  activeGitHubInstallations(status).filter((installation) =>
    installation.permissions_configured === true)

export function githubRepositoryInstallation(
  status: GitHubSetupStatus,
  repository: string,
): GitHubInstallation | undefined {
  const candidate = status.repositories.find((item) =>
    (item.id === repository || item.name === repository) &&
    typeof item.installation_id === 'string')
  if (!candidate?.installation_id) return undefined
  return activeGitHubInstallations(status).find((installation) =>
    installation.id === candidate.installation_id)
}

export function githubRepositoryIsInstalled(status: GitHubSetupStatus, repository: string): boolean {
  const readyIDs = new Set(readyGitHubInstallations(status).map((installation) => installation.id))
  return status.repositories.some((candidate) =>
    typeof candidate.installation_id === 'string' &&
    readyIDs.has(candidate.installation_id) &&
    (candidate.id === repository || candidate.name === repository))
}

const GITHUB_EVENT_LABELS: Record<string, string> = {
  pull_request: 'Pull requests',
  issues: 'Issues',
  issue_comment: 'Issue comments',
  push: 'Pushes',
  release: 'Releases',
}

export function githubMissingEventLabels(status: GitHubSetupStatus): string[] {
  return status.webhook_events_missing.map((event) =>
    GITHUB_EVENT_LABELS[event.toLowerCase()] ?? event)
}
