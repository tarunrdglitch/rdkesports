import type { User } from '@/types'

export interface LoginResponse {
  success: boolean
  user: User
  token?: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  ign?: string
  role?: 'player' | 'team_captain'
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign in')
    }

    if (data.token) {
      localStorage.setItem('rdk_auth_token', data.token)
    }

    return data
  },

  async register(payload: RegisterPayload): Promise<LoginResponse> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account')
    }

    if (data.token) {
      localStorage.setItem('rdk_auth_token', data.token)
    }

    return data
  },

  async me(): Promise<User | null> {
    const token = localStorage.getItem('rdk_auth_token')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers,
        credentials: 'include',
      })

      if (!res.ok) {
        return null
      }

      const data = await res.json()
      return data.user || null
    } catch {
      return null
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem('rdk_auth_token')
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore network errors on logout
    }
  },
}
