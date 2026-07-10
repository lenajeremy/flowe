import { create } from 'zustand'
import { me, logout, type AuthUser } from '@/lib/authApi'

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
    set(user ? { user, status: 'authed' } : { user: null, status: 'anon' })
  },

  setUser: (user) => set({ user, status: 'authed' }),

  signOut: async () => {
    await logout().catch(() => {})
    set({ user: null, status: 'anon' })
  },
}))
