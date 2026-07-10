import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '@/lib/authApi'
import { useAuthStore } from '@/store/authStore'
import { FloweIcon } from '@/components/FloweIcon'

// Magic-link landing: /auth/verify?token=…
export function AuthVerifyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [error, setError] = useState<string | null>(null)
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    const token = params.get('token') ?? ''
    verifyEmail({ token })
      .then(({ user }) => {
        setUser(user)
        navigate('/workflows', { replace: true })
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'This sign-in link is invalid or has expired.')
      })
  }, [params, navigate, setUser])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-6 font-[var(--font-sans)] text-[var(--color-text)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <FloweIcon size={40} />
        {error ? (
          <>
            <p className="text-sm text-[var(--color-text)]">{error}</p>
            <Link
              to="/login"
              className="micro text-[var(--color-accent)] transition-opacity hover:opacity-80"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Signing you in…</p>
        )}
      </div>
    </div>
  )
}
