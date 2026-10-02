import type { Tournament } from '@/types'

export interface PlayerTournamentData {
  tournaments: Tournament[]
  count: number
  paymentStatus: string
  activeMatch: {
    tournamentId: string
    tournamentName: string
    game: string
    roomId?: string
    roomPassword?: string
    status: string
    scheduledMatchInfo?: string
    scheduledMatchTime?: string
    reportingTime?: string
    roomInstructions?: string
  } | null
}

export const tournamentService = {
  list: async (): Promise<Tournament[]> => {
    try {
      const res = await fetch('/api/tournaments')
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.error('Failed to load tournaments from API:', err)
    }
    return []
  },

  getMyTournaments: async (params?: { email?: string; ign?: string; name?: string }): Promise<PlayerTournamentData> => {
    try {
      const qs = new URLSearchParams()
      if (params?.email) qs.set('email', params.email)
      if (params?.ign) qs.set('ign', params.ign)
      if (params?.name) qs.set('name', params.name)
      const token = localStorage.getItem('rdk_auth_token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`/api/player/my-tournaments?${qs.toString()}`, {
        headers,
        credentials: 'include',
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.error('Failed to load player tournaments from API:', err)
    }
    return { tournaments: [], count: 0, paymentStatus: 'None', activeMatch: null }
  },
}
