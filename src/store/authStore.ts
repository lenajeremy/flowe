import { create } from 'zustand'
import { me, logout, type AuthUser } from '@/lib/authApi'
import posthog from '@/lib/posthog'

type AuthStatus = 'loading' | 'authed' | 'anon'

interface AuthState {
  user: AuthUser | null
  status: AuthStatus
  bootstrap: () => Promise<void>
  setUser: (user: AuthUser) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',

  bootstrap: async () => {
    if (get().status !== 'loading') return
    const user = await me()
    if (user) {
      posthog.identify(user.id, { email: user.email, name: user.name })
      set({ user, status: 'authed' })
    } else {
      set({ user: null, status: 'anon' })
    }
  },

  setUser: (user) => {
    const currentUser = get().user
    if (currentUser && currentUser.id !== user.id) posthog.reset()
    posthog.identify(user.id, { email: user.email, name: user.name })
    set({ user, status: 'authed' })
  },

  signOut: async () => {
    await logout().catch(() => {})
    posthog.reset()
    set({ user: null, status: 'anon' })
  },
}))
