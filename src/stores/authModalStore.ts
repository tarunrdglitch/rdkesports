import { create } from 'zustand'

export type AuthModalMode = 'login' | 'register'

interface AuthModalState {
  isOpen: boolean
  mode: AuthModalMode
  openLogin: () => void
  openRegister: () => void
  setMode: (mode: AuthModalMode) => void
  close: () => void
}

export const useAuthModal = create<AuthModalState>((set) => ({
  isOpen: false,
  mode: 'login',
  openLogin: () => set({ isOpen: true, mode: 'login' }),
  openRegister: () => set({ isOpen: true, mode: 'register' }),
  setMode: (mode) => set({ mode }),
  close: () => set({ isOpen: false }),
}))
