export type Role =
  | 'super_admin'
  | 'creator'
  | 'org_owner'
  | 'ambassador'
  | 'player'

export type TournamentStatus = 'draft' | 'registration_open' | 'live' | 'completed' | 'paused'

export interface OfficialCreator {
  id: string
  name: string
  handle: string
  organizationName: string
  avatar: string
  bio: string
  subscribers: string
  verified: boolean
  games: string[]
  socials: {
    youtube?: string
    instagram?: string
    discord?: string
    twitter?: string
  }
  activeTournaments: number
  totalTournaments: number
}

export interface Tournament {
  id: string
  slug?: string
  name: string
  creatorName?: string
  creatorHandle?: string
  creatorAvatar?: string
  game: string
  format: string
  banner?: string
  teams: number
  maxTeams: number
  status: TournamentStatus
  startDate: string
  prizePool?: string
  entryFee?: string
  registeredTeamsCount?: number
  isFeatured?: boolean
}

export interface User {
  id: string
  name: string
  email?: string
  role: Role
  ign?: string
  organizationId?: string
  organizationName?: string
  creatorProfile?: OfficialCreator
  isEphemeralAuctionBidder?: boolean
  auctionId?: string
  tournamentId?: string
  tournamentName?: string
  teamName?: string
  allocatedPurse?: number
}

export interface PlatformStats {
  totalTournamentsHosted: number
  activeTournaments: number
  officialPartnersCount: number
  registeredGamers: string
  totalPrizeDistributed: string
  topGames: string[]
}
