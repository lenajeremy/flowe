import { toast } from 'sonner'
import { ApiError } from '@/lib/apiError'

/**
 * Reports a failed API call, giving a plan limit the treatment it deserves.
 *
 * A limit is not a fault: the person did nothing wrong and retrying will not help,
 * so the useful response is the way out of it rather than a red box. These get the
 * server's own explanation — which names the limit and what to do — plus longer on
 * screen to read it, and a button to the pricing page.
 *
 * `navigate` is passed in rather than using a router hook, so this stays a plain
 * function callable from anywhere including a catch block.
 */
export function reportApiError(e: unknown, navigate: (to: string) => void, fallback = 'Something went wrong') {
  const err = e instanceof ApiError ? e : null
  const message = err?.message || (e as Error)?.message || fallback

  if (err?.isPlanLimit) {
    // WARNING, not error. Nothing is broken and the person did nothing wrong —
    // they asked for something their plan does not include. Red says "we failed",
    // which sends people to support instead of to the pricing page.
    toast.warning(message, {
      // Long enough to read a sentence and make a decision. The default couple of
      // seconds cannot carry an explanation plus a choice.
      duration: 12000,
      action: {
        label: 'See plans',
        onClick: () => navigate('/pricing'),
      },
    })
    return
  }

  if (err?.isForbidden) {
    // Also not a fault: somebody else on the team controls this. No action button —
    // pointing them at pricing would be pointing at a page they cannot act on.
    toast.warning(message, { duration: 8000 })
    return
  }

  // Anything else genuinely went wrong.
  toast.error(message)
}

/**
 * A limit that was APPLIED rather than refused — the request succeeded, but not
 * exactly as asked.
 *
 * Separate from reportApiError because the outcome differs: something is now
 * saved, and the person needs to know it is not what they typed. Silence here is
 * how a schedule ends up running daily while somebody believes it runs hourly.
 */
export function reportAdjusted(message: string, navigate: (to: string) => void) {
  toast.warning(message, {
    duration: 10000,
    action: { label: 'See plans', onClick: () => navigate('/pricing') },
  })
}
