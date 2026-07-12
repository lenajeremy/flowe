import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { API } from '@/lib/config'
import { startEmail, verifyEmail, me } from '@/lib/authApi'
import { setToken } from '@/lib/tokenStore'
import { useAuthStore } from '@/store/authStore'
import { FloweIcon } from '@/components/FloweIcon'
import { inputClass } from '@/components/ui/FormField'

const OTP_LENGTH = 6

// Origin the Google popup posts back from (the API origin; falls back to
// same-origin when VITE_BACKEND_URL is unset).
const apiOrigin = API ? new URL(API).origin : window.location.origin

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { status, setUser } = useAuthStore()
  const from = (location.state as { from?: string } | null)?.from ?? '/workflows'

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  // Already signed in → leave
  useEffect(() => {
    if (status === 'authed') navigate(from, { replace: true })
  }, [status, navigate, from])

  // Resend cooldown tick
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  // Google popup result
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== apiOrigin) return
      const d = e.data as { type?: string; status?: string; error?: string; token?: string }
      if (d?.type !== 'auth-oauth') return
      if (d.status === 'ok') {
        if (d.token) setToken(d.token)
        void me().then((user) => {
          if (user) {
            setUser(user)
            navigate(from, { replace: true })
          }
        })
      } else {
        toast.error(d.error || 'Google sign-in failed')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [navigate, from, setUser])

  async function handleEmailSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const addr = email.trim()
    if (!addr.includes('@')) {
      toast.error('Enter a valid email address')
      return
    }
    setBusy(true)
    try {
      await startEmail(addr)
      setStep('code')
      setResendIn(30)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the email')
    } finally {
      setBusy(false)
    }
  }

  async function handleCode(code: string) {
    setBusy(true)
    try {
      const { user } = await verifyEmail({ email: email.trim(), code })
      setUser(user)
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid code')
      setBusy(false)
    }
  }

  function handleGoogle() {
    // Pass our origin so the popup's postMessage can target it exactly —
    // the dev server port changes between runs.
    window.open(
      `${API}/api/auth/google/connect?origin=${encodeURIComponent(window.location.origin)}`,
      'auth-google',
      'width=560,height=720,menubar=no,toolbar=no',
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-6 font-[var(--font-sans)] text-[var(--color-text)]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <FloweIcon size={40} />
          <div>
            <h1 className="text-lg font-semibold tracking-[-0.01em]">
              {step === 'email' ? 'Sign in to Flowe' : 'Check your email'}
            </h1>
            <p className="micro mt-1 text-[var(--color-subtle)]">
              {step === 'email'
                ? 'Automation for people, not just developers'
                : `We sent a code and a sign-in link to ${email.trim()}`}
            </p>
          </div>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
            <input
              id="login-email"
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass} !py-2.5 !text-sm`}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="pressable h-10 rounded-[10px] bg-white text-[13px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? 'Sending…' : 'Continue with email'}
            </button>

            <div className="my-1 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="micro text-[var(--color-subtle)]">or</span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="pressable flex h-10 items-center justify-center gap-2.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] font-medium text-[var(--color-text)] hover:border-[var(--color-border2)]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <OtpInput disabled={busy} onComplete={handleCode} />
            <p className="micro text-center text-[var(--color-subtle)]">
              You can also click the sign-in link in the email — either works.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => { setStep('email'); }}
                className="micro text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
              >
                Use a different email
              </button>
              <button
                type="button"
                disabled={resendIn > 0 || busy}
                onClick={() => void handleEmailSubmit()}
                className="micro text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-40"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── OTP boxes ────────────────────────────────────────────────────

function OtpInput({ disabled, onComplete }: { disabled: boolean; onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function commit(next: string[]) {
    setDigits(next)
    const code = next.join('')
    if (code.length === OTP_LENGTH && next.every((d) => d !== '')) {
      onComplete(code)
    }
  }

  function handleChange(i: number, value: string) {
    const clean = value.replace(/\D/g, '')
    if (!clean) return
    // Paste of the full code into any box
    if (clean.length > 1) {
      const next = Array(OTP_LENGTH).fill('') as string[]
      for (let j = 0; j < Math.min(clean.length, OTP_LENGTH); j++) next[j] = clean[j]
      commit(next)
      refs.current[Math.min(clean.length, OTP_LENGTH) - 1]?.focus()
      return
    }
    const next = [...digits]
    next[i] = clean
    commit(next)
    if (i < OTP_LENGTH - 1) refs.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...digits]
      if (next[i]) {
        next[i] = ''
        setDigits(next)
      } else if (i > 0) {
        next[i - 1] = ''
        setDigits(next)
        refs.current[i - 1]?.focus()
      }
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus()
  }

  return (
    <div className="flex justify-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={i === 0}
          maxLength={OTP_LENGTH}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="h-12 w-10 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface2)] text-center font-[var(--font-mono)] text-lg text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)] disabled:opacity-50"
        />
      ))}
    </div>
  )
}
