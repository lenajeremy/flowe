import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar_url: string
}

async function json<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data
}

export function startEmail(email: string): Promise<{ ok: boolean }> {
  return apiFetch(`${API}/api/auth/email/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).then((r) => json(r))
}

export function verifyEmail(
  payload: { email: string; code: string } | { token: string },
): Promise<{ user: AuthUser }> {
  return apiFetch(`${API}/api/auth/email/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then((r) => json(r))
}

export async function me(): Promise<AuthUser | null> {
  try {
    const res = await apiFetch(`${API}/api/auth/me`)
    if (!res.ok) return null
    const data = (await res.json()) as { user: AuthUser | null }
    return data.user
  } catch {
    return null
  }
}

export function logout(): Promise<Response> {
  return apiFetch(`${API}/api/auth/logout`, { method: 'POST' })
}
