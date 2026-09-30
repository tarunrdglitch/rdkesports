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
  updateUser: (partial: Partial<User>) => void
}

// Session lives in an httpOnly cookie set by the backend, with authorization token backup.
export const useAuth = create<AuthStoreState>((set) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  updateUser: (partial) =>
    set((state) => ({ user: state.user ? { ...state.user, ...partial } : null })),
  login: (user) => {
    const isOwner =
      user?.role === 'super_admin' ||
      user?.email?.toLowerCase() === 'auraxtremezofficial@gmail.com'
    const isPartner =
      user?.role === 'official_partner' ||
      user?.role === 'creator' ||
      user?.role === 'org_owner' ||
      user?.email?.toLowerCase().includes('aurazoner') ||
      user?.name?.toLowerCase().includes('aurazoner')
    const isAmbassador = user?.role === 'ambassador'

    const finalRole = isOwner
      ? ('super_admin' as const)
      : isPartner
      ? ('official_partner' as const)
      : isAmbassador
      ? ('ambassador' as const)
      : ('normal_user' as const)

    const finalUser = {
      ...user,
      name: isOwner ? (user.name || 'Tarun') : user.name,
      role: finalRole,
    }
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
      if (user) {
        const isOwner =
          user.role === 'super_admin' ||
          user.email?.toLowerCase() === 'auraxtremezofficial@gmail.com'
        const isPartner =
          user.role === 'official_partner' ||
          user.role === 'creator' ||
          user.role === 'org_owner' ||
          user.email?.toLowerCase().includes('aurazoner') ||
          user.name?.toLowerCase().includes('aurazoner')
        const isAmbassador = user.role === 'ambassador'

        const finalRole = isOwner
          ? ('super_admin' as const)
          : isPartner
          ? ('official_partner' as const)
          : isAmbassador
          ? ('ambassador' as const)
          : ('normal_user' as const)

        user = {
          ...user,
          name: isOwner ? (user.name || 'Tarun') : user.name,
          role: finalRole,
        }
      }
      set({ user, isLoading: false, isInitialized: true })
      return user
    } catch {
      set({ user: null, isLoading: false, isInitialized: true })
      return null
    }
  },
}))

// Eagerly restore user session on page load / browser refresh
if (typeof window !== 'undefined') {
  useAuth.getState().checkAuth()
}

