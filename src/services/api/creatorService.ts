import type { OfficialPartner, OfficialCreator, PlatformStats } from '@/types'

export const creatorService = {
  async list(includeAll = false): Promise<OfficialPartner[]> {
    try {
      const res = await fetch(`/api/creators${includeAll ? '?includeAll=true' : ''}`)
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

  async getDetails(id: string): Promise<{ partner: OfficialPartner; tournaments: any[] }> {
    const res = await fetch(`/api/creators/${id}/details`)
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to fetch partner details')
    }
    return json
  },

  async create(data: Partial<OfficialPartner> & { email?: string; password?: string; phone?: string }): Promise<OfficialPartner> {
    const res = await fetch('/api/creators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to create partner')
    }
    return json.creator
  },

  async update(id: string, data: Partial<OfficialPartner> & { email?: string; password?: string; phone?: string }): Promise<OfficialPartner> {
    const res = await fetch(`/api/creators/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to update partner')
    }
    return json.creator
  },

  async updateStatus(id: string, status: 'active' | 'suspended' | 'deactivated'): Promise<OfficialPartner> {
    const res = await fetch(`/api/creators/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to update partner status')
    }
    return json.partner
  },

  async resetAccess(id: string, newPassword?: string): Promise<{ email?: string; temporaryPassword: string }> {
    const res = await fetch(`/api/creators/${id}/reset-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to reset partner access')
    }
    return json
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/creators/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Failed to decommission partner')
    }
  },
}

export const partnerService = creatorService

