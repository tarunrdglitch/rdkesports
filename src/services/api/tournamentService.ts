import type { Tournament } from '@/types'

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
}
