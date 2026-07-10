// apiFetch is a drop-in fetch for our own API: it always sends the session
// cookie, and bounces to /login when the session is gone. External APIs
// (Anthropic/OpenAI/etc in executor.ts) must keep using plain fetch.
export async function apiFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, { ...init, credentials: 'include' })

  if (res.status === 401) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const isAuthCall = url.includes('/api/auth/')
    const publicPaths = ['/login', '/auth/verify', '/', '/trigger/', '/run/']
    const onPublicPage =
      window.location.pathname === '/' ||
      publicPaths.some((p) => p !== '/' && window.location.pathname.startsWith(p))
    if (!isAuthCall && !onPublicPage) {
      window.location.assign('/login')
    }
  }
  return res
}
