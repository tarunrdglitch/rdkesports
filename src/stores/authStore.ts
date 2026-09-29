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
  login: (user) => {
    const isOwner = user?.email?.toLowerCase() === 'auraxtremezofficial@gmail.com'
    const finalUser = isOwner ? { ...user, name: 'Tarun', role: 'super_admin' as const } : user
    set({ user: finalUser, isInitialized: true, isLoading: false })
  },
  logout: async () => {
    await authService.logout()
    set({ user: null, isInitialized: true, isLoading: false })
    sessionStorage.clear()
  },
  checkAuth: async () => {
    set({ isLoading: true })
    try {
      let user = await authService.me()
      if (user?.email?.toLowerCase() === 'auraxtremezofficial@gmail.com') {
        user = { ...user, name: 'Tarun', role: 'super_admin' }
      }
      set({ user, isLoading: false, isInitialized: true })
      return user
    } catch {
      set({ user: null, isLoading: false, isInitialized: true })
      return null
    }
  },
}))
