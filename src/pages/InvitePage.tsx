import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import { setToken } from '@/lib/tokenStore'
import { useAuthStore } from '@/store/authStore'
import { FloweIcon } from '@/components/FloweIcon'

// The invite landing page.
//
// Deliberately says which organization invited you and to what address BEFORE
// asking you to sign in. The alternative — bounce straight to /login — makes the
// flow read as "authenticate to discover what this link does", and people abandon
// links that will not say what they are.
//
// The invited address is shown because it is the address you must sign in with:
// accepting is bound to it, so a person with two accounts needs to know which one.

interface InviteInfo {
  organization: string
  email: string
  role: string
}

export function InvitePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const user = useAuthStore((s) => s.user)

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = 'Invitation · Fernary'
    if (!token) {
      setError('This link is missing its invitation code.')
      return
    }
    fetch(`${API}/api/org/invites/info?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || 'This invitation is no longer valid.')
        setInfo(d as InviteInfo)
      })
      .catch((e: Error) => setError(e.message))
  }, [token])

  async function accept() {
    setBusy(true)
    try {
      const res = await apiFetch(`${API}/api/org/invites/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(d.error || 'Could not accept the invitation')
        return
      }
      // Accepting switches which org you act in, and the session caches the org id
      // — so the server re-issues a token and we have to adopt it, or every
      // subsequent request still runs inside the personal org. The signed-in USER
      // is unchanged, so there is nothing to refetch.
      if (d.token) setToken(d.token)
      toast.success(`You've joined ${d.organization?.name ?? 'the organization'}`)
      navigate('/workflows')
    } finally {
      setBusy(false)
    }
  }

  const wrongAccount = Boolean(user && info && user.email.toLowerCase() !== info.email.toLowerCase())

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-6 text-[var(--color-text)]">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <FloweIcon size={22} />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Fernary</span>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 text-center">
          {error ? (
            <>
              <h1 className="text-[18px] font-semibold tracking-[-0.01em]">Invitation unavailable</h1>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--color-muted)]">{error}</p>
              <p className="mt-1 text-[13px] text-[var(--color-subtle)]">
                Invitations expire after 7 days. Ask whoever invited you to send a new one.
              </p>
              <Link to="/"
                className="pressable mt-6 flex h-10 w-full items-center justify-center rounded-xl border border-[var(--color-border)] text-[13px] font-medium hover:border-[var(--color-border2)]">
                Go to Fernary
              </Link>
            </>
          ) : !info ? (
            <div className="h-28 animate-pulse rounded-xl bg-[var(--color-hover)]" />
          ) : (
            <>
              <h1 className="text-[18px] font-semibold tracking-[-0.01em]">
                Join {info.organization}
              </h1>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                You&rsquo;ve been invited as {info.role === 'admin' ? 'an admin' : 'a member'}.
                You&rsquo;ll share workflows, connections and approvals with the team.
              </p>

              {!user ? (
                <>
                  <p className="mt-5 text-[13px] text-[var(--color-muted)]">
                    Sign in as <strong className="text-[var(--color-text)]">{info.email}</strong> to accept.
                  </p>
                  <button
                    onClick={() => navigate(`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`)}
                    className="pressable mt-4 h-10 w-full rounded-xl bg-[var(--color-accent)] text-[13px] font-semibold text-[var(--fern-forest)] hover:opacity-90">
                    Sign in to accept
                  </button>
                </>
              ) : wrongAccount ? (
                <>
                  {/* Accepting is bound to the invited address, so signing in as
                      someone else cannot work. Say which account is needed rather
                      than letting the accept fail with a server error. */}
                  <p className="mt-5 text-[13px] leading-relaxed text-[var(--color-muted)]">
                    This invitation is for <strong className="text-[var(--color-text)]">{info.email}</strong>,
                    but you&rsquo;re signed in as {user.email}.
                  </p>
                  <Link to="/login"
                    className="pressable mt-4 flex h-10 w-full items-center justify-center rounded-xl border border-[var(--color-border)] text-[13px] font-medium hover:border-[var(--color-border2)]">
                    Switch account
                  </Link>
                </>
              ) : (
                <button onClick={accept} disabled={busy}
                  className="pressable mt-6 h-10 w-full rounded-xl bg-[var(--color-accent)] text-[13px] font-semibold text-[var(--fern-forest)] hover:opacity-90 disabled:opacity-50">
                  {busy ? 'Joining…' : `Join ${info.organization}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
