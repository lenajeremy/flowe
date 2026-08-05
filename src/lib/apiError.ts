/**
 * An error carrying what the server actually said.
 *
 * Every API helper used to throw `new Error("Failed to publish workflow")` and
 * drop the response body, so a 402 that explained precisely which limit was hit
 * and what to do about it reached the user as four generic words. That is worst
 * for plan limits, where the message IS the product: "the free plan runs one
 * scheduled workflow at a time — unpublish the other one, or upgrade" tells
 * someone what to do, and "Failed to publish workflow" tells them we are broken.
 */
export class ApiError extends Error {
  readonly status: number
  /**
   * Which limit was hit, when the server names one — "workflows",
   * "published_schedules", "schedule_interval", "seats", "members". Lets a caller
   * tailor the action without matching on message text.
   */
  readonly limit?: string

  constructor(message: string, status: number, limit?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.limit = limit
  }

  /**
   * True when this is a plan or credit limit rather than a fault — the cases
   * where the useful response is an upgrade, not a retry.
   */
  get isPlanLimit(): boolean {
    return this.status === 402
  }

  /** True when the caller lacks the authority, e.g. a member on a team plan. */
  get isForbidden(): boolean {
    return this.status === 403
  }
}

/**
 * Turns a failed Response into an ApiError, preferring the server's own wording.
 *
 * `fallback` is only used when the body has no message — a proxy error page, or a
 * response that isn't JSON.
 */
export async function apiError(res: Response, fallback: string): Promise<ApiError> {
  let message = fallback
  let limit: string | undefined
  try {
    const body = await res.json()
    if (typeof body?.error === 'string' && body.error.trim()) message = body.error
    if (typeof body?.limit === 'string') limit = body.limit
  } catch {
    // Not JSON. The fallback already says what was being attempted.
  }
  return new ApiError(message, res.status, limit)
}

/** Throws the parsed error. Sugar for the `if (!res.ok)` line every helper has. */
export async function throwApiError(res: Response, fallback: string): Promise<never> {
  throw await apiError(res, fallback)
}
