import type { OfficialCreator, PlatformStats } from '@/types'

export const creatorService = {
  async list(): Promise<OfficialCreator[]> {
    try {
      const res = await fetch('/api/creators')
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback
    }
    return []
  },

  async getPlatformStats(): Promise<PlatformStats | null> {
    try {
      const res = await fetch('/api/platform/stats')
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback
    }
    return null
  },

  async create(data: Partial<OfficialCreator> & { email?: string; password?: string }): Promise<OfficialCreator> {
    const res = await fetch('/api/creators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to create creator')
    }
    return json.creator
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/creators/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Failed to remove creator')
    }
  },
}
