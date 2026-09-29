import { create } from 'zustand'
import type { User } from '@/types'
import { authService } from '@/services/api/authService'

interface AuthStoreState {
  user: User | null
  isLoading: boolean
  isInitialized: boolean
  login: (u: User) => void
  logout: () => Promise<void>
  checkAuth: () => Promise<User | null>
}

// Session lives in an httpOnly cookie set by the backend, with authorization token backup.
export const useAuth = create<AuthStoreState>((set) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  login: (user) => set({ user, isInitialized: true, isLoading: false }),
  logout: async () => {
    await authService.logout()
    set({ user: null, isInitialized: true, isLoading: false })
    sessionStorage.clear()
  },
  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const user = await authService.me()
      set({ user, isLoading: false, isInitialized: true })
      return user
    } catch {
      set({ user: null, isLoading: false, isInitialized: true })
      return null
    }
  },
}))
