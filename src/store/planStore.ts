import { create } from 'zustand'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

// The org's current plan, shared by the surfaces that need to know it: the
// pricing page (to disable the plan you already have) and the app header (to show
// which tier you're on).
//
// A store rather than a hook per component because the plan changes on a Stripe
// webhook — so more than one place has to be able to invalidate it, and two
// components mounting must not fire two requests for the same answer.

export type PlanID = 'free' | 'pro' | 'team' | 'business'

interface PlanState {
  /** null until loaded, so "unknown" is distinguishable from "free". */
  plan: PlanID | null
  planName: string
  /** cancelAtPeriodEnd matters for labelling: still on the plan, but leaving. */
  cancelAtPeriodEnd: boolean
  hasBillingAccount: boolean
  seats: number
  loading: boolean
  load: () => Promise<void>
  refresh: () => Promise<void>
}

// A single in-flight request is shared, so several components mounting at once
// resolve from one round trip instead of racing.
let inFlight: Promise<void> | null = null

export const usePlanStore = create<PlanState>((set) => {
  const fetchPlan = async () => {
    set({ loading: true })
    try {
      const res = await apiFetch(`${API}/api/billing`)
      if (!res.ok) {
        // Signed out, or billing unavailable. Leave the plan unknown rather than
        // asserting "free" — a wrong badge is worse than no badge.
        set({ plan: null, loading: false })
        return
      }
      const d = await res.json()
      set({
        plan: (d.plan ?? 'free') as PlanID,
        planName: d.plan_name ?? 'Free',
        cancelAtPeriodEnd: Boolean(d.cancel_at_period_end),
        hasBillingAccount: Boolean(d.has_billing_account),
        seats: Number(d.seats ?? 1),
        loading: false,
      })
    } catch {
      set({ plan: null, loading: false })
    }
  }

  return {
    plan: null,
    planName: '',
    cancelAtPeriodEnd: false,
    hasBillingAccount: false,
    seats: 1,
    loading: false,

    load: () => {
      if (inFlight) return inFlight
      inFlight = fetchPlan().finally(() => { inFlight = null })
      return inFlight
    },

    refresh: () => {
      inFlight = null
      inFlight = fetchPlan().finally(() => { inFlight = null })
      return inFlight
    },
  }
})
