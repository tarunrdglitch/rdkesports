// ═══════════════════════════════════════════════════════════════
// EXACT 3 MAIN USER ROLES + SUBORDINATE TOURNAMENT STAFF
// ═══════════════════════════════════════════════════════════════
export type PlatformRole =
  | 'super_admin'       // ROLE 1: SUPER ADMIN (RDK Technologies)
  | 'official_partner'  // ROLE 2: OFFICIAL PARTNER (Tournament Organizer)
  | 'normal_user'       // ROLE 3: NORMAL USER (Competitive Gamer / Audience)

export type Role =
  | PlatformRole
  | 'creator'     // Legacy alias for official_partner
  | 'org_owner'   // Legacy alias for official_partner
  | 'player'      // Legacy alias for normal_user
  | 'ambassador'  // Subordinate tournament-specific staff account created by Official Partner

export type TournamentType =
  | 'BR SCRIM'
  | 'BR TOURNAMENT'
  | 'AUCTION TOURNAMENT'
  | 'CUSTOM TOURNAMENT'

export type TournamentStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'AUCTION'
  | 'LIVE'
  | 'FINISHED'
  | 'SETTLEMENT_PENDING'
  | 'SETTLEMENT_VERIFIED'
  | 'CLOSED'
  // Legacy status support
  | 'draft'
  | 'registration_open'
  | 'live'
  | 'completed'
  | 'paused'

export type SettlementStatus =
  | 'PENDING'
  | 'PAYMENT_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'

export interface OfficialPartner {
  id: string
  name: string
  handle: string
  organizationName: string
  avatar: string
  bio: string
  subscribers: string
  verified: boolean
  status?: 'active' | 'suspended' | 'deactivated'
  isDeleted?: boolean
  email?: string
  phone?: string
  games: string[]
  socials: {
    youtube?: string
    instagram?: string
    discord?: string
    twitter?: string
    loginEmail?: string
  }
  totalTournaments: number
  activeTournaments: number
  totalRegistrations?: number
  totalRdkFees?: number
  pendingRdkFees?: number
  paidRdkFees?: number
  createdAt?: string
}

// Backward-compatibility alias
export type OfficialCreator = OfficialPartner

export interface Tournament {
  id: string
  slug?: string
  name: string
  type?: TournamentType
  creatorId?: string
  creatorName?: string
  creatorHandle?: string
  creatorAvatar?: string
  game: string
  format: string
  banner?: string
  teams: number
  maxTeams: number
  maxSlots?: number
  status: TournamentStatus
  startDate: string
  endDate?: string
  registrationOpening?: string
  registrationClosing?: string
  prizePool?: string
  entryFee?: string
  entryType?: 'per_team' | 'per_player'
  registeredTeamsCount?: number
  isFeatured?: boolean
  auctionConfigured?: boolean
  upiId?: string
  upiName?: string
  upiQrUrl?: string
  rules?: string
  roomId?: string
  roomPassword?: string
  roomPublished?: boolean
  roadmap?: any
  streamUrl?: string
  streamTitle?: string
  streamStatus?: 'offline' | 'starting_soon' | 'live'
  scheduledMatchInfo?: string
  streamPlatform?: 'youtube' | 'twitch' | 'custom'
  settlementStatus?: SettlementStatus
  grossRevenue?: number
  rdkFee?: number
  partnerNet?: number
  isClosed?: boolean
  closedAt?: string
  createdAt?: string
}

export interface User {
  id: string
  name: string
  email?: string
  avatar?: string
  role: Role
  ign?: string
  phone?: string
  status?: 'active' | 'suspended' | 'deactivated'
  organizationId?: string
  organizationName?: string
  creatorProfile?: OfficialPartner
  isEphemeralAuctionBidder?: boolean
  auctionId?: string
  tournamentId?: string
  tournamentName?: string
  teamName?: string
  allocatedPurse?: number
  spentAmount?: number
}

export interface PlatformSettlement {
  id: string
  tournamentId: string
  tournamentName: string
  partnerId: string
  partnerName: string
  entryFee: number
  approvedEntries: number
  grossRevenue: number
  rdkFee: number
  partnerNet: number
  status: SettlementStatus
  utr?: string
  screenshotUrl?: string
  paymentDate?: string
  notes?: string
  submittedAt?: string
  verifiedAt?: string
  rejectionReason?: string
  createdAt: string
}

export interface PlatformAuditLog {
  id: string
  tournamentId?: string
  action: string
  actorId: string
  actorName: string
  actorRole: string
  details?: string
  oldValue?: string
  newValue?: string
  reason?: string
  createdAt: string
}

export interface PlatformStats {
  totalTournamentsHosted: number
  activeTournaments: number
  officialPartnersCount: number
  registeredGamers: string
  totalPrizeDistributed: string
  totalEntryRevenue?: number
  totalRdkFees?: number
  pendingRdkFees?: number
  paidRdkFees?: number
  topGames: string[]
}

