import { toast } from 'sonner'
import { ApiError } from '@/lib/apiError'

/**
 * Reports a failed API call as a title plus the server's own explanation.
 *
 * Every helper used to throw `new Error("Failed to publish workflow")` and drop
 * the response body, so a 402 that named the exact limit and what to do about it
 * arrived as four generic words. The message IS the product here: "the free plan
 * runs one scheduled workflow at a time — unpublish the other one, or upgrade"
 * tells someone what to do; "Failed to publish workflow" tells them we are broken.
 *
 * `navigate` is passed in rather than taken from a router hook, so this stays a
 * plain function callable from a catch block.
 */

/**
 * Short headings by limit kind, matching the `limit` field the server sends.
 *
 * Keyed on that rather than parsed from the message, so wording can change on
 * either side without breaking the other.
 */
const LIMIT_TITLES: Record<string, string> = {
  workflows: 'Workflow limit reached',
  published_schedules: 'Schedule limit reached',
  schedule_interval: 'Schedule is too frequent',
  seats: 'No seats available',
  members: 'Team plan required',
  credits: 'Out of credits',
  member_credits: 'Your credits are used up',
}

export function reportApiError(e: unknown, navigate: (to: string) => void, fallback = 'Something went wrong') {
  const err = e instanceof ApiError ? e : null
  const description = err?.message || (e as Error)?.message || fallback

  if (err?.isPlanLimit) {
    toast.error(LIMIT_TITLES[err.limit ?? ''] ?? 'Plan limit reached', {
      description,
      // Long enough to read a sentence and make a decision. The default couple of
      // seconds cannot carry an explanation plus a choice.
      duration: 12000,
      action: { label: 'See plans', onClick: () => navigate('/pricing') },
    })
    return
  }

  if (err?.isForbidden) {
    // No action button: somebody else on the team controls this, so pointing them
    // at pricing would be pointing at a page they cannot act on.
    toast.error('Not allowed', { description, duration: 8000 })
    return
  }

  toast.error(fallback, { description })
}
