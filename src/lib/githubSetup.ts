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
    token_kind: body.token_kind,
    reconnect_required: body.reconnect_required === true,
    app_slug: body.app_slug,
    install_url: body.install_url,
    installations: Array.isArray(body.installations) ? body.installations : [],
    repositories: Array.isArray(body.repositories) ? body.repositories : [],
  }
}

export const activeGitHubInstallations = (status: GitHubSetupStatus) =>
  status.installations.filter((installation) =>
    installation.suspended === false && /^[1-9]\d*$/.test(installation.id))

export function githubRepositoryIsInstalled(status: GitHubSetupStatus, repository: string): boolean {
  const activeIDs = new Set(activeGitHubInstallations(status).map((installation) => installation.id))
  return status.repositories.some((candidate) =>
    typeof candidate.installation_id === 'string' &&
    activeIDs.has(candidate.installation_id) &&
    (candidate.id === repository || candidate.name === repository))
}
