import { Link, useLocation } from 'react-router-dom'
import { FloweIcon } from '@/components/FloweIcon'

/**
 * There was no catch-all route, so a mistyped or stale URL rendered a blank
 * page — no message, and no navigation to escape with. This is deliberately
 * public and self-contained: routing an unknown path through the auth guard
 * would bounce a signed-out visitor to the login screen, which explains even
 * less than the blank page did.
 */
export function NotFoundPage() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-canvas)] px-8 font-sans text-[var(--color-text)]">
      <FloweIcon size={28} />
      <div className="text-center">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">This page doesn’t exist</h1>
        <p className="mt-2 text-[13px] text-[var(--color-muted)]">
          Nothing is served at <span className="text-[var(--color-text)]">{pathname}</span>.
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <Link
          to="/workflows"
          className="pressable rounded-xl bg-[var(--color-accent)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
        >
          Go to your workflows
        </Link>
        <Link
          to="/"
          className="pressable rounded-xl border border-[var(--color-border)] px-4 py-2 text-[13px] font-medium text-[var(--color-muted)] hover:border-[var(--color-border2)] hover:text-[var(--color-text)]"
        >
          Fernary home
        </Link>
      </div>
    </div>
  )
}
