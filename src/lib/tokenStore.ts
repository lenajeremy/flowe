// Session bearer token, persisted in localStorage. Sent as `Authorization:
// Bearer <token>` by apiFetch. Cookies aren't usable because the frontend
// (Vercel) and API (Railway) are different sites, so browsers drop the
// cross-site cookie; a token in JS is the deliberate trade-off.
const KEY = 'flowe_token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(KEY, token)
  } catch {
    /* private mode / storage disabled — session lasts the tab's lifetime only */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
