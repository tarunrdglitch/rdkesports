import type { Role } from '@/types'

export interface NavItem {
  label: string
  to: string
  roles: Role[]
  badge?: string
}

export const isSuperAdminRole = (r?: Role) => r === 'super_admin'
export const isOfficialPartnerRole = (r?: Role) =>
  r === 'official_partner' || r === 'creator' || r === 'org_owner'
export const isNormalUserRole = (r?: Role) =>
  r === 'normal_user' || r === 'player' || !r
export const isAmbassadorRole = (r?: Role) => r === 'ambassador'

export const adminNav: NavItem[] = [
  { label: 'Platform Overview', to: '/admin/dashboard', roles: ['super_admin'] },
  { label: 'Live Tournaments', to: '/admin/dashboard?tab=live', roles: ['super_admin'], badge: 'Live' },
  { label: 'Official Partners', to: '/admin/creators', roles: ['super_admin'] },
  { label: 'Platform Tournaments', to: '/admin/tournaments', roles: ['super_admin'] },
  { label: 'Financials & Settlements', to: '/admin/payments', roles: ['super_admin'] },
  { label: 'Platform Audit Logs', to: '/admin/audit-logs', roles: ['super_admin'] },
]

export const partnerNav: NavItem[] = [
  { label: 'Partner Dashboard', to: '/creator/dashboard', roles: ['super_admin', 'official_partner', 'creator', 'org_owner'] },
  { label: 'My Tournaments', to: '/creator/tournaments', roles: ['super_admin', 'official_partner', 'creator', 'org_owner'] },
  { label: 'Create Tournament', to: '/creator/tournaments/create', roles: ['super_admin', 'official_partner', 'creator', 'org_owner'] },
  { label: 'Settlement & Payments', to: '/creator/payments', roles: ['super_admin', 'official_partner', 'creator', 'org_owner'] },
  { label: 'Partner Profile', to: '/creator/profile', roles: ['super_admin', 'official_partner', 'creator', 'org_owner'] },
]

export const creatorNav = partnerNav

export const ambassadorNav: NavItem[] = [
  { label: 'Live Bidding Arena', to: '/ambassador/dashboard', roles: ['ambassador', 'super_admin'] },
  { label: 'My Squad Roster', to: '/ambassador/dashboard?tab=squad', roles: ['ambassador', 'super_admin'] },
  { label: 'Watch Tournament Live', to: '/ambassador/dashboard?tab=live', roles: ['ambassador', 'super_admin'] },
]

export const playerNav: NavItem[] = [
  { label: 'Gamer Hub', to: '/player/dashboard', roles: ['normal_user', 'player'] },
  { label: 'My Registrations', to: '/player/dashboard?tab=registrations', roles: ['normal_user', 'player'] },
  { label: 'Browse Tournaments', to: '/tournaments', roles: ['normal_user', 'player'] },
]

export const orgNav: NavItem[] = partnerNav

export const homeFor = (r: Role) => {
  switch (r) {
    case 'super_admin':
      return '/admin/dashboard'
    case 'official_partner':
    case 'creator':
    case 'org_owner':
      return '/creator/dashboard'
    case 'ambassador':
      return '/ambassador/dashboard'
    case 'normal_user':
    case 'player':
    default:
      return '/player/dashboard'
  }
}

