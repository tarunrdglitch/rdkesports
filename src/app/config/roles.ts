import type { Role } from '@/types'

export interface NavItem {
  label: string
  to: string
  roles: Role[]
  badge?: string
}

export const adminNav: NavItem[] = [
  { label: 'Control Tower', to: '/admin/dashboard', roles: ['super_admin'] },
  { label: 'Official Creators', to: '/admin/creators', roles: ['super_admin'] },
  { label: 'All Tournaments', to: '/admin/tournaments', roles: ['super_admin'] },
  { label: 'Payments & Platform', to: '/admin/payments', roles: ['super_admin'] },
  { label: 'Audit Logs', to: '/admin/audit-logs', roles: ['super_admin'] },
]

export const creatorNav: NavItem[] = [
  { label: 'Creator Hub', to: '/creator/dashboard', roles: ['super_admin', 'creator', 'org_owner'] },
  { label: 'My Tournaments', to: '/creator/tournaments', roles: ['super_admin', 'creator', 'org_owner'] },
  { label: 'Create Tournament', to: '/creator/tournaments/create', roles: ['super_admin', 'creator', 'org_owner'] },
  { label: 'Teams & Rosters', to: '/creator/teams', roles: ['super_admin', 'creator', 'org_owner'] },
  { label: 'UPI Verifications', to: '/creator/payments', roles: ['super_admin', 'creator', 'org_owner'] },
  { label: 'Ambassadors', to: '/creator/ambassadors', roles: ['super_admin', 'creator', 'org_owner'] },
  { label: 'Live Auction', to: '/creator/auctions', roles: ['super_admin', 'creator', 'org_owner'] },
  { label: 'Creator Profile', to: '/creator/profile', roles: ['super_admin', 'creator', 'org_owner'] },
]

export const ambassadorNav: NavItem[] = [
  { label: 'Auction Bidding Arena', to: '/ambassador/dashboard', roles: ['ambassador', 'super_admin'] },
  { label: 'My Squad Roster', to: '/ambassador/dashboard?tab=squad', roles: ['ambassador', 'super_admin'] },
  { label: 'Watch Tournament Live', to: '/ambassador/dashboard?tab=live', roles: ['ambassador', 'super_admin'] },
]

export const playerNav: NavItem[] = [
  { label: 'My Hub', to: '/player/dashboard', roles: ['player'] },
  { label: 'My Team & Roster', to: '/player/team', roles: ['player'] },
  { label: 'Browse Tournaments', to: '/tournaments', roles: ['player'] },
  { label: 'Match Rooms & Schedule', to: '/player/matches', roles: ['player'] },
]

export const orgNav: NavItem[] = creatorNav

export const homeFor = (r: Role) => {
  switch (r) {
    case 'super_admin':
      return '/admin/dashboard'
    case 'creator':
    case 'org_owner':
      return '/creator/dashboard'
    case 'ambassador':
      return '/ambassador/dashboard'
    case 'player':
    default:
      return '/player/dashboard'
  }
}
