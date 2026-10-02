import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { prisma, isDatabaseConfigured } from './db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = Number(process.env.PORT) || 5000
const JWT_SECRET = process.env.JWT_SECRET || 'rdk-esports-secret-jwt-key-2026'

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://rdkesports-production.up.railway.app',
  process.env.CLIENT_URL,
].filter(Boolean) as string[]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.netlify.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true)
      }
      return callback(null, true)
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '30mb' }))
app.use(express.urlencoded({ extended: true, limit: '30mb' }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, '../public')))

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

export interface AuthenticatedUser {
  id: string
  name: string
  email: string
  role: Role
  organizationId?: string
  organizationName?: string
  teamName?: string
  tournamentId?: string
  tournamentName?: string
  allocatedPurse?: number
  ign?: string
  isEphemeralAuctionBidder?: boolean
  auctionId?: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

// ── Global JWT Authentication Middleware ──
const authenticateToken = (req: Request, _res: Response, next: NextFunction) => {
  const token =
    req.cookies?.session_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null)

  if (!token) {
    return next()
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthenticatedUser
    let normalizedRole = payload.role
    if (payload.email?.toLowerCase() === 'auraxtremezofficial@gmail.com') {
      normalizedRole = 'super_admin'
    } else if (normalizedRole === 'creator' || normalizedRole === 'org_owner') {
      normalizedRole = 'official_partner'
    } else if (normalizedRole === 'player') {
      normalizedRole = 'normal_user'
    }

    req.user = {
      ...payload,
      role: normalizedRole,
    }
  } catch {
    // Session token invalid/expired; req.user remains undefined
  }
  next()
}

app.use(authenticateToken)

// ── RBAC Authorization Middlewares ──
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' })
  }
  next()
}

const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access forbidden: Super Admin platform authority required.' })
  }
  next()
}

const requirePartnerOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  const isSuper = req.user.role === 'super_admin'
  const isPartner =
    req.user.role === 'official_partner' ||
    req.user.role === 'creator' ||
    req.user.role === 'org_owner'

  if (!isSuper && !isPartner) {
    return res.status(403).json({ error: 'Access forbidden: Official Partner or Super Admin role required.' })
  }
  next()
}

// Ensure caller is the Official Partner who owns this tournament (or Super Admin)
const requireTournamentOrganizer = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  if (req.user.role === 'super_admin') return next()

  const tourneyId = String(req.params.id || req.params.tournamentId || '')
  const tourney = TOURNAMENTS.find((t) => t.id === tourneyId || t.slug === tourneyId)
  if (!tourney) {
    return res.status(404).json({ error: 'Tournament not found' })
  }

  const isPartner =
    req.user.role === 'official_partner' ||
    req.user.role === 'creator' ||
    req.user.role === 'org_owner'

  if (!isPartner) {
    return res.status(403).json({ error: 'Access forbidden: Only Official Partners can manage tournaments.' })
  }

  // Tenant Isolation: Prevent partner A from touching partner B's tournament
  const partnerOrgId = req.user.organizationId
  const partnerUserId = req.user.id
  const isOwner =
    (partnerOrgId && tourney.creatorId === partnerOrgId) ||
    (partnerUserId && tourney.creatorId === partnerUserId) ||
    (req.user.email && tourney.creatorHandle?.toLowerCase().includes(req.user.email.split('@')[0].toLowerCase())) ||
    (tourney.creatorName && req.user.name && tourney.creatorName.toLowerCase() === req.user.name.toLowerCase())

  if (!isOwner) {
    return res.status(403).json({ error: 'Access forbidden: You do not have permission to manage this tournament.' })
  }

  next()
}

// Ensure caller is authorized staff (Ambassador assigned to this tournament) or the owning Partner or Super Admin
const requireTournamentStaffOrOrganizer = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  if (req.user.role === 'super_admin') return next()

  const tourneyId = String(req.params.id || req.params.tournamentId || '')
  const tourney = TOURNAMENTS.find((t) => t.id === tourneyId || t.slug === tourneyId)
  if (!tourney) {
    return res.status(404).json({ error: 'Tournament not found' })
  }

  // Partner check
  if (
    req.user.role === 'official_partner' ||
    req.user.role === 'creator' ||
    req.user.role === 'org_owner'
  ) {
    const partnerOrgId = req.user.organizationId
    const partnerUserId = req.user.id
    const isOwner =
      (partnerOrgId && tourney.creatorId === partnerOrgId) ||
      (partnerUserId && tourney.creatorId === partnerUserId) ||
      (tourney.creatorName && req.user.name && tourney.creatorName.toLowerCase() === req.user.name.toLowerCase())
    if (isOwner) return next()
    return res.status(403).json({ error: 'Access forbidden: You are not the organizer of this tournament.' })
  }

  // Ambassador check: verify assigned tournament
  if (req.user.role === 'ambassador') {
    const assignedTourneyId = req.user.tournamentId || req.user.auctionId
    if (assignedTourneyId && (assignedTourneyId === tourney.id || assignedTourneyId === tourney.slug)) {
      return next()
    }
    return res.status(403).json({ error: 'Access forbidden: Ambassador is not assigned to this tournament.' })
  }

  return res.status(403).json({ error: 'Access forbidden: Insufficient tournament staff permissions.' })
}

// Bidding guard: Only assigned franchise bidders/ambassadors or organizers can place bids; normal users rejected!
const requireAuctionBiddingAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required to place auction bids.' })
  }
  if (req.user.role === 'super_admin') return next()

  const auctionId = String(req.params.id || req.params.auctionId || '')

  // Allow organizer
  if (
    req.user.role === 'official_partner' ||
    req.user.role === 'creator' ||
    req.user.role === 'org_owner'
  ) {
    return next()
  }

  // Allow assigned ambassador or franchise bidder
  if (req.user.role === 'ambassador' || req.user.isEphemeralAuctionBidder) {
    const assignedId = req.user.auctionId || req.user.tournamentId
    if (!assignedId || (assignedId !== auctionId)) {
      return res.status(403).json({ error: 'Access forbidden: You are not assigned to bid in this auction.' })
    }
    return next()
  }

  return res.status(403).json({
    error: 'Access forbidden: Normal Users cannot place live auction bids. Only assigned franchise bidders and ambassadors can bid.',
  })
}



export interface OfficialCreator {
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
  phone?: string
  email?: string
  games: string[]
  socials: {
    youtube?: string
    instagram?: string
    discord?: string
    twitter?: string
    loginEmail?: string
  }
  activeTournaments: number
  totalTournaments: number
  totalGrossRevenue?: number
  totalRdkFees?: number
  pendingRdkFees?: number
  paidRdkFees?: number
}

export interface UserRecord {
  id: string
  name: string
  email: string
  role: Role
  ign?: string
  phone?: string
  status?: 'active' | 'suspended' | 'deactivated'
  isDeleted?: boolean
  password?: string
  organizationId?: string
  organizationName?: string
  creatorProfile?: OfficialCreator
  isEphemeralAuctionBidder?: boolean
  auctionId?: string
  tournamentId?: string
  tournamentName?: string
  teamName?: string
  allocatedPurse?: number
  createdAt: string
}


export interface AmbassadorRecord {
  id: string
  name: string
  email: string
  creatorId: string
  tournamentId: string
  tournamentName: string
  assignedTeamRange: string
  phone?: string
  createdAt: string
}

export interface EphemeralAuctionBidder {
  id: string
  auctionId: string
  teamName: string
  loginCode: string
  passkey: string
  allocatedPurse: number
  group?: string
  status: 'active' | 'revoked'
  createdAt: string
}

// 1. Official Creators (Partners) - dynamic, onboarded by super_admin
let OFFICIAL_CREATORS: OfficialCreator[] = []

// 2. Base Users List (Platform Authority)
// NOTE: Only real credentials here — test accounts removed for production security.
let USERS: UserRecord[] = [
  {
    id: 'usr_owner_tarun',
    name: 'Tarun',
    email: 'auraxtremezofficial@gmail.com',
    role: 'super_admin',
    password: 'clasher@2026',
    organizationName: 'RDK Esports Org',
    createdAt: new Date().toISOString(),
  },
]

// 3. Ambassadors Store
let AMBASSADORS: AmbassadorRecord[] = []


// 5. Tournament, Team & Payment Data Models
export interface TournamentRecord {
  id: string
  slug: string
  name: string
  type?: 'BR SCRIM' | 'BR TOURNAMENT' | 'AUCTION TOURNAMENT' | 'CUSTOM TOURNAMENT' | string
  creatorId?: string
  creatorName: string
  creatorHandle: string
  creatorAvatar?: string
  game: string
  format: string
  banner: string
  teams: number
  maxTeams: number
  maxSlots?: number
  status:
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
  | 'draft'
  | 'registration_open'
  | 'live'
  | 'completed'
  | 'paused'
  | string
  startDate: string
  endDate?: string
  registrationOpening?: string
  registrationClosing?: string
  prizePool: string
  entryFee: string
  entryType?: 'per_team' | 'per_player' | string
  registeredTeamsCount: number
  isFeatured?: boolean
  auctionConfigured?: boolean
  upiId?: string
  upiName?: string
  upiQrUrl?: string
  rules?: string
  roomId?: string
  roomPassword?: string
  roomPublished?: boolean
  roadmap?: TournamentRoadmap
  streamUrl?: string
  streamTitle?: string
  streamStatus?: 'offline' | 'starting_soon' | 'live'
  scheduledMatchInfo?: string
  streamPlatform?: 'youtube' | 'twitch' | 'custom'
  settlementStatus?: 'PENDING' | 'PAYMENT_SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | string
  settlementProofUrl?: string | null
  settlementUtr?: string | null
  settlementDate?: string | null
  settlementAmount?: number | null
  grossRevenue?: number
  rdkFee?: number
  partnerNet?: number
  isClosed?: boolean
  closedAt?: string | Date | null
  maxSquadSize?: number
  basePrice?: number
  startingPurse?: number
  createdAt?: string | Date

}

export interface PlatformSettlementRecord {
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
  status: 'PENDING' | 'PAYMENT_SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'
  utr?: string
  screenshotUrl?: string
  paymentDate?: string
  notes?: string
  submittedAt?: string
  verifiedAt?: string
  rejectionReason?: string
  createdAt: string
}

export interface PlatformAuditLogRecord {
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

export interface AuctionReversalRecord {
  id: string
  tournamentId: string
  auctionId: string
  playerId: string
  playerIgn: string
  teamName: string
  soldPrice: number
  reason: string
  reversedBy: string
  createdAt: string
}


export interface BracketMatch {
  id: string
  stageId: string
  matchNumber: number
  team1: { name: string; score?: string; isWinner?: boolean; seed?: string; logo?: string }
  team2: { name: string; score?: string; isWinner?: boolean; seed?: string; logo?: string }
  scheduleTime?: string
  status: 'upcoming' | 'live' | 'completed'
}

export interface RoadmapStage {
  id: string
  name: string
  shortCode: string
  dateRange: string
  matches: BracketMatch[]
}

export interface TournamentRoadmap {
  title: string
  trophyName: string
  trophyIcon?: string
  stages: RoadmapStage[]
}

export interface RegisteredTeam {
  id: string
  tournamentId: string
  name: string
  captainName: string
  captainEmail: string
  captainPhone: string
  captainIgn: string
  players: { ign: string; gameUid: string }[]
  status: 'pending' | 'verified' | 'rejected'
  utr?: string
  paymentProofUrl?: string
  registeredAt: string
  group?: string
  ambassadorId?: string
  ambassadorName?: string
  role?: string
  achievements?: string
  experience?: string
  clipUrl?: string
}

export interface PaymentSubmission {
  id: string
  tournamentId: string
  tournamentName: string
  teamId: string
  teamName: string
  captainName: string
  amount: string
  utr: string
  screenshotUrl?: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  verifiedAt?: string
  rejectionReason?: string
}

export interface AuctionPlayer {
  id: string
  auctionId: string
  tournamentId: string
  name: string
  ign: string
  gameUid: string
  role: 'Rusher' | 'Sniper' | 'IGL' | 'Support' | 'Assaulter' | 'Flanker' | string
  basePrice: number
  tier?: 'Tier 1 (Marquee)' | 'Tier 2 (Pro)' | 'Tier 3 (Emerging)' | string
  group?: string
  experience?: string
  achievements?: string
  contactNumber?: string
  phone: string
  email: string
  clipUrl?: string // Video montage / highlight reel link (YouTube, Drive, Instagram)
  photoUrl?: string // Player portrait / card art
  stats?: {
    kd?: string
    matchesPlayed?: number
    headshotRate?: string
    achievements?: string
  }
  status: 'available' | 'on_auction' | 'sold' | 'unsold'
  soldPrice?: number
  soldToTeam?: string
  paymentProofUrl?: string
  paymentStatus: 'pending' | 'verified' | 'rejected'
  registeredAt: string
}

let AUCTION_PLAYERS: AuctionPlayer[] = []
let EPHEMERAL_BIDDERS: EphemeralAuctionBidder[] = []

export function createDefaultRoadmap(tourneyName: string): TournamentRoadmap {
  return {
    title: `ROAD TO CHAMPIONSHIP - ${tourneyName.toUpperCase()}`,
    trophyName: 'Grand Champions Cup',
    stages: [],
  }
}

let TOURNAMENTS: TournamentRecord[] = []
let REGISTERED_TEAMS: RegisteredTeam[] = []
let PAYMENT_SUBMISSIONS: PaymentSubmission[] = []
let PLATFORM_SETTLEMENTS: PlatformSettlementRecord[] = []
let PLATFORM_AUDIT_LOGS: PlatformAuditLogRecord[] = []
let AUCTION_REVERSALS: AuctionReversalRecord[] = []

// ═══════════════════════════════════════════════════════════════
// CENTRALIZED FINANCIAL CALCULATION SERVICE

// ═══════════════════════════════════════════════════════════════
// CENTRALIZED FINANCIAL CALCULATION SERVICE
// ═══════════════════════════════════════════════════════════════
export interface FinancialCalculationResult {
  entryFee: number
  approvedEntries: number
  totalRegisteredEntries: number
  grossRevenue: number
  projectedGrossRevenue: number
  projectedRdkFee: number
  rdkFee: number
  partnerNet: number
  settlementStatus: string
  canClose: boolean
}

export function calculateTournamentFinances(tourney: TournamentRecord): FinancialCalculationResult {
  let fee = 0
  if (typeof tourney.entryFee === 'number') {
    fee = tourney.entryFee
  } else if (typeof tourney.entryFee === 'string') {
    const cleaned = tourney.entryFee.replace(/[^0-9.]/g, '')
    fee = cleaned ? parseFloat(cleaned) : 0
  }

  const isAuction =
    tourney.type === 'AUCTION TOURNAMENT' ||
    tourney.format === 'Auction Tournament' ||
    tourney.format?.toLowerCase().includes('auction')

  const matchesTournament = (targetId?: string) =>
    Boolean(targetId && (targetId === tourney.id || targetId === tourney.slug))

  // 1. Teams registrations
  const teamsList = REGISTERED_TEAMS.filter((t) => matchesTournament(t.tournamentId))
  const verifiedTeams = teamsList.filter(
    (t) => String(t.status) === 'verified' || String(t.status) === 'approved'
  ).length

  // 2. Auction Draft Candidates
  const auctionList = AUCTION_PLAYERS.filter(
    (p) => matchesTournament(p.tournamentId) || matchesTournament(p.auctionId)
  )
  const verifiedAuctionCandidates = auctionList.filter(
    (p) => String(p.paymentStatus) === 'verified' || String(p.paymentStatus) === 'approved'
  ).length

  // 3. Verified Payment Submissions Queue
  const approvedPayments = PAYMENT_SUBMISSIONS.filter(
    (pay) => matchesTournament(pay.tournamentId) && (pay.status === 'approved' || (pay.status as string) === 'verified')
  ).length

  const totalRegisteredEntries = Math.max(
    teamsList.length,
    auctionList.length,
    tourney.registeredTeamsCount || 0,
    tourney.teams || 0
  )

  let approvedEntries = Math.max(
    verifiedTeams,
    verifiedAuctionCandidates,
    approvedPayments
  )

  if (approvedEntries === 0 && totalRegisteredEntries > 0) {
    approvedEntries = totalRegisteredEntries
  }

  const grossRevenue = Math.round(fee * approvedEntries)
  const rdkFee = Math.round(grossRevenue * 0.10)
  const partnerNet = grossRevenue - rdkFee

  const projectedGrossRevenue = Math.round(fee * totalRegisteredEntries)
  const projectedRdkFee = Math.round(projectedGrossRevenue * 0.10)

  const existingSettlement = PLATFORM_SETTLEMENTS.find((s) => s.tournamentId === tourney.id)
  const settlementStatus =
    existingSettlement?.status || tourney.settlementStatus || 'PENDING'

  const canClose = grossRevenue === 0 || settlementStatus === 'VERIFIED'

  return {
    entryFee: fee,
    approvedEntries,
    totalRegisteredEntries,
    grossRevenue,
    projectedGrossRevenue,
    projectedRdkFee,
    rdkFee,
    partnerNet,
    settlementStatus,
    canClose,
  }
}

// ═══════════════════════════════════════════════════════════════
// PLATFORM AUDIT LOGGER
// ═══════════════════════════════════════════════════════════════
export function logAuditEvent(params: {
  tournamentId?: string
  action: string
  actorId?: string
  actorName?: string
  actorRole?: string
  details?: string
  oldValue?: string
  newValue?: string
  reason?: string
}) {
  const log: PlatformAuditLogRecord = {
    id: `audit_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
    tournamentId: params.tournamentId,
    action: params.action,
    actorId: params.actorId || 'system',
    actorName: params.actorName || 'System',
    actorRole: params.actorRole || 'system',
    details: params.details,
    oldValue: params.oldValue,
    newValue: params.newValue,
    reason: params.reason,
    createdAt: new Date().toISOString(),
  }

  PLATFORM_AUDIT_LOGS.unshift(log)
  console.log(`[AuditLog] ${log.action} | Actor: ${log.actorName} (${log.actorRole}) | ${log.details || ''}`)

  if (isDatabaseConfigured) {
    prisma.platformAuditLog
      .create({
        data: {
          id: log.id,
          tournamentId: log.tournamentId,
          action: log.action,
          actorId: log.actorId,
          actorName: log.actorName,
          actorRole: log.actorRole,
          details: log.details,
          oldValue: log.oldValue,
          newValue: log.newValue,
          reason: log.reason,
        },
      })
      .catch((err) => console.error('[Database] Failed to persist audit log:', err))
  }

  return log
}


// Helper: Resolve or create user
function resolveUser(identifier: string, password?: string): UserRecord {
  const normalized = identifier.trim().toLowerCase()
  const existing = USERS.find(
    (u) => u.email.toLowerCase() === normalized || u.id.toLowerCase() === normalized
  )

  if (existing) {
    const creatorMatch = OFFICIAL_CREATORS.find(
      (c) =>
        c.id === existing.organizationId ||
        c.handle.toLowerCase().replace('@', '') === normalized ||
        c.handle.toLowerCase().replace('@', '') === normalized.split('@')[0] ||
        c.socials?.loginEmail?.toLowerCase() === normalized ||
        c.name.toLowerCase() === normalized ||
        normalized.includes('aurazoner') ||
        existing.email.toLowerCase().includes('aurazoner')
    )
    if (creatorMatch && existing.role !== 'super_admin') {
      existing.role = 'creator'
      existing.organizationId = creatorMatch.id
      existing.organizationName = creatorMatch.organizationName
      existing.creatorProfile = creatorMatch
    }
    return existing
  }

  // Check if identifier matches any official creator
  const creatorMatch = OFFICIAL_CREATORS.find(
    (c) =>
      c.handle.toLowerCase().replace('@', '') === normalized ||
      c.handle.toLowerCase().replace('@', '') === normalized.split('@')[0] ||
      c.socials?.loginEmail?.toLowerCase() === normalized ||
      c.name.toLowerCase() === normalized ||
      normalized.includes('aurazoner')
  )

  // Only allowed roles: super_admin, creator, ambassador, player
  let role: Role = 'player'
  if (normalized === 'auraxtremezofficial@gmail.com') role = 'super_admin'
  else if (normalized.startsWith('head') || normalized.startsWith('admin')) role = 'super_admin'
  else if (creatorMatch || normalized.startsWith('creator') || normalized.includes('aurazoner')) role = 'creator'
  else if (normalized.startsWith('amb')) role = 'ambassador'

  const newUser: UserRecord = {
    id: `usr_${Date.now()}`,
    name: creatorMatch ? creatorMatch.name : identifier.split('@')[0].replace(/[._]/g, ' '),
    email: normalized,
    role,
    organizationId: creatorMatch ? creatorMatch.id : undefined,
    organizationName: creatorMatch ? creatorMatch.organizationName : undefined,
    creatorProfile: creatorMatch,
    password: password || 'password123',
    createdAt: new Date().toISOString(),
  }
  USERS.push(newUser)
  return newUser
}

// ================= API ENDPOINTS ================= //

// 1. Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'RDK Esports Tournament OS',
    platform: 'Powered by RDK Technologies',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// 2. Public Platform Summary / Portfolio Stats
app.get('/api/platform/stats', (_req: Request, res: Response) => {
  res.json({
    totalTournamentsHosted: TOURNAMENTS.length,
    activeTournaments: TOURNAMENTS.filter((t) => t.status === 'live' || t.status === 'registration_open').length,
    officialPartnersCount: OFFICIAL_CREATORS.length,
    registeredGamers: `${REGISTERED_TEAMS.reduce((acc, t) => acc + (t.players?.length || 4), 0)}+`,
    totalPrizeDistributed: '₹0',
    topGames: ['Free Fire', 'BGMI', 'Valorant', 'CODM'],
  })
})

// 3. Official Creators & Partners
app.get('/api/creators', (req: Request, res: Response) => {
  const includeAll = req.query.includeAll === 'true'
  let list = OFFICIAL_CREATORS
  if (!includeAll) {
    list = list.filter((c) => !c.isDeleted && (c.status === 'active' || !c.status))
  }

  // Calculate live tournament counts and financials for each partner
  const enriched = list.map((c) => {
    const partnerTourneys = TOURNAMENTS.filter((t) => t.creatorId === c.id)
    const activeTourneys = partnerTourneys.filter((t) => t.status === 'live' || t.status === 'registration_open').length
    let totalGross = 0
    let totalRdk = 0
    let pendingRdk = 0
    let paidRdk = 0

    partnerTourneys.forEach((t) => {
      const fin = calculateTournamentFinances(t)
      totalGross += fin.grossRevenue
      totalRdk += fin.rdkFee
      if (fin.settlementStatus === 'VERIFIED') {
        paidRdk += fin.rdkFee
      } else {
        pendingRdk += fin.rdkFee
      }
    })

    return {
      ...c,
      status: c.status || 'active',
      isDeleted: c.isDeleted || false,
      totalTournaments: partnerTourneys.length,
      activeTournaments: activeTourneys,
      totalGrossRevenue: totalGross,
      totalRdkFees: totalRdk,
      pendingRdkFees: pendingRdk,
      paidRdkFees: paidRdk,
    }
  })

  res.json(enriched)
})

// 3b. Partner Detailed Profile & History (Super Admin or Partner self)
app.get('/api/creators/:id/details', (req: Request, res: Response) => {
  const id = String(req.params.id)
  const creator = OFFICIAL_CREATORS.find((c) => c.id === id)
  if (!creator) {
    return res.status(404).json({ error: 'Official Partner not found' })
  }

  const partnerTourneys = TOURNAMENTS.filter((t) => t.creatorId === creator.id)
  let totalGross = 0
  let totalRdk = 0
  let pendingRdk = 0
  let paidRdk = 0
  let totalRegistrations = 0

  const tournamentHistory = partnerTourneys.map((t) => {
    const fin = calculateTournamentFinances(t)
    totalGross += fin.grossRevenue
    totalRdk += fin.rdkFee
    totalRegistrations += fin.approvedEntries
    if (fin.settlementStatus === 'VERIFIED') {
      paidRdk += fin.rdkFee
    } else {
      pendingRdk += fin.rdkFee
    }

    return {
      ...t,
      finances: fin,
    }
  })

  return res.json({
    partner: {
      ...creator,
      status: creator.status || 'active',
      totalTournaments: partnerTourneys.length,
      totalRegistrations,
      totalGrossRevenue: totalGross,
      totalRdkFees: totalRdk,
      pendingRdkFees: pendingRdk,
      paidRdkFees: paidRdk,
    },
    tournaments: tournamentHistory,
  })
})

// 4. Create / Onboard an Official Partner (Super Admin only)
app.post('/api/creators', requireSuperAdmin, (req: Request, res: Response) => {
  try {
    const { name, handle, organizationName, bio, subscribers, games, socials, email, password, phone } = req.body

    if (!name || !handle || !organizationName) {
      return res.status(400).json({ error: 'Name, handle, and organization name are required' })
    }

    const newCreator: OfficialCreator = {
      id: `cr_${Date.now()}`,
      name,
      handle: handle.startsWith('@') ? handle : `@${handle}`,
      organizationName,
      avatar:
        req.body.avatar ||
        'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80',
      bio: bio || 'Official verified gaming partner on RDK Esports.',
      subscribers: subscribers || 'Official Partner',
      verified: true,
      status: 'active',
      isDeleted: false,
      games: games || ['Free Fire', 'BGMI'],
      email: email ? email.trim().toLowerCase() : undefined,
      phone: phone || undefined,
      socials: { ...(socials || {}), loginEmail: email ? email.trim().toLowerCase() : undefined },
      activeTournaments: 0,
      totalTournaments: 0,
    }

    OFFICIAL_CREATORS.push(newCreator)

    const creatorEmail = (
      email || `${newCreator.handle.replace(/[@._]/g, '')}@partner.rdk`
    ).trim().toLowerCase()

    const creatorUser: UserRecord = {
      id: `usr_${Date.now()}`,
      name,
      email: creatorEmail,
      role: 'official_partner',
      organizationId: newCreator.id,
      organizationName,
      creatorProfile: newCreator,
      password: password || 'password123',
      phone: phone || undefined,
      createdAt: new Date().toISOString(),
    }

    // Replace any existing user with this email to avoid stale role
    USERS = USERS.filter(
      (u) => u.email.toLowerCase() !== creatorEmail && u.organizationId !== newCreator.id
    )
    USERS.push(creatorUser)

    if (isDatabaseConfigured) {
      prisma.officialCreator.create({
        data: {
          id: newCreator.id,
          name: newCreator.name,
          handle: newCreator.handle,
          organizationName: newCreator.organizationName,
          avatar: newCreator.avatar,
          bio: newCreator.bio,
          subscribers: newCreator.subscribers,
          verified: newCreator.verified,
          status: 'active',
          isDeleted: false,
          email: creatorEmail,
          phone: phone || null,
          games: JSON.stringify(newCreator.games),
          socials: JSON.stringify(newCreator.socials),
        },
      }).catch((err) => console.error('[Database] Notice saving partner to DB:', err))

      prisma.user.upsert({
        where: { email: creatorEmail },
        update: {
          name,
          role: 'official_partner',
          organizationId: newCreator.id,
          organizationName,
          phone: phone || null,
          ...(password ? { password } : {}),
        },
        create: {
          id: creatorUser.id,
          name,
          email: creatorEmail,
          role: 'official_partner',
          password: password || 'password123',
          organizationId: newCreator.id,
          organizationName,
          phone: phone || null,
        },
      }).catch((err) => console.error('[Database] Notice upserting partner user:', err))
    }

    logAuditEvent({
      action: 'PARTNER_CREATED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `Official Partner ${newCreator.name} (${newCreator.organizationName}) created.`,
    })

    return res.status(201).json({ success: true, creator: newCreator })
  } catch (error) {
    console.error('Error creating partner:', error)
    return res.status(500).json({ error: 'Internal server error while creating partner' })
  }
})

// 4b. Permanent Delete of an Official Partner (Super Admin only - removes from platform & landing page)
app.delete('/api/creators/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const partner = OFFICIAL_CREATORS.find((c) => c.id === id)

    // Remove from in-memory arrays
    OFFICIAL_CREATORS = OFFICIAL_CREATORS.filter((c) => c.id !== id)
    USERS = USERS.filter(
      (u) =>
        u.organizationId !== id &&
        u.id !== id &&
        (!partner?.socials?.loginEmail || u.email?.toLowerCase() !== partner.socials.loginEmail.toLowerCase())
    )

    // Reassign any tournaments created by this partner to platform head so tournament records remain valid
    TOURNAMENTS.forEach((t) => {
      if (t.creatorId === id) {
        t.creatorId = 'rdk_head'
        t.creatorName = 'RDK Esports'
        t.creatorHandle = '@rdkesports'
      }
    })

    if (isDatabaseConfigured) {
      await prisma.officialCreator.deleteMany({
        where: { id },
      }).catch(() => { })

      await prisma.user.deleteMany({
        where: {
          OR: [
            { organizationId: id },
            ...(partner?.socials?.loginEmail
              ? [{ email: { equals: partner.socials.loginEmail, mode: 'insensitive' as const } }]
              : []),
          ],
        },
      }).catch(() => { })

      await prisma.tournament.updateMany({
        where: { creatorId: id },
        data: {
          creatorId: 'rdk_head',
          creatorName: 'RDK Esports',
          creatorHandle: '@rdkesports',
        },
      }).catch(() => { })
    }

    logAuditEvent({
      action: 'PARTNER_DELETED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `Official Partner "${partner?.name || id}" (${partner?.handle || ''}) permanently deleted from platform and landing page.`,
    })

    return res.json({
      success: true,
      message: `Official Partner "${partner?.name || id}" deleted successfully and removed from landing page.`,
    })
  } catch (error) {
    console.error('Error deleting partner:', error)
    return res.status(500).json({ error: 'Failed to delete partner' })
  }
})

// 4c. Toggle Partner Status (Activate / Suspend / Deactivate - Super Admin only)
app.patch('/api/creators/:id/status', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const { status } = req.body
    if (!['active', 'suspended', 'deactivated'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be active, suspended, or deactivated.' })
    }

    const partner = OFFICIAL_CREATORS.find((c) => c.id === id)
    if (!partner) {
      return res.status(404).json({ error: 'Official Partner not found' })
    }

    const oldStatus = partner.status || 'active'
    partner.status = status
    if (status === 'active') partner.isDeleted = false

    const user = USERS.find((u) => u.organizationId === id || (u.email && u.email.toLowerCase() === partner.socials?.loginEmail?.toLowerCase()))
    if (user) {
      (user as any).status = status
      if (status === 'active') user.isDeleted = false
    }

    if (isDatabaseConfigured) {
      await prisma.officialCreator.updateMany({
        where: { id },
        data: { status, isDeleted: status === 'deactivated' },
      }).catch(() => { })
      await prisma.user.updateMany({
        where: { organizationId: id },
        data: { status, isDeleted: status === 'deactivated' },
      }).catch(() => { })
    }

    logAuditEvent({
      action: 'PARTNER_STATUS_CHANGED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      oldValue: oldStatus,
      newValue: status,
      details: `Official Partner "${partner.name}" status changed from ${oldStatus} to ${status}.`,
    })

    return res.json({
      success: true,
      message: `Partner status updated to ${status}.`,
      partner,
    })
  } catch (error) {
    console.error('Error updating partner status:', error)
    return res.status(500).json({ error: 'Failed to update partner status' })
  }
})

// 4d. Reset Partner Access Credentials (Super Admin only)
app.post('/api/creators/:id/reset-access', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const { newPassword } = req.body

    const partner = OFFICIAL_CREATORS.find((c) => c.id === id)
    if (!partner) {
      return res.status(404).json({ error: 'Official Partner not found' })
    }

    const passwordToSet = newPassword || `rdk#${Math.floor(1000 + Math.random() * 9000)}`

    const user = USERS.find((u) => u.organizationId === id || (u.email && u.email.toLowerCase() === partner.socials?.loginEmail?.toLowerCase()))
    if (user) {
      user.password = passwordToSet
      user.status = 'active'
      user.isDeleted = false
    }

    if (isDatabaseConfigured) {
      await prisma.user.updateMany({
        where: { organizationId: id },
        data: { password: passwordToSet, status: 'active', isDeleted: false },
      }).catch(() => { })
    }

    logAuditEvent({
      action: 'PARTNER_ACCESS_RESET',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `Access credentials reset for Official Partner "${partner.name}".`,
    })

    return res.json({
      success: true,
      message: `Credentials reset successfully for "${partner.name}".`,
      email: user?.email || partner.socials?.loginEmail,
      temporaryPassword: passwordToSet,
    })
  } catch (error) {
    console.error('Error resetting partner access:', error)
    return res.status(500).json({ error: 'Failed to reset partner access' })
  }
})

// 4e. Update / Edit an Official Partner (Super Admin or Partner self)
const updateCreatorHandler = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const { name, handle, organizationName, bio, subscribers, games, socials, avatar, email, password, phone } = req.body

    const creatorIndex = OFFICIAL_CREATORS.findIndex(
      (c) =>
        c.id === id ||
        c.handle.toLowerCase().replace('@', '') === id.toLowerCase().replace('@', '') ||
        (c.socials?.loginEmail && c.socials.loginEmail.toLowerCase() === id.toLowerCase())
    )
    if (creatorIndex === -1) {
      return res.status(404).json({ error: 'Partner not found' })
    }

    const current = OFFICIAL_CREATORS[creatorIndex]
    const updatedCreator: OfficialCreator = {
      ...current,
      name: name !== undefined ? name.trim() : current.name,
      handle: handle !== undefined ? (handle.startsWith('@') ? handle.trim() : `@${handle.trim()}`) : current.handle,
      organizationName: organizationName !== undefined ? organizationName.trim() : current.organizationName,
      avatar: avatar !== undefined && avatar.trim() ? avatar.trim() : current.avatar,
      bio: bio !== undefined ? bio : current.bio,
      subscribers: subscribers !== undefined ? subscribers : current.subscribers,
      games: Array.isArray(games) ? games : current.games,
      socials: socials !== undefined ? socials : current.socials,
      email: email ? email.trim().toLowerCase() : current.email,
      phone: phone !== undefined ? phone : current.phone,
    }

    OFFICIAL_CREATORS[creatorIndex] = updatedCreator

    // Update corresponding user record
    const userIndex = USERS.findIndex(
      (u) =>
        u.organizationId === current.id ||
        (u.email && u.email.toLowerCase() === current.socials?.loginEmail?.toLowerCase())
    )
    if (userIndex !== -1) {
      USERS[userIndex].name = updatedCreator.name
      USERS[userIndex].organizationName = updatedCreator.organizationName
      USERS[userIndex].creatorProfile = updatedCreator
      if (updatedCreator.avatar) (USERS[userIndex] as any).avatar = updatedCreator.avatar
      if (email) USERS[userIndex].email = email.trim().toLowerCase()
      if (password) USERS[userIndex].password = password
      if (phone) USERS[userIndex].phone = phone
    }

    if (isDatabaseConfigured) {
      await prisma.officialCreator.updateMany({
        where: { id: current.id },
        data: {
          name: updatedCreator.name,
          handle: updatedCreator.handle,
          organizationName: updatedCreator.organizationName,
          avatar: updatedCreator.avatar,
          bio: updatedCreator.bio,
          subscribers: updatedCreator.subscribers,
          phone: updatedCreator.phone || null,
          games: JSON.stringify(updatedCreator.games),
          socials: JSON.stringify(updatedCreator.socials),
        },
      }).catch((err) => console.error('[Database] Notice updating partner:', err))

      await prisma.user.updateMany({
        where: { organizationId: current.id },
        data: {
          name: updatedCreator.name,
          organizationName: updatedCreator.organizationName,
          phone: updatedCreator.phone || null,
          ...(email ? { email: email.trim().toLowerCase() } : {}),
          ...(password ? { password } : {}),
        },
      }).catch((err) => console.error('[Database] Notice updating partner user in DB:', err))
    }

    logAuditEvent({
      action: 'PARTNER_UPDATED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `Official Partner "${updatedCreator.name}" profile updated.`,
    })

    return res.json({ success: true, creator: updatedCreator })
  } catch (error) {
    console.error('Error updating partner:', error)
    return res.status(500).json({ error: 'Failed to update partner' })
  }
}

app.put('/api/creators/:id', requirePartnerOrAdmin, updateCreatorHandler)
app.patch('/api/creators/:id', requirePartnerOrAdmin, updateCreatorHandler)


// 5. Creator Ambassador Management Desk (Created ONLY by Official Creators)
app.get('/api/creators/ambassadors', async (_req: Request, res: Response) => {
  try {
    const list: AmbassadorRecord[] = [...AMBASSADORS]

    // 1. If database is configured, load any ambassadors saved in PostgreSQL
    if (isDatabaseConfigured) {
      try {
        const dbAmbs = await prisma.ambassador.findMany()
        for (const da of dbAmbs) {
          if (!list.some((a) => a.id === da.id || a.email.toLowerCase() === da.email.toLowerCase())) {
            list.push({
              id: da.id,
              name: da.name,
              email: da.email,
              creatorId: da.creatorId,
              tournamentId: da.tournamentId,
              tournamentName: da.tournamentName,
              assignedTeamRange: da.assignedTeamRange,
              phone: da.phone || undefined,
              createdAt: da.createdAt.toISOString(),
            })
          }
        }
      } catch (dbErr) {
        console.warn('[Database] Notice loading ambassadors:', dbErr)
      }
    }

    // 2. Include any ephemeral franchise bidders generated for auctions by creators
    for (const b of EPHEMERAL_BIDDERS) {
      if (b.status === 'active' && !list.some((a) => a.id === b.id || a.email.toLowerCase() === b.loginCode.toLowerCase())) {
        const tourney = TOURNAMENTS.find((t) => t.id === b.auctionId || t.slug === b.auctionId)
        list.push({
          id: b.id,
          name: `${b.teamName} (Franchise Bidder)`,
          email: b.loginCode,
          creatorId: tourney?.creatorId || 'creator',
          tournamentId: b.auctionId,
          tournamentName: tourney?.name || 'Auction Tournament',
          assignedTeamRange: b.teamName,
          phone: '',
          createdAt: b.createdAt,
        })
      }
    }

    // 3. Dynamically include any ambassador entered on registered teams by the creator
    for (const tm of REGISTERED_TEAMS) {
      if (tm.ambassadorName && tm.ambassadorName.trim()) {
        const ambName = tm.ambassadorName.trim()
        const exists = list.some(
          (a) =>
            a.name.toLowerCase() === ambName.toLowerCase() ||
            (a.tournamentId === tm.tournamentId && a.assignedTeamRange.toLowerCase() === tm.name.toLowerCase())
        )
        if (!exists) {
          const cleanSlug = ambName.toLowerCase().replace(/[^a-z0-9]/g, '')
          const tourney = TOURNAMENTS.find((t) => t.id === tm.tournamentId || t.slug === tm.tournamentId)
          list.push({
            id: tm.ambassadorId || `amb_${tm.tournamentId}_${cleanSlug}`,
            name: ambName,
            email: `${cleanSlug}@rdkesports.in`,
            creatorId: tourney?.creatorId || 'creator',
            tournamentId: tm.tournamentId,
            tournamentName: tourney?.name || 'Tournament',
            assignedTeamRange: tm.name,
            phone: '',
            createdAt: tm.registeredAt,
          })
        }
      }
    }

    return res.json(list)
  } catch (err: any) {
    return res.json(AMBASSADORS)
  }
})

app.post('/api/creators/ambassadors', async (req: Request, res: Response) => {
  try {
    const { name, email, password, tournamentId, tournamentName, assignedTeamRange, phone, creatorId } = req.body

    if (!name || !email || !tournamentId) {
      return res.status(400).json({ error: 'Name, email, and tournament are required' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const existing = USERS.find((u) => u.email.toLowerCase() === normalizedEmail)
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }

    const newAmbassador: AmbassadorRecord = {
      id: `amb_${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      creatorId: creatorId || 'cr_clashers',
      tournamentId,
      tournamentName: tournamentName || 'Tournament',
      assignedTeamRange: assignedTeamRange?.trim() || 'Live Auction Bidder',
      phone: phone || '',
      createdAt: new Date().toISOString(),
    }

    AMBASSADORS.push(newAmbassador)

    // Save to PostgreSQL if available
    if (isDatabaseConfigured) {
      try {
        await prisma.ambassador.create({
          data: {
            id: newAmbassador.id,
            name: newAmbassador.name,
            email: newAmbassador.email,
            creatorId: newAmbassador.creatorId,
            tournamentId: newAmbassador.tournamentId,
            tournamentName: newAmbassador.tournamentName,
            assignedTeamRange: newAmbassador.assignedTeamRange,
            phone: newAmbassador.phone || null,
          },
        })
      } catch (dbErr) {
        console.warn('[Database] Notice saving ambassador to DB:', dbErr)
      }
    }

    // Provision the ambassador user login
    const ambUser: UserRecord = {
      id: newAmbassador.id,
      name: newAmbassador.name,
      email: normalizedEmail,
      role: 'ambassador',
      organizationId: newAmbassador.creatorId,
      password: password || 'password123',
      createdAt: new Date().toISOString(),
    }
    USERS.push(ambUser)

    return res.status(201).json({ success: true, ambassador: newAmbassador })
  } catch (error) {
    console.error('Error provisioning ambassador:', error)
    return res.status(500).json({ error: 'Internal server error while creating ambassador' })
  }
})

app.patch('/api/creators/ambassadors/:id', updateAmbassadorHandler)
app.put('/api/creators/ambassadors/:id', updateAmbassadorHandler)

async function updateAmbassadorHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const { name, email, password, assignedTeamRange, phone, allocatedPurse } = req.body

    let amb = AMBASSADORS.find((a) => a.id === id || a.email.toLowerCase() === id.toLowerCase())
    const oldEmail = amb?.email || id
    const oldName = amb?.name || ''
    const oldTeam = amb?.assignedTeamRange || ''

    const normalizedEmail = email ? String(email).trim().toLowerCase() : (oldEmail ? oldEmail.toLowerCase() : '')

    // Check if new email is taken by another user
    if (normalizedEmail && normalizedEmail !== oldEmail.toLowerCase()) {
      const emailConflict = USERS.find(
        (u) => u.email.toLowerCase() === normalizedEmail && u.id !== id && (!amb || u.id !== amb.id)
      )
      if (emailConflict) {
        return res.status(409).json({ error: 'An account with this email already exists' })
      }
    }

    if (!amb) {
      // Check ephemeral bidders or tournaments if dynamic
      const bidder = EPHEMERAL_BIDDERS.find(
        (b) => b.id === id || b.loginCode.toLowerCase() === id.toLowerCase() || b.loginCode.toLowerCase() === oldEmail.toLowerCase()
      )
      const tourney = bidder ? TOURNAMENTS.find((t) => t.id === bidder.auctionId || t.slug === bidder.auctionId) : undefined

      amb = {
        id,
        name: name ? String(name).trim() : (bidder ? `${bidder.teamName} (Franchise Bidder)` : 'Ambassador'),
        email: normalizedEmail || (bidder ? bidder.loginCode : `${id}@auction.rdk`),
        creatorId: tourney?.creatorId || 'creator',
        tournamentId: bidder?.auctionId || '',
        tournamentName: tourney?.name || 'Auction Tournament',
        assignedTeamRange: assignedTeamRange ? String(assignedTeamRange).trim() : (bidder?.teamName || 'Live Auction Bidder'),
        phone: phone ? String(phone).trim() : '',
        createdAt: new Date().toISOString(),
      }
      AMBASSADORS.push(amb)
    } else {
      if (name) amb.name = String(name).trim()
      if (normalizedEmail) amb.email = normalizedEmail
      if (assignedTeamRange !== undefined) amb.assignedTeamRange = String(assignedTeamRange).trim()
      if (phone !== undefined) amb.phone = String(phone).trim()
    }

    // Update matching EPHEMERAL_BIDDERS
    const bidder = EPHEMERAL_BIDDERS.find(
      (b) =>
        b.id === id ||
        b.loginCode.toLowerCase() === oldEmail.toLowerCase() ||
        (normalizedEmail && b.loginCode.toLowerCase() === normalizedEmail) ||
        (oldTeam && b.teamName.toLowerCase() === oldTeam.toLowerCase())
    )
    if (bidder) {
      if (assignedTeamRange) bidder.teamName = String(assignedTeamRange).trim()
      if (normalizedEmail) bidder.loginCode = normalizedEmail
      if (password && String(password).trim()) bidder.passkey = String(password).trim()
      if (allocatedPurse !== undefined && !isNaN(Number(allocatedPurse))) {
        bidder.allocatedPurse = Number(allocatedPurse)
      }
    }

    // Update or upsert matching UserRecord in USERS
    let userRec = USERS.find(
      (u) =>
        u.id === id ||
        (amb && u.id === amb.id) ||
        (oldEmail && u.email.toLowerCase() === oldEmail.toLowerCase()) ||
        (normalizedEmail && u.email.toLowerCase() === normalizedEmail)
    )

    if (userRec) {
      if (name) userRec.name = String(name).trim()
      if (normalizedEmail) userRec.email = normalizedEmail
      if (assignedTeamRange) {
        userRec.teamName = String(assignedTeamRange).trim()
        userRec.organizationName = String(assignedTeamRange).trim()
      }
      if (phone !== undefined) userRec.phone = String(phone).trim()
      if (password && String(password).trim()) userRec.password = String(password).trim()
      if (allocatedPurse !== undefined && !isNaN(Number(allocatedPurse))) {
        userRec.allocatedPurse = Number(allocatedPurse)
      }
    } else {
      userRec = {
        id: amb.id,
        name: amb.name,
        email: amb.email,
        role: 'ambassador',
        organizationId: amb.creatorId,
        password: password && String(password).trim() ? String(password).trim() : 'password123',
        teamName: amb.assignedTeamRange,
        organizationName: amb.assignedTeamRange,
        phone: amb.phone,
        allocatedPurse: allocatedPurse !== undefined && !isNaN(Number(allocatedPurse)) ? Number(allocatedPurse) : 150000,
        createdAt: new Date().toISOString(),
      }
      USERS.push(userRec)
    }

    // Update in REGISTERED_TEAMS if any team is assigned to this ambassador or matches old name
    for (const tm of REGISTERED_TEAMS) {
      if (
        tm.ambassadorId === id ||
        (amb && tm.ambassadorId === amb.id) ||
        (oldName && tm.ambassadorName?.toLowerCase() === oldName.toLowerCase()) ||
        (oldTeam && tm.name?.toLowerCase() === oldTeam.toLowerCase())
      ) {
        if (name) tm.ambassadorName = String(name).trim()
        if (assignedTeamRange) tm.name = String(assignedTeamRange).trim()
      }
    }

    // Update in database if configured
    if (isDatabaseConfigured) {
      try {
        await prisma.ambassador.upsert({
          where: { id: amb.id },
          update: {
            name: amb.name,
            email: amb.email,
            assignedTeamRange: amb.assignedTeamRange,
            phone: amb.phone || null,
          },
          create: {
            id: amb.id,
            name: amb.name,
            email: amb.email,
            creatorId: amb.creatorId,
            tournamentId: amb.tournamentId,
            tournamentName: amb.tournamentName,
            assignedTeamRange: amb.assignedTeamRange,
            phone: amb.phone || null,
          },
        }).catch(() => {})

        await prisma.user.updateMany({
          where: {
            OR: [
              { id: amb.id },
              ...(oldEmail ? [{ email: { equals: oldEmail, mode: 'insensitive' as const } }] : []),
              ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: 'insensitive' as const } }] : []),
            ],
          },
          data: {
            name: amb.name,
            email: amb.email,
            phone: amb.phone || null,
            ...(password && String(password).trim() ? { password: String(password).trim() } : {}),
          },
        }).catch(() => {})
      } catch (dbErr) {
        console.warn('[Database] Notice updating ambassador in DB:', dbErr)
      }
    }

    return res.json({ success: true, message: 'Ambassador details updated successfully', ambassador: amb })
  } catch (error) {
    console.error('Error updating ambassador:', error)
    return res.status(500).json({ error: 'Internal server error while updating ambassador' })
  }
}

app.delete('/api/creators/ambassadors/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const targetAmb = AMBASSADORS.find((a) => a.id === id)
  const oldEmail = targetAmb?.email || ''

  AMBASSADORS = AMBASSADORS.filter((a) => a.id !== id)
  USERS = USERS.filter((u) => u.id !== id && (!oldEmail || u.email.toLowerCase() !== oldEmail.toLowerCase()))
  EPHEMERAL_BIDDERS = EPHEMERAL_BIDDERS.filter((b) => b.id !== id && (!oldEmail || b.loginCode.toLowerCase() !== oldEmail.toLowerCase()))

  if (isDatabaseConfigured) {
    try {
      await prisma.ambassador.delete({ where: { id } }).catch(() => { })
    } catch { }
  }

  return res.json({ success: true, message: 'Ambassador revoked successfully' })
})

// 8. Tournament Management & Public Endpoints
app.get('/api/tournaments', (req: Request, res: Response) => {
  const { creatorId, game, status } = req.query
  let list = TOURNAMENTS.map((t) => {
    const isAuction =
      t.format === 'Auction Tournament' ||
      String(t.format || '').toLowerCase().includes('auction') ||
      t.type === 'AUCTION TOURNAMENT'

    const currentCandidates = AUCTION_PLAYERS.filter(
      (p) => p.auctionId === t.id || p.tournamentId === t.id
    ).length
    const currentTeams = REGISTERED_TEAMS.filter((rt) => rt.tournamentId === t.id).length
    const enrolled = isAuction
      ? Math.max(currentCandidates, currentTeams, t.registeredTeamsCount || 0, t.teams || 0)
      : Math.max(currentTeams, t.registeredTeamsCount || 0, t.teams || 0)

    const statusNormalized = String(t.status || '').toLowerCase()
    const isEnded =
      statusNormalized === 'completed' ||
      statusNormalized === 'finished' ||
      statusNormalized === 'closed' ||
      statusNormalized === 'ended' ||
      Boolean(t.isClosed) ||
      Boolean(t.closedAt) ||
      (t.endDate ? new Date(t.endDate).getTime() < Date.now() : false) ||
      (t.registrationClosing ? new Date(t.registrationClosing).getTime() < Date.now() : false)

    const computedStatus = isEnded ? 'completed' : t.status

    return {
      ...t,
      teams: enrolled,
      registeredTeamsCount: enrolled,
      status: computedStatus,
    }
  })

  if (creatorId) list = list.filter((t) => t.creatorId === creatorId)
  if (game) list = list.filter((t) => t.game.toLowerCase() === String(game).toLowerCase())
  if (status) {
    const sLower = String(status).toLowerCase()
    list = list.filter((t) => String(t.status || '').toLowerCase() === sLower)
  }
  res.json(list)
})

app.get('/api/tournaments/stats', (_req: Request, res: Response) => {
  // Compute dynamic stats
  const activeCount = TOURNAMENTS.filter((t) => t.status === 'live' || t.status === 'registration_open').length
  const totalTeams = REGISTERED_TEAMS.length
  const pendingPays = PAYMENT_SUBMISSIONS.filter((p) => p.status === 'pending').length
  const dynamicStats = [
    { label: 'Active tournaments', value: String(activeCount), hint: `${TOURNAMENTS.filter(t => t.status === 'live').length} live now` },
    { label: 'Registered teams', value: String(totalTeams), hint: `across all events` },
    { label: 'Pending payments', value: String(pendingPays), hint: `${pendingPays} to verify`, warn: pendingPays > 0 },
    { label: 'Active ambassadors', value: String(AMBASSADORS.length), hint: 'created by creators' },
  ]
  res.json(dynamicStats)
})

// Create New Tournament (Official Partner / Super Admin)
app.post('/api/tournaments', requirePartnerOrAdmin, (req: Request, res: Response) => {
  try {
    const {
      name,
      type = 'BR TOURNAMENT',
      game,
      format,
      maxTeams = 32,
      maxSlots,
      entryType = 'per_team',
      prizePool = '₹10,000',
      entryFee = 'Free',
      startDate,
      endDate,
      registrationOpening,
      registrationClosing,
      banner,
      upiId,
      upiName,
      upiQrUrl,
      rules,
      creatorName = 'Official Partner',
      creatorHandle = '@creator',
      creatorId = 'cr_clashers',
    } = req.body

    if (!name || !game || !format) {
      return res.status(400).json({ error: 'Tournament name, game, and format are required' })
    }

    const id = `t_${Date.now()}`
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `tourney-${id}`

    // Find creator partner
    const callerPartnerId = req.user?.organizationId || creatorId
    const creator = OFFICIAL_CREATORS.find((c) => c.id === callerPartnerId) || OFFICIAL_CREATORS[0]

    // Default banner if not provided
    const bannerUrl =
      banner ||
      (game === 'BGMI'
        ? 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80'
        : game === 'Valorant'
          ? 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=1200&q=80'
          : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80')

    const newTournament: TournamentRecord = {
      id,
      slug,
      name: name.trim(),
      type,
      entryType,
      maxSlots: maxSlots ? Number(maxSlots) : undefined,
      creatorId: creator?.id || callerPartnerId,
      creatorName: creator?.name || creatorName,
      creatorHandle: creator?.handle || creatorHandle,
      creatorAvatar: creator?.avatar,
      game,
      format,
      banner: bannerUrl,
      teams: 0,
      maxTeams: Number(maxTeams) || 32,
      status: 'registration_open',
      settlementStatus: 'PENDING',
      isClosed: false,
      startDate: startDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      endDate: endDate || undefined,
      registrationOpening: registrationOpening || undefined,
      registrationClosing: registrationClosing || undefined,
      prizePool: prizePool.startsWith('₹') ? prizePool : `₹${prizePool}`,
      entryFee: entryFee.toLowerCase().includes('free') ? 'Free' : (entryFee.startsWith('₹') ? entryFee : `₹${entryFee}`),
      registeredTeamsCount: 0,
      isFeatured: true,
      roomPublished: false,
      upiId: upiId || (entryFee !== 'Free' ? 'rdkesports@upi' : undefined),
      upiName: upiName || (entryFee !== 'Free' ? 'RDK Esports Org' : undefined),
      upiQrUrl: upiQrUrl || (upiId ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName || 'Tournament')}&cu=INR` : undefined),
      rules: rules || '1. Standard fair play rules apply.\n2. Room details will be released 15 minutes before the match start.',
      createdAt: new Date().toISOString(),
    }

    TOURNAMENTS.unshift(newTournament)
    console.log(`[Tournaments] Created new tournament: ${newTournament.name} (${newTournament.id}) - Type: ${newTournament.type}`)

    logAuditEvent({
      tournamentId: newTournament.id,
      action: 'TOURNAMENT_CREATED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `Created new tournament "${newTournament.name}" of type ${newTournament.type} with entry fee ${newTournament.entryFee}.`,
    })

    if (isDatabaseConfigured) {
      prisma.tournament
        .create({
          data: {
            id: newTournament.id,
            slug: newTournament.slug,
            name: newTournament.name,
            type: newTournament.type,
            entryType: newTournament.entryType,
            creatorId: newTournament.creatorId,
            creatorName: newTournament.creatorName,
            creatorHandle: newTournament.creatorHandle,
            creatorAvatar: newTournament.creatorAvatar,
            game: newTournament.game,
            format: newTournament.format,
            banner: newTournament.banner,
            teams: newTournament.teams,
            maxTeams: newTournament.maxTeams,
            status: newTournament.status,
            settlementStatus: 'PENDING',
            isClosed: false,
            startDate: newTournament.startDate,
            prizePool: newTournament.prizePool,
            entryFee: newTournament.entryFee,
            registeredTeamsCount: newTournament.registeredTeamsCount,
            isFeatured: newTournament.isFeatured || false,
            roomPublished: false,
            upiId: newTournament.upiId,
            upiName: newTournament.upiName,
            upiQrUrl: newTournament.upiQrUrl,
            rules: newTournament.rules,
            roadmap: newTournament.roadmap ? JSON.stringify(newTournament.roadmap) : null,
            streamUrl: newTournament.streamUrl,
            streamTitle: newTournament.streamTitle,
            streamStatus: newTournament.streamStatus || 'offline',
            scheduledMatchInfo: newTournament.scheduledMatchInfo,
            streamPlatform: newTournament.streamPlatform,
          },
        })
        .catch((err) => console.error('[Database] Failed to persist tournament:', err))
    }

    return res.status(201).json({ success: true, tournament: newTournament })
  } catch (error) {
    console.error('Error creating tournament:', error)
    return res.status(500).json({ error: 'Failed to create tournament' })
  }
})

// Get Single Tournament Details (With Data Privacy Protection for normal users)
app.get('/api/tournaments/:id', async (req: Request, res: Response) => {
  const tourneyId = String(req.params.id)
  let tourney = TOURNAMENTS.find((t) => t.id === tourneyId || t.slug === tourneyId)

  if (isDatabaseConfigured) {
    const dbT = await prisma.tournament.findFirst({
      where: { OR: [{ id: tourneyId }, { slug: tourneyId }] },
    }).catch(() => null)
    if (dbT) {
      if (!tourney) {
        tourney = {
          ...dbT,
          creatorId: dbT.creatorId || undefined,
          creatorAvatar: dbT.creatorAvatar || undefined,
          upiId: dbT.upiId || undefined,
          upiName: dbT.upiName || undefined,
          upiQrUrl: dbT.upiQrUrl || undefined,
          rules: dbT.rules || undefined,
          roomId: dbT.roomId || undefined,
          roomPassword: dbT.roomPassword || undefined,
          streamUrl: dbT.streamUrl || undefined,
          streamTitle: dbT.streamTitle || undefined,
          scheduledMatchInfo: dbT.scheduledMatchInfo || undefined,
          status: dbT.status as any,
          roadmap: dbT.roadmap ? JSON.parse(dbT.roadmap) : undefined,
          streamStatus: dbT.streamStatus as any,
          streamPlatform: dbT.streamPlatform as any,
        }
        TOURNAMENTS.push(tourney)
      } else {
        if (dbT.roadmap) {
          try {
            tourney.roadmap = JSON.parse(dbT.roadmap)
          } catch {}
        }
        if (dbT.status) tourney.status = dbT.status as any
        if (dbT.prizePool) tourney.prizePool = dbT.prizePool
        if (dbT.entryFee) tourney.entryFee = dbT.entryFee
        if (dbT.banner) tourney.banner = dbT.banner
        if (dbT.roomId !== undefined) tourney.roomId = dbT.roomId || undefined
        if (dbT.roomPassword !== undefined) tourney.roomPassword = dbT.roomPassword || undefined
        if (dbT.roomPublished !== undefined) tourney.roomPublished = dbT.roomPublished
        if (dbT.streamUrl !== undefined) tourney.streamUrl = dbT.streamUrl || undefined
        if (dbT.streamTitle !== undefined) tourney.streamTitle = dbT.streamTitle || undefined
        if (dbT.streamStatus !== undefined) tourney.streamStatus = dbT.streamStatus as any
        if (dbT.rules !== undefined) tourney.rules = dbT.rules || undefined
      }
    }
  }

  if (!tourney) {
    return res.status(404).json({ error: 'Tournament not found' })
  }

  // Calculate live authoritative finances
  const finances = calculateTournamentFinances(tourney)

  const isStaffOrAdmin =
    req.user &&
    (req.user.role === 'super_admin' ||
      req.user.organizationId === tourney.creatorId ||
      req.user.id === tourney.creatorId ||
      req.user.tournamentId === tourney.id ||
      req.user.auctionId === tourney.id)

  const rawTeams = REGISTERED_TEAMS.filter((t) => t.tournamentId === tourney.id)

  // PRIVACY MASKING: Normal users/public viewers cannot see phone numbers, emails, or payment proofs
  const sanitizedTeams = isStaffOrAdmin
    ? rawTeams
    : rawTeams.map((t) => ({
      id: t.id,
      name: t.name,
      captainName: t.captainName,
      captainIgn: t.captainIgn,
      players: t.players,
      status: t.status,
      group: t.group,
      ambassadorId: t.ambassadorId,
      ambassadorName: t.ambassadorName,
      role: t.role,
      experience: t.experience,
      achievements: t.achievements,
      clipUrl: t.clipUrl,
      registeredAt: t.registeredAt,
      // Captain phone, email, and paymentProof are omitted for privacy
    }))

  const isAuction =
    tourney.format === 'Auction Tournament' ||
    String(tourney.format || '').toLowerCase().includes('auction') ||
    tourney.type === 'AUCTION TOURNAMENT'

  const currentCandidates = AUCTION_PLAYERS.filter(
    (p) => p.auctionId === tourney.id || p.tournamentId === tourney.id
  ).length
  const enrolled = isAuction
    ? Math.max(currentCandidates, rawTeams.length, tourney.registeredTeamsCount || 0, tourney.teams || 0)
    : Math.max(rawTeams.length, tourney.registeredTeamsCount || 0, tourney.teams || 0)

  tourney.teams = enrolled
  tourney.registeredTeamsCount = enrolled

  return res.json({
    tournament: {
      ...tourney,
      teams: enrolled,
      registeredTeamsCount: enrolled,
      grossRevenue: finances.grossRevenue,
      rdkFee: finances.rdkFee,
      partnerNet: finances.partnerNet,
      settlementStatus: finances.settlementStatus,
      // Mask room credentials if not published and caller is not staff
      roomId: tourney.roomPublished || isStaffOrAdmin ? tourney.roomId : undefined,
      roomPassword: tourney.roomPublished || isStaffOrAdmin ? tourney.roomPassword : undefined,
    },
    teams: sanitizedTeams,
    finances: isStaffOrAdmin ? finances : undefined,
  })
})

// Update Tournament Details / Status (With Closure Gatekeeper)
app.patch('/api/tournaments/:id', requirePartnerOrAdmin, (req: Request, res: Response) => {
  const { id } = req.params
  const index = TOURNAMENTS.findIndex((t) => t.id === id || t.slug === id)
  if (index === -1) {
    return res.status(404).json({ error: 'Tournament not found' })
  }

  const tourney = TOURNAMENTS[index]

  // Enforce ownership: only Super Admin or the partner/creator who owns the tournament can update it
  if (req.user?.role !== 'super_admin') {
    const isOwner =
      (req.user?.organizationId && tourney.creatorId === req.user.organizationId) ||
      (req.user?.id && tourney.creatorId === req.user.id) ||
      (tourney.creatorName && req.user?.name && tourney.creatorName.toLowerCase() === req.user.name.toLowerCase())
    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden: You can only edit tournaments created by your organization.' })
    }
  }

  // Read-only Lock: Once tournament is permanently closed, only Super Admin can edit it
  if (tourney.isClosed && req.user?.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Tournament is closed and archived in read-only mode. Only Super Admin can modify closed tournaments.',
    })
  }

  const newStatus = req.body.status

  const isClosing =
    newStatus === 'CLOSED' ||
    newStatus === 'closed' ||
    newStatus === 'completed' ||
    req.body.isClosed === true

  // ═══════════════════════════════════════════════════════════════
  // STATUS LOCK: Once COMPLETED/CLOSED, ONLY Super Admin can reopen to an active state
  // ═══════════════════════════════════════════════════════════════
  const currentStatusNormalized = String(tourney.status || '').toLowerCase()
  const isCurrentlyCompleted = currentStatusNormalized === 'completed' || currentStatusNormalized === 'closed'
  const isTargetCompleted = newStatus && (newStatus.toLowerCase() === 'completed' || newStatus.toLowerCase() === 'closed')
  if (isCurrentlyCompleted && newStatus && !isTargetCompleted && newStatus.toLowerCase() !== currentStatusNormalized) {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Tournament is marked as COMPLETED. Once completed, only a Super Admin can reopen or modify tournament status.',
      })
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CLOSURE GATEKEEPER: Settlement must be VERIFIED before completing or closing
  // ═══════════════════════════════════════════════════════════════
  if (isClosing) {
    const finances = calculateTournamentFinances(tourney)
    if (finances.grossRevenue > 0 && finances.settlementStatus !== 'VERIFIED') {
      if (req.user?.role !== 'super_admin') {
        return res.status(400).json({
          error: `Closure Gatekeeper: Tournament cannot be marked as COMPLETED or CLOSED until the RDK 10% platform fee settlement (₹${finances.rdkFee.toLocaleString()}) has been submitted with screenshot proof and officially VERIFIED by RDK Super Admin. Current settlement status: ${finances.settlementStatus}.`,
          finances,
        })
      }
    }

    if (newStatus !== 'completed') {
      req.body.status = 'CLOSED'
    }
    req.body.isClosed = true
    req.body.closedAt = new Date().toISOString()

    logAuditEvent({
      tournamentId: tourney.id,
      action: 'TOURNAMENT_CLOSED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `Tournament "${tourney.name}" officially closed. Final Gross: ₹${finances.grossRevenue}, RDK Fee Paid: ₹${finances.rdkFee}. Tournament is now read-only.`,
    })
  } else if (newStatus && newStatus !== tourney.status) {
    logAuditEvent({
      tournamentId: tourney.id,
      action: 'TOURNAMENT_STATUS_UPDATED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      oldValue: String(tourney.status),
      newValue: String(newStatus),
      details: `Tournament "${tourney.name}" status transitioned to ${newStatus}.`,
    })
  }

  TOURNAMENTS[index] = { ...TOURNAMENTS[index], ...req.body }

  if (isDatabaseConfigured) {
    const updateData: any = {
      status: TOURNAMENTS[index].status,
      isClosed: TOURNAMENTS[index].isClosed || false,
      closedAt: TOURNAMENTS[index].closedAt ? new Date(TOURNAMENTS[index].closedAt as string) : null,
    }
    if (req.body.name) updateData.name = String(req.body.name).trim()
    if (req.body.game) updateData.game = String(req.body.game).trim()
    if (req.body.format) updateData.format = String(req.body.format).trim()
    if (req.body.maxTeams !== undefined) updateData.maxTeams = Number(req.body.maxTeams)
    if (req.body.entryFee !== undefined) updateData.entryFee = String(req.body.entryFee)
    if (req.body.prizePool !== undefined) updateData.prizePool = String(req.body.prizePool)
    if (req.body.startDate !== undefined) updateData.startDate = String(req.body.startDate)
    if (req.body.rules !== undefined) updateData.rules = String(req.body.rules)
    if (req.body.upiId !== undefined) updateData.upiId = String(req.body.upiId)
    if (req.body.upiName !== undefined) updateData.upiName = String(req.body.upiName)
    if (req.body.upiQrUrl !== undefined) updateData.upiQrUrl = String(req.body.upiQrUrl)

    prisma.tournament
      .updateMany({
        where: { id: tourney.id },
        data: updateData,
      })
      .catch((err) => console.error('[Database] Notice updating tournament in DB:', err))
  }

  return res.json({ success: true, tournament: TOURNAMENTS[index] })
})

// Delete Tournament (Super Admin or Tournament Owner Partner)
app.delete('/api/tournaments/:id', requirePartnerOrAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
    if (!tourney) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    if (req.user?.role !== 'super_admin') {
      const isOwner =
        (req.user?.organizationId && tourney.creatorId === req.user.organizationId) ||
        (req.user?.id && tourney.creatorId === req.user.id) ||
        (tourney.creatorName && req.user?.name && tourney.creatorName.toLowerCase() === req.user.name.toLowerCase())
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden: You can only delete tournaments owned by your organization.' })
      }
    }

    const tid = tourney.id

    // Remove from in-memory arrays
    TOURNAMENTS = TOURNAMENTS.filter((t) => t.id !== tid)
    REGISTERED_TEAMS = REGISTERED_TEAMS.filter((t) => t.tournamentId !== tid)
    PAYMENT_SUBMISSIONS = PAYMENT_SUBMISSIONS.filter((p) => p.tournamentId !== tid)
    AUCTION_PLAYERS = AUCTION_PLAYERS.filter((p) => p.tournamentId !== tid)
    EPHEMERAL_BIDDERS = EPHEMERAL_BIDDERS.filter((b) => b.auctionId !== tid)
    AMBASSADORS = AMBASSADORS.filter((a) => a.tournamentId !== tid)
    PLATFORM_SETTLEMENTS = PLATFORM_SETTLEMENTS.filter((s) => s.tournamentId !== tid)

    // Remove from database if configured
    if (isDatabaseConfigured) {
      await prisma.registeredTeam.deleteMany({ where: { tournamentId: tid } }).catch(() => { })
      await prisma.paymentSubmission.deleteMany({ where: { tournamentId: tid } }).catch(() => { })
      await prisma.auctionPlayer.deleteMany({ where: { tournamentId: tid } }).catch(() => { })
      await prisma.ephemeralAuctionBidder.deleteMany({ where: { auctionId: tid } }).catch(() => { })
      await prisma.ambassador.deleteMany({ where: { tournamentId: tid } }).catch(() => { })
      await prisma.platformSettlement.deleteMany({ where: { tournamentId: tid } }).catch(() => { })
      await prisma.auctionReversal.deleteMany({ where: { tournamentId: tid } }).catch(() => { })
      await prisma.platformAuditLog.deleteMany({ where: { tournamentId: tid } }).catch(() => { })
      await prisma.tournament.deleteMany({ where: { id: tid } }).catch(() => { })
    }

    logAuditEvent({
      tournamentId: tid,
      action: 'TOURNAMENT_DELETED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `Tournament "${tourney.name}" (${tid}) was permanently deleted along with all its teams, payments, and settlements.`,
    })

    return res.json({ success: true, message: `Tournament "${tourney.name}" deleted successfully.` })
  } catch (error) {
    console.error('Error deleting tournament:', error)
    return res.status(500).json({ error: 'Failed to delete tournament' })
  }
})

// Purge Test Data Endpoint (Super Admin Only - Fully Dynamic)
app.post('/api/admin/purge-test-data', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const customIds: string[] = Array.isArray(req.body?.tournamentIds) ? req.body.tournamentIds : []

    const matchedTourneys = TOURNAMENTS.filter((t) =>
      customIds.includes(t.id) ||
      t.name.includes('[AUTO-TEST]') ||
      t.name.includes('AUTO-TEST') ||
      t.slug.toLowerCase().includes('auto-test')
    )
    const tourneyIds = Array.from(new Set([...customIds, ...matchedTourneys.map((t) => t.id)]))

    if (tourneyIds.length > 0) {
      TOURNAMENTS = TOURNAMENTS.filter((t) => !tourneyIds.includes(t.id))
      REGISTERED_TEAMS = REGISTERED_TEAMS.filter((t) => !tourneyIds.includes(t.tournamentId))
      PAYMENT_SUBMISSIONS = PAYMENT_SUBMISSIONS.filter((p) => !tourneyIds.includes(p.tournamentId))
      AUCTION_PLAYERS = AUCTION_PLAYERS.filter((p) => !tourneyIds.includes(p.tournamentId))
      EPHEMERAL_BIDDERS = EPHEMERAL_BIDDERS.filter((b) => !tourneyIds.includes(b.auctionId))
      AMBASSADORS = AMBASSADORS.filter((a) => !tourneyIds.includes(a.tournamentId))
      PLATFORM_SETTLEMENTS = PLATFORM_SETTLEMENTS.filter((s) => !tourneyIds.includes(s.tournamentId))
    }

    const testCreators = OFFICIAL_CREATORS.filter((c) =>
      c.name.toLowerCase().includes('test partner') ||
      c.handle.toLowerCase().includes('testpartner')
    )
    const testCreatorIds = testCreators.map((c) => c.id)

    if (testCreatorIds.length > 0) {
      OFFICIAL_CREATORS = OFFICIAL_CREATORS.filter((c) => !testCreatorIds.includes(c.id))
      USERS = USERS.filter((u) =>
        !testCreatorIds.includes(u.organizationId || '') &&
        !u.email.toLowerCase().includes('testpartner')
      )
    }

    if (isDatabaseConfigured) {
      if (tourneyIds.length > 0) {
        await prisma.registeredTeam.deleteMany({ where: { tournamentId: { in: tourneyIds } } }).catch(() => { })
        await prisma.paymentSubmission.deleteMany({ where: { tournamentId: { in: tourneyIds } } }).catch(() => { })
        await prisma.auctionPlayer.deleteMany({ where: { tournamentId: { in: tourneyIds } } }).catch(() => { })
        await prisma.ephemeralAuctionBidder.deleteMany({ where: { auctionId: { in: tourneyIds } } }).catch(() => { })
        await prisma.ambassador.deleteMany({ where: { tournamentId: { in: tourneyIds } } }).catch(() => { })
        await prisma.platformSettlement.deleteMany({ where: { tournamentId: { in: tourneyIds } } }).catch(() => { })
        await prisma.auctionReversal.deleteMany({ where: { tournamentId: { in: tourneyIds } } }).catch(() => { })
        await prisma.platformAuditLog.deleteMany({ where: { tournamentId: { in: tourneyIds } } }).catch(() => { })
        await prisma.tournament.deleteMany({ where: { id: { in: tourneyIds } } }).catch(() => { })
      }

      if (testCreatorIds.length > 0) {
        await prisma.user.deleteMany({
          where: {
            OR: [
              { organizationId: { in: testCreatorIds } },
              { email: { contains: 'testpartner', mode: 'insensitive' } },
            ],
          },
        }).catch(() => { })
        await prisma.officialCreator.deleteMany({
          where: {
            OR: [
              { id: { in: testCreatorIds } },
              { name: { contains: 'Test Partner', mode: 'insensitive' } },
              { handle: { contains: 'testpartner', mode: 'insensitive' } },
            ],
          },
        }).catch(() => { })
      }
    }

    logAuditEvent({
      action: 'TEST_DATA_PURGED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `Purged test data: ${tourneyIds.length} test tournaments and ${testCreatorIds.length} test partner accounts.`,
    })

    return res.json({
      success: true,
      message: `Successfully purged ${tourneyIds.length} test tournaments and ${testCreatorIds.length} test partners.`,
      purgedTournamentIds: tourneyIds,
    })
  } catch (error) {
    console.error('Error purging test data:', error)
  }
})

// Verify / Approve All Registered Entries (Instant Reconciliation for Partner/Admin)
app.post('/api/tournaments/:id/approve-all-entries', requirePartnerOrAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
    if (!tourney) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    let updatedTeams = 0
    for (const t of REGISTERED_TEAMS) {
      if (t.tournamentId === tourney.id) {
        t.status = 'verified'
        updatedTeams++
      }
    }

    let updatedPlayers = 0
    for (const p of AUCTION_PLAYERS) {
      if (p.tournamentId === tourney.id || p.auctionId === tourney.id) {
        p.paymentStatus = 'verified'
        updatedPlayers++
      }
    }

    for (const pay of PAYMENT_SUBMISSIONS) {
      if (pay.tournamentId === tourney.id) {
        pay.status = 'approved'
        pay.verifiedAt = new Date().toISOString()
      }
    }

    tourney.registeredTeamsCount = REGISTERED_TEAMS.filter(
      (t) => t.tournamentId === tourney.id && (String(t.status) === 'verified' || String(t.status) === 'approved')
    ).length
    tourney.teams = tourney.registeredTeamsCount

    if (isDatabaseConfigured) {
      try {
        await prisma.registeredTeam.updateMany({
          where: { tournamentId: tourney.id },
          data: { status: 'verified' },
        })
        await prisma.auctionPlayer.updateMany({
          where: { OR: [{ tournamentId: tourney.id }, { auctionId: tourney.id }] },
          data: { paymentStatus: 'verified' },
        })
        await prisma.paymentSubmission.updateMany({
          where: { tournamentId: tourney.id },
          data: { status: 'approved', verifiedAt: new Date() },
        })
        await prisma.tournament.updateMany({
          where: { id: tourney.id },
          data: { registeredTeamsCount: tourney.registeredTeamsCount, teams: tourney.teams },
        })
      } catch (dbErr) {
        console.warn('[Database] Notice approving all entries in PostgreSQL:', dbErr)
      }
    }

    const finances = calculateTournamentFinances(tourney)

    logAuditEvent({
      tournamentId: tourney.id,
      action: 'ALL_ENTRIES_VERIFIED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `Organizer verified all entries (${updatedTeams} teams, ${updatedPlayers} auction draft players). Calculated platform fee: ₹${finances.rdkFee}.`,
    })

    return res.json({
      success: true,
      message: `All ${updatedTeams || updatedPlayers} participant entries verified! Platform fee updated to ₹${finances.rdkFee.toLocaleString('en-IN')}.`,
      finances,
    })
  } catch (error: any) {
    console.error('Error approving all entries:', error)
    return res.status(500).json({ error: error.message || 'Failed to approve entries' })
  }
})

// Update Match Room ID & Room Password (With Publishing Toggle)
// Auth: Only the tournament organizer (Official Partner who owns it) or Super Admin can set room credentials
app.patch('/api/tournaments/:id/room', requirePartnerOrAdmin, (req: Request, res: Response) => {
  const { id } = req.params
  const { roomId, roomPassword, roomPublished } = req.body
  const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
  if (!tourney) {
    return res.status(404).json({ error: 'Tournament not found' })
  }

  if (roomId !== undefined) tourney.roomId = roomId
  if (roomPassword !== undefined) tourney.roomPassword = roomPassword
  if (roomPublished !== undefined) {
    tourney.roomPublished = Boolean(roomPublished)
    logAuditEvent({
      tournamentId: tourney.id,
      action: roomPublished ? 'ROOM_PUBLISHED' : 'ROOM_UNPUBLISHED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `Match room credentials ${roomPublished ? 'PUBLISHED' : 'HIDDEN'} for tournament "${tourney.name}".`,
    })
  }

  if (isDatabaseConfigured) {
    prisma.tournament
      .updateMany({
        where: { id: tourney.id },
        data: {
          roomId: tourney.roomId,
          roomPassword: tourney.roomPassword,
          roomPublished: tourney.roomPublished,
        },
      })
      .catch((err) => console.error('[Database] Notice updating room credentials:', err))
  }

  return res.json({
    success: true,
    message: tourney.roomPublished
      ? 'Room credentials saved and PUBLISHED to verified players!'
      : 'Room credentials saved (hidden from players until published).',
    roomId: tourney.roomId,
    roomPassword: tourney.roomPassword,
    roomPublished: tourney.roomPublished,
  })
})

// Update Live Stream & Match Schedule (Creator Broadcast Studio)
// Auth: Only the tournament organizer or Super Admin can control the broadcast
app.patch('/api/tournaments/:id/stream', requirePartnerOrAdmin, (req: Request, res: Response) => {
  const { id } = req.params
  const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
  if (!tourney) {
    return res.status(404).json({ error: 'Tournament not found' })
  }

  const { streamUrl, streamTitle, streamStatus, scheduledMatchInfo } = req.body
  if (streamUrl !== undefined) tourney.streamUrl = streamUrl
  if (streamTitle !== undefined) tourney.streamTitle = streamTitle
  if (streamStatus !== undefined) tourney.streamStatus = streamStatus
  if (scheduledMatchInfo !== undefined) tourney.scheduledMatchInfo = scheduledMatchInfo

  // Persist stream changes to PostgreSQL
  if (isDatabaseConfigured) {
    prisma.tournament
      .updateMany({
        where: { id: tourney.id },
        data: {
          streamUrl: tourney.streamUrl || null,
          streamTitle: tourney.streamTitle || null,
          streamStatus: tourney.streamStatus || 'offline',
          scheduledMatchInfo: tourney.scheduledMatchInfo || null,
        },
      })
      .catch((err) => console.error('[Database] Notice persisting stream update:', err))
  }

  return res.json({
    success: true,
    message: 'Live stream broadcast & schedule updated successfully!',
    tournament: tourney,
  })
})

// Verify Registered Player Access to Match Room Credentials
app.post('/api/tournaments/:id/verify-room-access', (req: Request, res: Response) => {
  const { id } = req.params
  const { identifier } = req.body
  const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
  if (!tourney) {
    return res.status(404).json({ error: 'Tournament not found' })
  }

  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    return res.status(400).json({ error: 'Please enter your Game UID, In-Game Name (IGN), or registered Email' })
  }

  const query = identifier.trim().toLowerCase()

  // 1. Check if Creator / Organization Host / Admin
  if (
    (tourney.creatorId && query === tourney.creatorId.toLowerCase()) ||
    (tourney.creatorHandle && query === tourney.creatorHandle.toLowerCase()) ||
    query === 'admin'
  ) {
    return res.json({
      success: true,
      authorized: true,
      role: 'creator',
      participantName: tourney.creatorName,
      teamName: 'Tournament Host Organization',
      roomId: tourney.roomId,
      roomPassword: tourney.roomPassword,
    })
  }

  const queryDigits = query.replace(/[^0-9]/g, '')

  // 2. Check in Registered Teams (Captains & Squad Players)
  const matchingTeam = REGISTERED_TEAMS.find((t) => {
    if (t.tournamentId !== tourney.id) return false
    if (t.captainEmail?.toLowerCase() === query) return true
    if (queryDigits.length >= 10 && t.captainPhone && t.captainPhone.replace(/[^0-9]/g, '').slice(-10) === queryDigits.slice(-10)) return true
    if (t.captainIgn?.toLowerCase() === query) return true
    if (t.name?.toLowerCase() === query) return true
    if (t.players?.some((p) => p.ign?.toLowerCase() === query || p.gameUid?.toLowerCase() === query)) return true
    return false
  })

  if (matchingTeam) {
    const matchedPlayer = matchingTeam.players?.find(
      (p) => p.ign?.toLowerCase() === query || p.gameUid?.toLowerCase() === query
    )
    if (!tourney.roomPublished) {
      return res.json({
        success: true,
        authorized: true,
        published: false,
        role: matchingTeam.captainIgn.toLowerCase() === query ? 'captain' : 'player',
        participantName: matchedPlayer ? matchedPlayer.ign : matchingTeam.captainName,
        teamName: matchingTeam.name,
        message: 'Your registration is verified! However, the organizer has not published the match Room ID & Password yet. Please check back 15 minutes before match start.',
      })
    }
    return res.json({
      success: true,
      authorized: true,
      published: true,
      role: matchingTeam.captainIgn.toLowerCase() === query ? 'captain' : 'player',
      participantName: matchedPlayer ? matchedPlayer.ign : matchingTeam.captainName,
      teamName: matchingTeam.name,
      roomId: tourney.roomId,
      roomPassword: tourney.roomPassword,
    })
  }

  // 3. Check in Registered Auction Draft Candidates
  const matchingCandidate = AUCTION_PLAYERS.find((p) => {
    if (p.tournamentId !== tourney.id && p.auctionId !== tourney.id) return false
    if (p.email?.toLowerCase() === query) return true
    if (queryDigits.length >= 10 && p.phone && p.phone.replace(/[^0-9]/g, '').slice(-10) === queryDigits.slice(-10)) return true
    if (p.ign?.toLowerCase() === query) return true
    if (p.gameUid?.toLowerCase() === query) return true
    return false
  })

  if (matchingCandidate) {
    if (!tourney.roomPublished) {
      return res.json({
        success: true,
        authorized: true,
        published: false,
        role: 'draft_candidate',
        participantName: matchingCandidate.ign,
        teamName: matchingCandidate.soldToTeam || 'Registered Draft Candidate',
        message: 'Your player clearance is verified! However, match room credentials have not been released by the host yet. Please check back shortly.',
      })
    }
    return res.json({
      success: true,
      authorized: true,
      published: true,
      role: 'draft_candidate',
      participantName: matchingCandidate.ign,
      teamName: matchingCandidate.soldToTeam || 'Registered Draft Candidate',
      roomId: tourney.roomId,
      roomPassword: tourney.roomPassword,
    })
  }

  // Access Denied
  return res.status(403).json({
    success: false,
    authorized: false,
    error: 'Access Denied: Only confirmed, registered players of this tournament have clearance to view match room credentials.',
  })
})

// Get Registered Teams for Tournament
app.get('/api/tournaments/:id/teams', (req: Request, res: Response) => {
  const { id } = req.params
  const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
  const targetId = tourney ? tourney.id : id
  const teams = REGISTERED_TEAMS.filter((t) => t.tournamentId === targetId)
  return res.json(teams)
})

// ═══════════════════════════════════════════════════════════════
// CSV PARSING UTILITY
// ═══════════════════════════════════════════════════════════════
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentVal = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim())
      currentVal = ''
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++
      currentRow.push(currentVal.trim())
      if (currentRow.some((col) => col.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentVal = ''
    } else {
      currentVal += char
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim())
    if (currentRow.some((col) => col.length > 0)) rows.push(currentRow)
  }
  return rows
}

// ═══════════════════════════════════════════════════════════════
// IMPORT TEAMS / PLAYERS FROM GOOGLE SHEETS OR CSV
// ═══════════════════════════════════════════════════════════════
app.post('/api/tournaments/:id/import-sheet', requirePartnerOrAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
    if (!tourney) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    const {
      sheetUrl,
      csvData,
      mode = 'individual', // 'individual' | 'squads'
      playersPerTeam = 4,
      teamNamePrefix = 'Team',
      ambassadorId,
      ambassadorName,
      status = 'verified',
    } = req.body

    let rawCsv = (csvData || '').trim()

    if (!rawCsv && sheetUrl) {
      let exportUrl = sheetUrl.trim()
      if (exportUrl.includes('docs.google.com/spreadsheets/d/')) {
        exportUrl = exportUrl.replace(/\/edit(\?.*)?$/, '') + '/export?format=csv'
        if (!exportUrl.includes('/export?format=csv')) {
          exportUrl = exportUrl.replace(/\/$/, '') + '/export?format=csv'
        }
      }
      const fetchRes = await fetch(exportUrl)
      if (!fetchRes.ok) {
        return res.status(400).json({
          error: `Failed to fetch Google Sheet. Please ensure sharing is set to "Anyone with the link can view". (HTTP ${fetchRes.status})`,
        })
      }
      rawCsv = await fetchRes.text()
    }

    if (!rawCsv) {
      return res.status(400).json({ error: 'No CSV data or Google Sheet URL provided' })
    }

    const rows = parseCSV(rawCsv)
    if (rows.length < 2) {
      return res.status(400).json({ error: 'No data rows found in the sheet' })
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim())
    const nameIdx = headers.findIndex((h) => h.includes('name'))
    const ignIdx = headers.findIndex((h) => h.includes('ign'))
    const emailIdx = headers.findIndex((h) => h.includes('email'))
    const phoneIdx = headers.findIndex(
      (h) => h.includes('contact') || h.includes('phone') || h.includes('mobile') || h.includes('number')
    )
    const roleIdx = headers.findIndex((h) => h.includes('role'))
    const expIdx = headers.findIndex((h) => h.includes('experience'))
    const achieveIdx = headers.findIndex((h) => h.includes('achiv') || h.includes('achieve'))
    const clipIdx = headers.findIndex((h) => h.includes('clip') || h.includes('gameplay'))
    const proofIdx = headers.findIndex(
      (h) => h.includes('ss') || h.includes('screenshot') || h.includes('entry') || h.includes('upload')
    )

    interface ParsedPlayer {
      name: string
      ign: string
      email: string
      phone: string
      role: string
      experience: string
      achievements: string
      clipUrl: string
      proofUrl: string
    }

    const parsedPlayers: ParsedPlayer[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0 || !r.some((c) => c.trim().length > 0)) continue
      const name = (nameIdx >= 0 ? r[nameIdx] : `Player ${i}`) || `Player ${i}`
      const ign = (ignIdx >= 0 ? r[ignIdx] : name) || name
      const email = (emailIdx >= 0 ? r[emailIdx] : '') || ''
      const phone = (phoneIdx >= 0 ? r[phoneIdx] : '') || ''
      const role = (roleIdx >= 0 ? r[roleIdx] : 'Rusher') || 'Rusher'
      const experience = (expIdx >= 0 ? r[expIdx] : '') || ''
      const achievements = (achieveIdx >= 0 ? r[achieveIdx] : '') || ''
      const clipUrl = (clipIdx >= 0 ? r[clipIdx] : '') || ''
      const proofUrl = (proofIdx >= 0 ? r[proofIdx] : '') || ''

      parsedPlayers.push({
        name: name.trim(),
        ign: ign.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: role.trim(),
        experience: experience.trim(),
        achievements: achievements.trim(),
        clipUrl: clipUrl.trim(),
        proofUrl: proofUrl.trim(),
      })
    }

    if (parsedPlayers.length === 0) {
      return res.status(400).json({ error: 'Could not extract valid players from the sheet' })
    }

    const newTeams: RegisteredTeam[] = []
    const existingTeamsCount = REGISTERED_TEAMS.filter((t) => t.tournamentId === tourney.id).length

    if (mode === 'squads') {
      const pCount = Number(playersPerTeam) || 4
      let squadIndex = existingTeamsCount + 1
      for (let i = 0; i < parsedPlayers.length; i += pCount) {
        const chunk = parsedPlayers.slice(i, i + pCount)
        const captain = chunk[0]
        const teamId = `team_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}_${i}`
        const teamRecord: RegisteredTeam = {
          id: teamId,
          tournamentId: tourney.id,
          name: `${teamNamePrefix} ${squadIndex}`,
          captainName: captain.name,
          captainEmail: captain.email || `captain${squadIndex}@rdkesports.in`,
          captainPhone: captain.phone,
          captainIgn: captain.ign,
          players: chunk.map((p) => ({
            ign: p.ign,
            gameUid: 'N/A',
          })),
          status: status as any,
          ambassadorId: ambassadorId || undefined,
          ambassadorName: ambassadorName || undefined,
          role: captain.role,
          achievements: captain.achievements,
          experience: captain.experience,
          clipUrl: captain.clipUrl,
          paymentProofUrl: captain.proofUrl,
          registeredAt: new Date().toISOString(),
        }
        newTeams.push(teamRecord)
        squadIndex++
      }
    } else {
      // Individual slots (1 player per team slot)
      for (let i = 0; i < parsedPlayers.length; i++) {
        const p = parsedPlayers[i]
        const teamId = `team_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}_${i}`
        const teamRecord: RegisteredTeam = {
          id: teamId,
          tournamentId: tourney.id,
          name: p.ign ? `${p.ign} (${p.name})` : p.name,
          captainName: p.name,
          captainEmail: p.email || `player${i + 1}@rdkesports.in`,
          captainPhone: p.phone,
          captainIgn: p.ign,
          players: [{ ign: p.ign, gameUid: 'N/A' }],
          status: status as any,
          ambassadorId: ambassadorId || undefined,
          ambassadorName: ambassadorName || undefined,
          role: p.role,
          achievements: p.achievements,
          experience: p.experience,
          clipUrl: p.clipUrl,
          paymentProofUrl: p.proofUrl,
          registeredAt: new Date().toISOString(),
        }
        newTeams.push(teamRecord)
      }
    }

    // Add to in-memory state
    REGISTERED_TEAMS.push(...newTeams)

    // Sync to Auction Players pool if auction tournament
    const isAuction = tourney.format === 'Auction Tournament' || tourney.type?.includes('AUCTION')
    if (isAuction) {
      for (const p of parsedPlayers) {
        const playerId = `ap_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
        const exists = AUCTION_PLAYERS.some(
          (ap) =>
            (ap.auctionId === tourney.id || ap.tournamentId === tourney.id) &&
            ap.ign.toLowerCase() === p.ign.toLowerCase()
        )
        if (!exists) {
          AUCTION_PLAYERS.push({
            id: playerId,
            auctionId: tourney.id,
            tournamentId: tourney.id,
            name: p.name,
            ign: p.ign,
            gameUid: 'UID-' + Math.floor(100000 + Math.random() * 900000),
            role: (p.role as any) || 'Rusher',
            basePrice: 5000,
            tier: 'Tier 2 (Pro)',
            phone: p.phone,
            email: p.email,
            clipUrl: p.clipUrl,
            photoUrl: '/gg.png',
            stats: {
              kd: '3.50',
              matchesPlayed: 75,
              headshotRate: '60%',
              achievements: p.achievements || 'Imported Registration',
            },
            status: 'available',
            paymentStatus: 'verified',
            registeredAt: new Date().toISOString(),
          })
        }
      }
    }

    tourney.registeredTeamsCount = REGISTERED_TEAMS.filter((t) => t.tournamentId === tourney.id).length

    // Optional Prisma persistence
    try {
      for (const t of newTeams) {
        await prisma.registeredTeam
          .create({
            data: {
              id: t.id,
              tournamentId: t.tournamentId,
              name: t.name,
              captainName: t.captainName,
              captainEmail: t.captainEmail,
              captainPhone: t.captainPhone,
              captainIgn: t.captainIgn,
              players: JSON.stringify(t.players),
              status: t.status,
              paymentProofUrl: t.paymentProofUrl,
            },
          })
          .catch(() => { })
      }
    } catch {
      // Memory fallback
    }

    logAuditEvent({
      tournamentId: tourney.id,
      action: 'TEAMS_IMPORTED_FROM_SHEET',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `Imported ${newTeams.length} entries (${parsedPlayers.length} players) from Google Sheets into "${tourney.name}".`,
    })

    return res.status(201).json({
      success: true,
      count: newTeams.length,
      totalPlayers: parsedPlayers.length,
      teams: newTeams,
      message: `Successfully imported ${newTeams.length} ${mode === 'squads' ? 'squads' : 'teams'} (${parsedPlayers.length} players) from Google Sheets!`,
    })
  } catch (err: any) {
    console.error('[Import Sheet Error]', err)
    return res.status(500).json({ error: err.message || 'Failed to import sheet' })
  }
})


// Add Team Manually (Partner / Admin)
app.post('/api/tournaments/:id/teams', requirePartnerOrAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
    if (!tourney) return res.status(404).json({ error: 'Tournament not found' })

    const {
      name,
      captainName,
      captainEmail,
      captainPhone,
      captainIgn,
      players,
      status = 'verified',
      ambassadorId,
      ambassadorName,
      role,
    } = req.body

    if (!name || !captainName || !captainIgn) {
      return res.status(400).json({ error: 'Team name, Captain Name, and Captain IGN are required' })
    }

    const teamId = `team_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
    const newTeam: RegisteredTeam = {
      id: teamId,
      tournamentId: tourney.id,
      name: name.trim(),
      captainName: captainName.trim(),
      captainEmail: (captainEmail || `team_${Date.now()}@rdkesports.in`).trim().toLowerCase(),
      captainPhone: captainPhone || '',
      captainIgn: captainIgn.trim(),
      players: Array.isArray(players) && players.length > 0 ? players : [{ ign: captainIgn.trim(), gameUid: 'N/A' }],
      status: status as any,
      ambassadorId: ambassadorId || undefined,
      ambassadorName: ambassadorName || undefined,
      role: role || undefined,
      registeredAt: new Date().toISOString(),
    }

    REGISTERED_TEAMS.push(newTeam)
    tourney.registeredTeamsCount = REGISTERED_TEAMS.filter((t) => t.tournamentId === tourney.id).length

    return res.status(201).json({ success: true, team: newTeam })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to add team' })
  }
})

// Update Team / Allot Ambassador (Partner / Admin)
app.patch('/api/tournaments/:id/teams/:teamId', requirePartnerOrAdmin, (req: Request, res: Response) => {
  try {
    const { id, teamId } = req.params
    const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
    if (!tourney) return res.status(404).json({ error: 'Tournament not found' })

    const team = REGISTERED_TEAMS.find((t) => t.id === teamId && t.tournamentId === tourney.id)
    if (!team) return res.status(404).json({ error: 'Team not found' })

    const {
      name,
      captainName,
      captainIgn,
      captainPhone,
      captainEmail,
      players,
      status,
      ambassadorId,
      ambassadorName,
      role,
    } = req.body

    if (name !== undefined) team.name = name.trim()
    if (captainName !== undefined) team.captainName = captainName.trim()
    if (captainIgn !== undefined) team.captainIgn = captainIgn.trim()
    if (captainPhone !== undefined) team.captainPhone = captainPhone
    if (captainEmail !== undefined) team.captainEmail = captainEmail.trim().toLowerCase()
    if (players !== undefined) team.players = players
    if (status !== undefined) team.status = status
    if (ambassadorId !== undefined) team.ambassadorId = ambassadorId || undefined
    if (ambassadorName !== undefined) team.ambassadorName = ambassadorName || undefined
    if (role !== undefined) team.role = role

    return res.json({ success: true, team })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update team' })
  }
})

// Batch Allot Teams to Ambassador
app.post('/api/tournaments/:id/teams/batch-allot', requirePartnerOrAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
    if (!tourney) return res.status(404).json({ error: 'Tournament not found' })

    const { teamIds, ambassadorId, ambassadorName, rangeFrom, rangeTo } = req.body

    const targetTeams = REGISTERED_TEAMS.filter((t) => t.tournamentId === tourney.id)
    let updatedCount = 0
    const updatedTeamIds: string[] = []

    if (Array.isArray(teamIds) && teamIds.length > 0) {
      targetTeams.forEach((t) => {
        if (teamIds.includes(t.id)) {
          t.ambassadorId = ambassadorId || undefined
          t.ambassadorName = ambassadorName || undefined
          updatedTeamIds.push(t.id)
          updatedCount++
        }
      })
    } else if (rangeFrom !== undefined && rangeTo !== undefined) {
      const from = Math.max(1, Number(rangeFrom))
      const to = Math.min(targetTeams.length, Number(rangeTo))
      for (let i = from - 1; i < to; i++) {
        targetTeams[i].ambassadorId = ambassadorId || undefined
        targetTeams[i].ambassadorName = ambassadorName || undefined
        updatedTeamIds.push(targetTeams[i].id)
        updatedCount++
      }
    }

    // Persist ambassador allotments to PostgreSQL so they survive server restarts
    if (isDatabaseConfigured && updatedTeamIds.length > 0) {
      try {
        await (prisma.registeredTeam as any).updateMany({
          where: { id: { in: updatedTeamIds } },
          data: {
            ambassadorId: ambassadorId || null,
            ambassadorName: ambassadorName || null,
          },
        })
      } catch (dbErr) {
        console.warn('[Database] Notice persisting batch-allot to PostgreSQL:', dbErr)
      }
    }

    return res.json({ success: true, updatedCount })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to batch allot teams' })
  }
})

// Delete Team (Partner / Admin)
app.delete('/api/tournaments/:id/teams/:teamId', requirePartnerOrAdmin, async (req: Request, res: Response) => {
  try {
    const { id, teamId } = req.params
    const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
    if (!tourney) return res.status(404).json({ error: 'Tournament not found' })

    const index = REGISTERED_TEAMS.findIndex((t) => t.id === teamId && t.tournamentId === tourney.id)
    if (index === -1) return res.status(404).json({ error: 'Team not found' })

    // Remove from in-memory store
    REGISTERED_TEAMS.splice(index, 1)
    tourney.registeredTeamsCount = REGISTERED_TEAMS.filter((t) => t.tournamentId === tourney.id).length

    // Persist deletion to PostgreSQL — critical so deleted teams don't reappear after Railway restart
    if (isDatabaseConfigured) {
      try {
        await prisma.registeredTeam.delete({ where: { id: String(teamId) } })
        await prisma.tournament.updateMany({
          where: { id: tourney.id },
          data: { registeredTeamsCount: tourney.registeredTeamsCount, teams: tourney.registeredTeamsCount },
        })
        // Also delete any associated payment submission for this team
        await prisma.paymentSubmission.deleteMany({ where: { teamId: String(teamId) } }).catch(() => { })
      } catch (dbErr) {
        console.warn('[Database] Notice deleting team from PostgreSQL:', dbErr)
      }
    }

    return res.json({ success: true, message: 'Team removed' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete team' })
  }
})

// ─────────────────────────────────────────────────────────────────
// Get Authenticated Player's Registered Tournaments
// ─────────────────────────────────────────────────────────────────
app.get('/api/player/my-tournaments', (req: Request, res: Response) => {
  try {
    const token =
      req.cookies?.session_token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null)

    let userId = ''
    let userEmail = ''
    let userIgn = ''

    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as any
        userId = String(payload.id || '')
        userEmail = String(payload.email || '').toLowerCase().trim()
        userIgn = String(payload.ign || '').toLowerCase().trim()
      } catch {}
    }

    if (!userEmail && req.query.email) {
      userEmail = String(req.query.email).toLowerCase().trim()
    }
    if (!userIgn && req.query.ign) {
      userIgn = String(req.query.ign).toLowerCase().trim()
    }

    // If new user or no matching identity found, return 0 registrations
    if (!userId && !userEmail && !userIgn) {
      return res.json({
        tournaments: [],
        count: 0,
        paymentStatus: 'None',
        activeMatch: null,
      })
    }

    // Find registered teams matching this player
    const userTeams = REGISTERED_TEAMS.filter((t) => {
      const cEmail = String(t.captainEmail || '').toLowerCase().trim()
      const cIgn = String(t.captainIgn || '').toLowerCase().trim()
      if (userEmail && cEmail === userEmail) return true
      if (userIgn && cIgn === userIgn) return true
      if (Array.isArray(t.players)) {
        return t.players.some((p: any) => {
          const pIgn = String(p.ign || p.playerName || '').toLowerCase().trim()
          return userIgn && pIgn === userIgn
        })
      }
      return false
    })

    // Find auction registrations matching this player
    const userAuctions = AUCTION_PLAYERS.filter((p) => {
      const pEmail = String(p.email || '').toLowerCase().trim()
      const pIgn = String(p.ign || '').toLowerCase().trim()
      if (userEmail && pEmail === userEmail) return true
      if (userIgn && pIgn === userIgn) return true
      return false
    })

    const registeredTournamentIds = new Set([
      ...userTeams.map((t) => t.tournamentId),
      ...userAuctions.map((p) => p.auctionId || p.tournamentId).filter(Boolean),
    ])

    const myTourneys = TOURNAMENTS.filter((t) => registeredTournamentIds.has(t.id))

    // Determine overall payment status across registrations
    let overallPaymentStatus = 'None'
    if (userTeams.length > 0 || userAuctions.length > 0) {
      const hasVerified =
        userTeams.some((t) => t.status === 'verified') ||
        userAuctions.some((p) => p.paymentStatus === 'verified')
      const hasPending =
        userTeams.some((t) => t.status === 'pending') ||
        userAuctions.some((p) => p.paymentStatus === 'pending')

      if (hasVerified) overallPaymentStatus = 'Verified'
      else if (hasPending) overallPaymentStatus = 'Pending Verification'
      else overallPaymentStatus = 'Not Paid'
    }

    // Check if there is an active/live match with published credentials
    let activeMatch: any = null
    const liveOrUpcomingWithRoom = myTourneys.find(
      (t) => (t.status === 'live' || t.roomPublished) && (t.roomId || t.scheduledMatchInfo)
    )

    if (liveOrUpcomingWithRoom) {
      activeMatch = {
        tournamentId: liveOrUpcomingWithRoom.id,
        tournamentName: liveOrUpcomingWithRoom.name,
        game: liveOrUpcomingWithRoom.game,
        roomId: liveOrUpcomingWithRoom.roomPublished ? liveOrUpcomingWithRoom.roomId : undefined,
        roomPassword: liveOrUpcomingWithRoom.roomPublished ? liveOrUpcomingWithRoom.roomPassword : undefined,
        status: liveOrUpcomingWithRoom.status,
        scheduledMatchInfo: liveOrUpcomingWithRoom.scheduledMatchInfo || 'Match in progress',
      }
    }

    return res.json({
      tournaments: myTourneys,
      count: myTourneys.length,
      paymentStatus: overallPaymentStatus,
      activeMatch,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch player tournaments' })
  }
})

// Audience / Team Captain / Auction Candidate Registration for Tournament
app.post('/api/tournaments/:id/register', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
    if (!tourney) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    const isAuction = tourney.format === 'Auction Tournament' || req.body.isAuctionRegistration
    const isPaid = tourney.entryFee && !tourney.entryFee.toLowerCase().includes('free')

    // Gatekeeper: Reject registration if tournament is closed, ended, or not open
    const statusNormalized = String(tourney.status || '').toLowerCase()
    const isEnded =
      statusNormalized === 'completed' ||
      statusNormalized === 'finished' ||
      statusNormalized === 'closed' ||
      Boolean(tourney.isClosed) ||
      Boolean(tourney.closedAt) ||
      (tourney.endDate ? new Date(tourney.endDate).getTime() < Date.now() : false) ||
      (tourney.registrationClosing ? new Date(tourney.registrationClosing).getTime() < Date.now() : false)

    if (isEnded) {
      return res.status(400).json({
        error: 'Tournament has concluded or registration is closed for this event.',
      })
    }

    const isOpen = !isEnded && (statusNormalized === 'registration_open' || statusNormalized === 'upcoming')
    if (!isOpen) {
      return res.status(400).json({
        error:
          statusNormalized === 'live'
            ? 'Tournament is currently live. Registration is closed.'
            : 'Registration is currently closed for this tournament.',
      })
    }

    const currentCandidates = AUCTION_PLAYERS.filter(
      (p) => p.auctionId === tourney.id || p.tournamentId === tourney.id
    ).length
    const currentTeams = REGISTERED_TEAMS.filter((t) => t.tournamentId === tourney.id).length
    const totalCurrent = isAuction
      ? Math.max(currentCandidates, tourney.registeredTeamsCount)
      : Math.max(currentTeams, tourney.registeredTeamsCount)

    if (totalCurrent >= tourney.maxTeams) {
      return res.status(400).json({
        error: `All slots are full (${totalCurrent}/${tourney.maxTeams}). Registration is closed.`,
      })
    }

    // ── CASE A: Auction Candidate Registration (Individual Player Draft Pool) ──
    if (isAuction) {
      const {
        playerName,
        name,
        ign,
        gameUid,
        role = 'Rusher',
        basePrice = 5000,
        tier = 'Tier 2 (Pro)',
        phone = '',
        email = '',
        clipUrl = '',
        photoUrl = '',
        kd = '3.50',
        achievements = '',
        screenshotUrl,
        utr,
      } = req.body

      const finalName = (playerName || name || '').trim()
      const finalIgn = (ign || '').trim()
      const finalUid = (gameUid || '').trim()

      if (!finalName || !finalIgn) {
        return res.status(400).json({ error: 'Player Name and In-Game Name (IGN) are required for auction registration' })
      }

      // Duplicate entry prevention for Auction Draft Candidate
      const existingByUid = AUCTION_PLAYERS.find(
        (p) =>
          (p.auctionId === tourney.id || p.tournamentId === tourney.id) &&
          finalUid &&
          p.gameUid &&
          p.gameUid.toLowerCase() === finalUid.toLowerCase()
      )
      if (existingByUid) {
        return res.status(409).json({
          error: `Duplicate Entry Detected: A draft candidate with Game UID "${finalUid}" is already registered in this tournament.`,
        })
      }

      const existingByIgn = AUCTION_PLAYERS.find(
        (p) =>
          (p.auctionId === tourney.id || p.tournamentId === tourney.id) &&
          p.ign.toLowerCase() === finalIgn.toLowerCase()
      )
      if (existingByIgn) {
        return res.status(409).json({
          error: `Duplicate Entry Detected: In-game name (IGN) "${finalIgn}" is already registered in this tournament.`,
        })
      }

      const isInstantVerified = !isPaid && !screenshotUrl && !utr
      const playerId = `ap_${Date.now()}`

      const newAuctionPlayer: AuctionPlayer = {
        id: playerId,
        auctionId: tourney.id,
        tournamentId: tourney.id,
        name: finalName,
        ign: finalIgn,
        gameUid: finalUid || 'UID-' + Math.floor(100000 + Math.random() * 900000),
        role,
        basePrice: Number(basePrice) || 5000,
        tier: Number(basePrice) >= 10000 ? 'Tier 1 (Marquee)' : (tier || 'Tier 2 (Pro)'),
        phone: phone.trim() || String(req.body.playerPhone || '').trim(),
        contactNumber: phone.trim() || String(req.body.playerPhone || '').trim(),
        email: email.trim(),
        experience: String(req.body.experience || req.body.playerExperience || '').trim(),
        achievements: String(req.body.achievements || req.body.playerAchievements || achievements || '').trim(),
        clipUrl: clipUrl.trim(),
        photoUrl: photoUrl.trim() || '/gg.png',
        stats: {
          kd: kd ? String(kd) : '3.50',
          matchesPlayed: 75,
          headshotRate: '60%',
          achievements: (achievements || req.body.playerAchievements || 'Registered Draft Candidate').trim(),
        },
        status: 'available',
        paymentProofUrl: screenshotUrl,
        paymentStatus: isInstantVerified ? 'verified' : 'pending',
        registeredAt: new Date().toISOString(),
      }

      AUCTION_PLAYERS.push(newAuctionPlayer)

      // Log payment if fee applies or screenshot provided
      if (screenshotUrl || utr || isPaid) {
        const payId = `pay_${Date.now()}`
        const newPayment: PaymentSubmission = {
          id: payId,
          tournamentId: tourney.id,
          tournamentName: tourney.name,
          teamId: playerId,
          teamName: `${finalName} (IGN: ${finalIgn})`,
          captainName: finalName,
          amount: tourney.entryFee,
          utr: utr?.trim() || 'Screenshot Uploaded',
          screenshotUrl: screenshotUrl || 'https://images.unsplash.com/photo-1556742049-0a67e55722c0?auto=format&fit=crop&w=400&q=80',
          status: isInstantVerified ? 'approved' : 'pending',
          submittedAt: new Date().toISOString(),
        }
        PAYMENT_SUBMISSIONS.push(newPayment)
      }

      tourney.registeredTeamsCount += 1

      return res.status(201).json({
        success: true,
        isAuction: true,
        message: isInstantVerified
          ? 'Auction draft registration completed! Your card and gameplay montage are queued for franchise bidding.'
          : 'Draft candidate registered! Your payment screenshot has been submitted to the ambassador queue.',
        player: newAuctionPlayer,
      })
    }

    // ── CASE B: Standard Team / Squad Registration ──
    const teamNameRaw = req.body.teamName || req.body.name || req.body.team
    const { captainName, captainEmail, captainPhone, captainIgn, players, utr, screenshotUrl } = req.body

    if (!teamNameRaw || !captainName || !captainEmail || !captainIgn) {
      return res.status(400).json({ error: 'Team name, Captain Name, Captain Email, and Captain IGN are required' })
    }
    const teamName = String(teamNameRaw).trim()

    // Duplicate check 1: Team Name uniqueness within this tournament
    const existingTeam = REGISTERED_TEAMS.find(
      (t) => t.tournamentId === tourney.id && t.name.toLowerCase() === teamName.trim().toLowerCase()
    )
    if (existingTeam) {
      return res.status(409).json({
        error: `Duplicate Entry: A team named "${teamName.trim()}" is already registered in this tournament. Please choose a unique clan/team name.`,
      })
    }

    // Duplicate check 2: Captain In-Game Name uniqueness
    const existingCaptain = REGISTERED_TEAMS.find(
      (t) => t.tournamentId === tourney.id && t.captainIgn.toLowerCase() === captainIgn.trim().toLowerCase()
    )
    if (existingCaptain) {
      return res.status(409).json({
        error: `Duplicate Entry: Captain IGN "${captainIgn.trim()}" is already registered in team "${existingCaptain.name}".`,
      })
    }

    // Duplicate check 3: Squad Player UIDs already registered in another squad
    if (Array.isArray(players)) {
      for (const p of players) {
        if (!p.gameUid || p.gameUid === 'N/A' || p.gameUid.trim() === '') continue
        const duplicateSquad = REGISTERED_TEAMS.find(
          (t) =>
            t.tournamentId === tourney.id &&
            t.players?.some((tp) => tp.gameUid && tp.gameUid.toLowerCase() === p.gameUid.trim().toLowerCase())
        )
        if (duplicateSquad) {
          return res.status(409).json({
            error: `Duplicate Entry: Player UID "${p.gameUid}" (${p.ign}) is already rostered in team "${duplicateSquad.name}". Duplicate rosters are prohibited.`,
          })
        }
      }
    }

    // Create Team Record
    const teamId = `team_${Date.now()}`
    const isInstantVerified = !isPaid && !screenshotUrl && !utr
    const newTeam: RegisteredTeam = {
      id: teamId,
      tournamentId: tourney.id,
      name: teamName.trim(),
      captainName: captainName.trim(),
      captainEmail: captainEmail.trim().toLowerCase(),
      captainPhone: captainPhone || '',
      captainIgn: captainIgn.trim(),
      players: Array.isArray(players) && players.length > 0 ? players : [{ ign: captainIgn.trim(), gameUid: 'N/A' }],
      experience: String(req.body.experience || req.body.teamExperience || '').trim(),
      achievements: String(req.body.achievements || req.body.teamAchievements || '').trim(),
      status: isInstantVerified ? 'verified' : 'pending',
      utr: utr?.trim() || (screenshotUrl ? 'Screenshot Uploaded' : undefined),
      paymentProofUrl: screenshotUrl,
      registeredAt: new Date().toISOString(),
    }

    REGISTERED_TEAMS.push(newTeam)

    // If payment required or screenshot/UTR provided, log payment submission
    if (screenshotUrl || utr || isPaid) {
      const payId = `pay_${Date.now()}`
      const newPayment: PaymentSubmission = {
        id: payId,
        tournamentId: tourney.id,
        tournamentName: tourney.name,
        teamId,
        teamName: newTeam.name,
        captainName: newTeam.captainName,
        amount: tourney.entryFee,
        utr: utr?.trim() || 'Screenshot Uploaded',
        screenshotUrl: screenshotUrl || 'https://images.unsplash.com/photo-1556742049-0a67e55722c0?auto=format&fit=crop&w=400&q=80',
        status: isInstantVerified ? 'approved' : 'pending',
        submittedAt: new Date().toISOString(),
      }
      PAYMENT_SUBMISSIONS.push(newPayment)
    }

    if (isInstantVerified) {
      tourney.registeredTeamsCount += 1
      tourney.teams += 1
    }

    return res.status(201).json({
      success: true,
      message: isInstantVerified
        ? 'Team registered and verified successfully!'
        : 'Team registered! Your payment screenshot has been queued for ambassador/organizer verification.',
      team: newTeam,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ error: 'Failed to register team' })
  }
})

// Auction Player Pool: Get players for an auction tournament
app.get('/api/auctions/:id/players', (req: Request, res: Response) => {
  const id = String(req.params.id)
  const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
  const targetId = tourney ? tourney.id : id
  let players = AUCTION_PLAYERS.filter((p) => p.auctionId === id || p.tournamentId === id || p.tournamentId === targetId || p.auctionId === targetId)
  if (players.length === 0) {
    const tourneyTeams = REGISTERED_TEAMS.filter((t) => t.tournamentId === id || t.tournamentId === targetId)
    if (tourneyTeams.length > 0) {
      players = tourneyTeams.map((t) => ({
        id: t.id,
        auctionId: targetId,
        tournamentId: targetId,
        name: t.captainName || t.name,
        ign: t.captainIgn || t.name,
        gameUid: t.players?.[0]?.gameUid || 'N/A',
        role: (t.role as any) || 'Rusher',
        basePrice: 5000,
        tier: 'Tier 2 (Pro)',
        phone: t.captainPhone,
        email: t.captainEmail,
        clipUrl: t.clipUrl,
        photoUrl: '/gg.png',
        stats: {
          kd: '3.50',
          matchesPlayed: 45,
          headshotRate: '60%',
          achievements: t.achievements || 'Registered Draft Candidate',
        },
        status: 'available',
        paymentStatus: 'verified',
        registeredAt: t.registeredAt,
      }))
    }
  }
  return res.json({ count: players.length, players })
})

// Google Sheets / CSV Import: Batch import player pool with video clips & stats and deduplication
app.post('/api/auctions/:id/sheets/import', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const { players: incomingPlayers } = req.body

    if (!Array.isArray(incomingPlayers) || incomingPlayers.length === 0) {
      return res.status(400).json({ error: 'No player rows provided for Google Sheets import' })
    }

    const imported: AuctionPlayer[] = []
    let duplicateSkipped = 0

    for (const p of incomingPlayers) {
      if (!p.name && !p.ign) continue
      const finalIgn = String(p.ign || p.name).trim()
      const finalUid = String(p.gameUid || '').trim()

      // Duplicate check within database and current batch
      const isDuplicate = AUCTION_PLAYERS.some(
        (existing) =>
          (existing.auctionId === id || existing.tournamentId === id) &&
          (existing.ign.toLowerCase() === finalIgn.toLowerCase() ||
            (finalUid && existing.gameUid && existing.gameUid.toLowerCase() === finalUid.toLowerCase()))
      ) || imported.some(
        (prev) =>
          prev.ign.toLowerCase() === finalIgn.toLowerCase() ||
          (finalUid && prev.gameUid && prev.gameUid.toLowerCase() === finalUid.toLowerCase())
      )

      if (isDuplicate) {
        duplicateSkipped += 1
        continue
      }

      const record: AuctionPlayer = {
        id: `ap_import_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        auctionId: id,
        tournamentId: id,
        name: p.name || p.ign,
        ign: finalIgn,
        gameUid: finalUid || 'UID-' + Math.floor(100000 + Math.random() * 900000),
        role: p.role || 'Rusher',
        basePrice: Number(p.basePrice) || 5000,
        tier: Number(p.basePrice) >= 10000 ? 'Tier 1 (Marquee)' : (p.tier || 'Tier 2 (Pro)'),
        phone: p.phone || '',
        email: p.email || '',
        clipUrl: p.clipUrl || '',
        photoUrl: p.photoUrl || '/gg.png',
        stats: {
          kd: p.kd ? String(p.kd) : '4.00',
          headshotRate: p.headshotRate || '65%',
          achievements: p.achievements || 'Imported via Google Sheets sync',
        },
        status: 'available',
        paymentStatus: 'verified',
        registeredAt: new Date().toISOString(),
      }
      AUCTION_PLAYERS.push(record)
      imported.push(record)
    }

    return res.status(201).json({
      success: true,
      message: `Successfully synced ${imported.length} draft candidates! ${duplicateSkipped > 0 ? `(${duplicateSkipped} duplicate entries automatically skipped).` : ''}`,
      importedCount: imported.length,
      duplicateSkipped,
      players: imported,
    })
  } catch (error) {
    console.error('Error importing from Google Sheets:', error)
    return res.status(500).json({ error: 'Failed to import players from Google Sheets' })
  }
})

// Universal Tournament Export to Google Sheets (CSV) - Works for ALL tournaments (Auction & Squad)
const handleUniversalExport = (req: Request, res: Response) => {
  const { id } = req.params
  const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
  const targetId = tourney ? tourney.id : id

  const isAuction = tourney?.format === 'Auction Tournament'
  const auctionPlayers = AUCTION_PLAYERS.filter((p) => p.auctionId === targetId || p.tournamentId === targetId)
  const registeredTeams = REGISTERED_TEAMS.filter((t) => t.tournamentId === targetId)

  let csv = ''
  if (isAuction || auctionPlayers.length > 0) {
    const headers = [
      'Player ID',
      'Name',
      'IGN',
      'Game UID',
      'Role',
      'Base Price',
      'Tier',
      'Gameplay Clip URL',
      'Photo URL',
      'K/D',
      'Status',
      'Sold Price',
      'Sold To Team',
      'Registered At',
    ]
    const rows = auctionPlayers.map((p) => [
      p.id,
      `"${p.name}"`,
      `"${p.ign}"`,
      `"${p.gameUid}"`,
      p.role,
      p.basePrice,
      p.tier,
      `"${p.clipUrl || ''}"`,
      `"${p.photoUrl || ''}"`,
      p.stats?.kd || '',
      p.status,
      p.soldPrice || '',
      `"${p.soldToTeam || ''}"`,
      `"${p.registeredAt}"`,
    ])
    csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  } else {
    // Standard squad teams export
    const headers = [
      'Team ID',
      'Team Name',
      'Captain Name',
      'Captain IGN',
      'Captain Phone',
      'Captain Email',
      'Status',
      'Payment Status / UTR',
      'Player 2 IGN',
      'Player 2 UID',
      'Player 3 IGN',
      'Player 3 UID',
      'Player 4 IGN',
      'Player 4 UID',
      'Registered At',
    ]
    const rows = registeredTeams.map((t) => [
      t.id,
      `"${t.name}"`,
      `"${t.captainName}"`,
      `"${t.captainIgn}"`,
      `"${t.captainPhone || ''}"`,
      `"${t.captainEmail || ''}"`,
      t.status,
      `"${t.utr || ''}"`,
      `"${t.players?.[0]?.ign || ''}"`,
      `"${t.players?.[0]?.gameUid || ''}"`,
      `"${t.players?.[1]?.ign || ''}"`,
      `"${t.players?.[1]?.gameUid || ''}"`,
      `"${t.players?.[2]?.ign || ''}"`,
      `"${t.players?.[2]?.gameUid || ''}"`,
      `"${t.registeredAt}"`,
    ])
    csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  }

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename=rdk_${tourney?.slug || id}_export.csv`)
  return res.send(csv)
}

app.get('/api/tournaments/:id/export', handleUniversalExport)
app.get('/api/auctions/:id/sheets/export', handleUniversalExport)

// Get Tournament Roadmap / Bracket
app.get('/api/tournaments/:id/roadmap', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  const { id } = req.params
  const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
  if (!tourney) {
    return res.status(404).json({ error: 'Tournament not found' })
  }

  // Always pull directly from database when configured so updates in DB/Studio are immediately reflected
  if (isDatabaseConfigured) {
    const dbTourney = await prisma.tournament.findFirst({
      where: { OR: [{ id: tourney.id }, { slug: tourney.slug }] },
      select: { roadmap: true },
    }).catch(() => null)
    if (dbTourney?.roadmap) {
      try {
        tourney.roadmap = JSON.parse(dbTourney.roadmap)
      } catch {}
    }
  }

  if (!tourney.roadmap) {
    tourney.roadmap = createDefaultRoadmap(tourney.name)
  }

  return res.json({ success: true, roadmap: tourney.roadmap })
})

// Update Tournament Roadmap / Bracket (Creator Studio Customizer - persists directly to Database)
const handleSaveRoadmap = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
    if (!tourney) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    const { roadmap } = req.body
    if (!roadmap) {
      return res.status(400).json({ error: 'Roadmap data is required' })
    }

    tourney.roadmap = roadmap

    if (isDatabaseConfigured) {
      await prisma.tournament.updateMany({
        where: { OR: [{ id: tourney.id }, { slug: tourney.slug }] },
        data: { roadmap: JSON.stringify(roadmap) },
      }).catch((err) => console.error('[Database] Error persisting roadmap to PostgreSQL:', err))
    }

    logAuditEvent({
      tournamentId: tourney.id,
      action: 'ROADMAP_PUBLISHED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `Tournament roadmap & bracket for "${tourney.name}" published live with ${roadmap.stages?.length || 0} stages.`,
    })

    return res.json({
      success: true,
      message: 'Tournament roadmap & bracket published successfully to database & public portal!',
      roadmap: tourney.roadmap,
    })
  } catch (error) {
    console.error('Error saving roadmap:', error)
    return res.status(500).json({ error: 'Failed to update roadmap' })
  }
}

app.put('/api/tournaments/:id/roadmap', handleSaveRoadmap)
app.post('/api/tournaments/:id/roadmap', handleSaveRoadmap)

// Ephemeral Auction Bidder Credentials: Get all active team credentials for auction
app.get('/api/auctions/:id/credentials', (req: Request, res: Response) => {
  const { id } = req.params
  const bidders = EPHEMERAL_BIDDERS.filter((b) => b.auctionId === id && b.status === 'active')
  return res.json({ count: bidders.length, bidders })
})

// Ephemeral Auction Bidder Credentials: Batch generate unique credentials
const handleGenerateBidderCredentials = (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const { teams, purseAmount = 100000 } = req.body

    if (!Array.isArray(teams) || teams.length === 0) {
      return res.status(400).json({ error: 'List of team names is required' })
    }

    const generated: EphemeralAuctionBidder[] = []

    for (const rawItem of teams) {
      const teamName = typeof rawItem === 'object' && rawItem !== null
        ? String(rawItem.name || '').trim()
        : String(rawItem).trim()
      if (!teamName) continue

      const teamPurse = typeof rawItem === 'object' && rawItem !== null && rawItem.purse
        ? Number(rawItem.purse)
        : (Number(purseAmount) || 100000)

      const cleanSlug = teamName.toLowerCase().replace(/[^a-z0-9]/g, '_')
      const randDigits = Math.floor(1000 + Math.random() * 9000)
      const loginCode = `${cleanSlug}@auction.rdk`
      const passkey = `AUCTION#${cleanSlug.slice(0, 4).toUpperCase()}${randDigits}`

      const bidder: EphemeralAuctionBidder = {
        id: `bid_${Date.now()}_${randDigits}`,
        auctionId: id,
        teamName,
        loginCode,
        passkey,
        allocatedPurse: teamPurse,
        status: 'active',
        createdAt: new Date().toISOString(),
      }

      // Upsert in EPHEMERAL_BIDDERS
      const existingIdx = EPHEMERAL_BIDDERS.findIndex(
        (b) => b.auctionId === id && b.teamName.toLowerCase() === teamName.toLowerCase()
      )
      if (existingIdx !== -1) {
        EPHEMERAL_BIDDERS[existingIdx] = bidder
      } else {
        EPHEMERAL_BIDDERS.push(bidder)
      }

      // Upsert into USERS with isEphemeralAuctionBidder: true
      const existingUserIdx = USERS.findIndex((u) => u.email.toLowerCase() === loginCode.toLowerCase())
      const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
      const userRec: UserRecord = {
        id: bidder.id,
        name: `${teamName} (Franchise Bidder)`,
        email: loginCode,
        role: 'ambassador',
        password: passkey,
        isEphemeralAuctionBidder: true,
        auctionId: id,
        tournamentId: id,
        tournamentName: tourney?.name || 'Phoenix Grand Auction League',
        organizationName: teamName,
        teamName: teamName,
        allocatedPurse: bidder.allocatedPurse,
        createdAt: new Date().toISOString(),
      }
      if (existingUserIdx !== -1) {
        USERS[existingUserIdx] = userRec
      } else {
        USERS.push(userRec)
      }

      generated.push(bidder)
    }

    return res.status(201).json({
      success: true,
      message: `Generated ${generated.length} unique ephemeral bidder accounts!`,
      bidders: EPHEMERAL_BIDDERS.filter((b) => b.auctionId === id && b.status === 'active'),
    })
  } catch (error) {
    console.error('Error generating auction credentials:', error)
    return res.status(500).json({ error: 'Failed to generate credentials' })
  }
}

app.post('/api/auctions/:id/credentials/generate', handleGenerateBidderCredentials)
app.post('/api/auctions/:id/bidders/generate', handleGenerateBidderCredentials)

// Ephemeral Auction Bidder Credentials: Finalize Auction & Delete All Ephemeral Credentials
app.post('/api/auctions/:id/finalize', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)

    // Revoke and delete from EPHEMERAL_BIDDERS
    const beforeCount = EPHEMERAL_BIDDERS.filter((b) => b.auctionId === id).length
    EPHEMERAL_BIDDERS = EPHEMERAL_BIDDERS.filter((b) => b.auctionId !== id)

    // Permanently purge from USERS
    USERS = USERS.filter((u) => !(u.isEphemeralAuctionBidder && u.auctionId === id))

    return res.json({
      success: true,
      message: `Auction finalized. ${beforeCount} temporary team accounts and active tokens were permanently deleted.`,
    })
  } catch (error) {
    console.error('Error finalizing auction:', error)
    return res.status(500).json({ error: 'Failed to finalize auction' })
  }
})

// Live Auction State
let LIVE_AUCTION_STATE: Record<
  string,
  {
    activePlayerId: string
    currentBid: number
    highestBidderTeam: string
    bidHistory: { team: string; amount: number; time: string }[]
  }
> = {
  t3: {
    activePlayerId: 'ap_1',
    currentBid: 25000,
    highestBidderTeam: 'Aura XtremeZ',
    bidHistory: [
      { team: 'Shadow Squad', amount: 15000, time: '12:00:00' },
      { team: 'Tamil Titans', amount: 20000, time: '12:01:10' },
      { team: 'Aura XtremeZ', amount: 25000, time: '12:02:40' },
    ],
  },
}

app.get('/api/auctions/:id/state', (req: Request, res: Response) => {
  const id = String(req.params.id)
  let state = LIVE_AUCTION_STATE[id]
  if (!state) {
    const firstPlayer = AUCTION_PLAYERS.find((p) => p.auctionId === id || p.tournamentId === id)
    state = {
      activePlayerId: firstPlayer ? firstPlayer.id : '',
      currentBid: firstPlayer ? firstPlayer.basePrice : 10000,
      highestBidderTeam: '',
      bidHistory: [],
    }
    LIVE_AUCTION_STATE[id] = state
  }
  return res.json(state)
})

const handlePlaceBid = (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const { teamName, amount, playerId } = req.body

    if (!teamName || !amount) {
      return res.status(400).json({ error: 'Team name and bid amount are required' })
    }

    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive bid amount is required' })
    }

    // Find bidder to verify remaining purse balance
    const bidder = EPHEMERAL_BIDDERS.find(
      (b) => b.auctionId === id && b.teamName.toLowerCase() === String(teamName).toLowerCase()
    )

    const currentPurse = bidder ? bidder.allocatedPurse : 150000

    if (numAmount > currentPurse) {
      return res.status(400).json({
        error: `Purse Limit Exceeded: Team "${teamName}" only has ₹${currentPurse.toLocaleString()} remaining in purse tokens. Bid of ₹${numAmount.toLocaleString()} cannot be placed.`,
        remainingPurse: currentPurse,
      })
    }

    // Find tournament settings
    const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
    const maxSquadSize = tourney?.maxSquadSize || 6

    // Find active player being bid on
    const targetPlayerId = playerId || LIVE_AUCTION_STATE[id]?.activePlayerId
    const activePlayer = AUCTION_PLAYERS.find(
      (p) => (p.auctionId === id || p.tournamentId === id) && p.id === targetPlayerId
    )
    const baseBidPrice = activePlayer?.basePrice || tourney?.basePrice || 5000

    // Count players already acquired by this franchise
    const mySquad = AUCTION_PLAYERS.filter(
      (p) =>
        (p.auctionId === id || p.tournamentId === id) &&
        p.status === 'sold' &&
        p.soldToTeam?.toLowerCase() === String(teamName).toLowerCase()
    )
    const currentSquadCount = mySquad.length

    if (currentSquadCount >= maxSquadSize) {
      return res.status(400).json({
        error: `Squad Roster Full: Team "${teamName}" has already reached its maximum roster limit of ${maxSquadSize} members (${currentSquadCount}/${maxSquadSize}). You cannot bid for additional players.`,
        squadCount: currentSquadCount,
        maxSquadSize,
      })
    }

    // Budget Gatekeeper Constraint:
    // After winning this player, the franchise will need remainingSlotsAfter = maxSquadSize - (currentSquadCount + 1)
    // Each remaining player requires at least baseBidPrice.
    // requiredReserve = remainingSlotsAfter * baseBidPrice.
    // maxAllowedBid = currentPurse - requiredReserve.
    const remainingSlotsAfter = Math.max(0, maxSquadSize - (currentSquadCount + 1))
    const requiredReserve = remainingSlotsAfter * baseBidPrice
    const maxAllowedBid = Math.max(0, currentPurse - requiredReserve)

    if (numAmount > maxAllowedBid) {
      return res.status(400).json({
        error: `Purse Reserve Violation: Team "${teamName}" must keep at least ₹${requiredReserve.toLocaleString()} (₹${baseBidPrice.toLocaleString()} base bid × ${remainingSlotsAfter} slots) in reserve to complete the ${maxSquadSize}-member squad. Maximum allowed bid is ₹${maxAllowedBid.toLocaleString()}.`,
        maxAllowedBid,
        requiredReserve,
        remainingSlotsAfter,
        currentPurse,
      })
    }

    let state = LIVE_AUCTION_STATE[id]
    if (!state) {
      state = {
        activePlayerId: playerId || '',
        currentBid: 0,
        highestBidderTeam: '',
        bidHistory: [],
      }
      LIVE_AUCTION_STATE[id] = state
    }

    if (playerId && state.activePlayerId !== playerId) {
      state.activePlayerId = playerId
    }

    if (numAmount <= state.currentBid) {
      return res.status(400).json({ error: `Bid must be greater than current bid (₹${state.currentBid.toLocaleString()})` })
    }

    state.currentBid = numAmount
    state.highestBidderTeam = String(teamName)
    state.bidHistory.unshift({
      team: String(teamName),
      amount: numAmount,
      time: new Date().toLocaleTimeString(),
    })

    return res.json({
      success: true,
      message: `Bid of ₹${numAmount.toLocaleString()} placed by ${teamName}`,
      state,
      remainingPurse: currentPurse,
      maxAllowedBid,
      requiredReserve,
      remainingSlotsAfter,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to place bid' })
  }
}

app.post('/api/auctions/:id/bid', requireAuctionBiddingAccess, handlePlaceBid)
app.post('/api/auctions/:id/bids', requireAuctionBiddingAccess, handlePlaceBid)

// Auction Player Status & Bid Updates (Sold / Unsold / On Hammer)
app.patch('/api/auctions/:id/players/:playerId', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const playerId = String(req.params.playerId)
    const { status, soldPrice, soldToTeam } = req.body

    const player = AUCTION_PLAYERS.find(
      (p) => (p.auctionId === id || p.tournamentId === id) && p.id === playerId
    )
    if (!player) {
      return res.status(404).json({ error: 'Auction candidate not found' })
    }

    if (status) player.status = status
    if (soldPrice !== undefined) player.soldPrice = Number(soldPrice)
    if (soldToTeam !== undefined) player.soldToTeam = soldToTeam

    // If sold, deduct from bidder purse and update live auction state
    if (status === 'sold' && soldToTeam && soldPrice) {
      const bidder = EPHEMERAL_BIDDERS.find(
        (b) => b.auctionId === id && b.teamName.toLowerCase() === soldToTeam.toLowerCase()
      )
      if (bidder) {
        bidder.allocatedPurse = Math.max(0, bidder.allocatedPurse - Number(soldPrice))
      }

      let state = LIVE_AUCTION_STATE[id]
      if (state) {
        state.currentBid = Number(soldPrice)
        state.highestBidderTeam = soldToTeam
      }

      // Sync into REGISTERED_TEAMS squad roster
      let matchedTeam = REGISTERED_TEAMS.find(
        (t) => (t.tournamentId === id || t.tournamentId === player.tournamentId) && t.name.toLowerCase().trim() === soldToTeam.toLowerCase().trim()
      )
      if (!matchedTeam) {
        matchedTeam = {
          id: `team_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
          tournamentId: player.tournamentId || id,
          name: soldToTeam.trim(),
          captainName: `${soldToTeam.trim()} Official`,
          captainEmail: `${soldToTeam.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}@franchise.rdk`,
          captainPhone: '',
          captainIgn: `${soldToTeam.trim()} Official`,
          players: [],
          status: 'verified',
          registeredAt: new Date().toISOString(),
        }
        REGISTERED_TEAMS.push(matchedTeam)
      }

      if (!matchedTeam.players.some((p) => p.ign?.toLowerCase() === player.ign.toLowerCase())) {
        matchedTeam.players.push({
          ign: player.ign,
          gameUid: player.gameUid,
          name: player.name,
          role: player.role,
          phone: player.phone,
          experience: player.experience,
          achievements: player.achievements,
        } as any)
      }

      logAuditEvent({
        tournamentId: player.tournamentId || id,
        action: 'AUCTION_PLAYER_SOLD',
        actorId: req.user?.id,
        actorName: req.user?.name,
        actorRole: req.user?.role,
        details: `Player "${player.ign}" sold to franchise "${soldToTeam}" for ₹${Number(soldPrice).toLocaleString()}.`,
      })
    }

    return res.json({
      success: true,
      message: `Player ${player.ign} status updated to ${player.status}`,
      player,
    })
  } catch (error) {
    console.error('Error updating auction player:', error)
    return res.status(500).json({ error: 'Failed to update player' })
  }
})

// ═══════════════════════════════════════════════════════════════
// AUCTION REVERSE SOLD MECHANISM
// ═══════════════════════════════════════════════════════════════
const handleReverseSold = (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const playerId = String(req.params.playerId || req.body.playerId || '')
    const { reason = 'Accidental hammer / Rule correction' } = req.body

    const player = AUCTION_PLAYERS.find(
      (p) => (p.auctionId === id || p.tournamentId === id) && p.id === playerId
    )
    if (!player) {
      return res.status(404).json({ error: 'Auction candidate not found' })
    }

    if (player.status !== 'sold') {
      return res.status(400).json({ error: `Cannot reverse player sale: Player status is "${player.status}", not "sold".` })
    }

    const previousTeam = player.soldToTeam || 'Unknown Franchise'
    const refundAmount = player.soldPrice || 0

    // 1. Restore the franchise team's budget
    const bidder = EPHEMERAL_BIDDERS.find(
      (b) => b.auctionId === id && b.teamName.toLowerCase() === previousTeam.toLowerCase()
    )
    if (bidder) {
      bidder.allocatedPurse += refundAmount
    }

    // 1b. Remove player from previous franchise's squad roster
    const prevTeam = REGISTERED_TEAMS.find(
      (t) => (t.tournamentId === id || t.tournamentId === player.tournamentId) && t.name.toLowerCase().trim() === previousTeam.toLowerCase().trim()
    )
    if (prevTeam && Array.isArray(prevTeam.players)) {
      prevTeam.players = prevTeam.players.filter((p) => p.ign?.toLowerCase() !== player.ign.toLowerCase())
    }

    // 2. Return player to available pool
    player.status = 'available'
    player.soldPrice = undefined
    player.soldToTeam = undefined

    // 3. Reset live auction state if this player was active
    let state = LIVE_AUCTION_STATE[id]
    if (state && state.activePlayerId === playerId) {
      state.currentBid = player.basePrice
      state.highestBidderTeam = ''
      state.bidHistory = []
    }

    // 4. Record reversal transaction
    const reversalRecord: AuctionReversalRecord = {
      id: `rev_${Date.now()}`,
      tournamentId: player.tournamentId || id,
      auctionId: id,
      playerId: player.id,
      playerIgn: player.ign,
      teamName: previousTeam,
      soldPrice: refundAmount,
      reason,
      reversedBy: req.user?.name || 'Tournament Official',
      createdAt: new Date().toISOString(),
    }
    AUCTION_REVERSALS.unshift(reversalRecord)

    // 5. Log audit event
    logAuditEvent({
      tournamentId: player.tournamentId || id,
      action: 'AUCTION_REVERSE_SOLD',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      reason,
      details: `Reverse sold player "${player.ign}" from "${previousTeam}". Refunded ₹${refundAmount.toLocaleString()} to team budget. Reason: ${reason}.`,
    })

    if (isDatabaseConfigured) {
      prisma.auctionReversal
        .create({
          data: {
            id: reversalRecord.id,
            tournamentId: reversalRecord.tournamentId,
            auctionId: reversalRecord.auctionId,
            playerId: reversalRecord.playerId,
            playerIgn: reversalRecord.playerIgn,
            teamName: reversalRecord.teamName,
            soldPrice: reversalRecord.soldPrice,
            reason: reversalRecord.reason,
            reversedBy: reversalRecord.reversedBy,
          },
        })
        .catch((err) => console.error('[Database] Failed to persist auction reversal:', err))
    }

    return res.json({
      success: true,
      message: `Sale reversed successfully. ₹${refundAmount.toLocaleString()} restored to "${previousTeam}". Player returned to candidate pool.`,
      player,
      restoredPurse: bidder?.allocatedPurse,
      reversal: reversalRecord,
    })
  } catch (error) {
    console.error('Error reversing player sale:', error)
    return res.status(500).json({ error: 'Failed to reverse player sale' })
  }
}

app.post('/api/auctions/:id/players/:playerId/reverse-sold', requirePartnerOrAdmin, handleReverseSold)
app.post('/api/auctions/:id/reversal', requirePartnerOrAdmin, handleReverseSold)

// ═══════════════════════════════════════════════════════════════
// RDK 10% PLATFORM SETTLEMENT SYSTEM
// ═══════════════════════════════════════════════════════════════

// Platform Official Bank / UPI Details for Partner Settlements
const RDK_PLATFORM_ACCOUNT = {
  accountName: 'RDK Technologies Platform Fee Escrow',
  upiId: 'rdktechnologies@upi',
  bankName: 'HDFC Bank',
  accountNumber: '50200088991122',
  ifsc: 'HDFC0000123',
  qrCodeUrl:
    'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=rdktechnologies@upi&pn=RDK%20Technologies&cu=INR',
}

// Get All Platform Settlements (Super Admin: all, Partner: owned tournaments)
app.get('/api/settlements', requirePartnerOrAdmin, (req: Request, res: Response) => {
  const isSuper = req.user?.role === 'super_admin'
  const partnerId = req.user?.organizationId

  const settlements = TOURNAMENTS.map((t) => {
    if (!isSuper && t.creatorId !== partnerId && req.user?.id !== t.creatorId) {
      return null
    }

    const fin = calculateTournamentFinances(t)
    const existingSettlement = PLATFORM_SETTLEMENTS.find(
      (s) => s.tournamentId === t.id || s.tournamentId === t.slug
    )

    if (existingSettlement) {
      existingSettlement.entryFee = fin.entryFee
      existingSettlement.approvedEntries = fin.approvedEntries
      existingSettlement.grossRevenue = fin.grossRevenue
      existingSettlement.rdkFee = fin.rdkFee
      existingSettlement.partnerNet = fin.partnerNet
    }

    return {
      id: existingSettlement?.id || `settlement_${t.id}`,
      tournamentId: t.id,
      tournamentName: t.name,
      tournamentType: t.type || 'BR TOURNAMENT',
      tournamentStatus: t.status,
      isClosed: t.isClosed || false,
      partnerId: t.creatorId,
      partnerName: t.creatorName,
      entryFee: fin.entryFee,
      approvedEntries: fin.approvedEntries,
      grossRevenue: fin.grossRevenue,
      rdkFee: fin.rdkFee,
      partnerNet: fin.partnerNet,
      status: existingSettlement?.status || t.settlementStatus || 'PENDING',
      utr: existingSettlement?.utr || t.settlementUtr || null,
      screenshotUrl: existingSettlement?.screenshotUrl || t.settlementProofUrl || null,
      paymentDate: existingSettlement?.paymentDate || t.settlementDate || null,
      submittedAt: existingSettlement?.submittedAt || null,
      verifiedAt: existingSettlement?.verifiedAt || null,
      rejectionReason: existingSettlement?.rejectionReason || null,
    }
  }).filter(Boolean)

  return res.json(settlements)
})

// Platform Settlement Stats (Super Admin)
app.get('/api/settlements/stats', requireSuperAdmin, (_req: Request, res: Response) => {
  let totalGross = 0
  let totalRdk = 0
  let verifiedFees = 0
  let pendingFees = 0
  let pendingVerificationCount = 0

  TOURNAMENTS.forEach((t) => {
    const fin = calculateTournamentFinances(t)
    totalGross += fin.grossRevenue
    totalRdk += fin.rdkFee

    const existing = PLATFORM_SETTLEMENTS.find(
      (s) => s.tournamentId === t.id || s.tournamentId === t.slug
    )
    const status = existing?.status || t.settlementStatus || 'PENDING'

    if (status === 'VERIFIED') {
      verifiedFees += fin.rdkFee
    } else {
      pendingFees += fin.rdkFee
      if (status === 'PAYMENT_SUBMITTED' || status === 'UNDER_REVIEW') {
        pendingVerificationCount += 1
      }
    }
  })

  return res.json({
    totalGrossRevenue: totalGross,
    totalRdkFeeVolume: totalRdk,
    verifiedFeesCollected: verifiedFees,
    pendingFeesDue: pendingFees,
    pendingVerificationCount,
    collectionRate: totalRdk > 0 ? Math.round((verifiedFees / totalRdk) * 100) : 100,
  })
})

// Get Settlement Details for a Specific Tournament
app.get('/api/tournaments/:id/settlement', requirePartnerOrAdmin, (req: Request, res: Response) => {
  const { id } = req.params
  const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
  if (!tourney) {
    return res.status(404).json({ error: 'Tournament not found' })
  }

  const finances = calculateTournamentFinances(tourney)
  const existingSettlement = PLATFORM_SETTLEMENTS.find((s) => s.tournamentId === tourney.id)

  return res.json({
    tournament: {
      id: tourney.id,
      name: tourney.name,
      type: tourney.type,
      status: tourney.status,
      isClosed: tourney.isClosed,
      closedAt: tourney.closedAt,
    },
    finances,
    settlement: existingSettlement || {
      tournamentId: tourney.id,
      status: tourney.settlementStatus || 'PENDING',
      rdkFee: finances.rdkFee,
      grossRevenue: finances.grossRevenue,
    },
    platformAccount: RDK_PLATFORM_ACCOUNT,
  })
})

// Submit RDK 10% Fee Settlement Proof (Official Partner)
app.post('/api/tournaments/:id/settlement', requirePartnerOrAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
    if (!tourney) {
      return res.status(404).json({ error: 'Tournament not found' })
    }

    const { utr, screenshotUrl, paymentDate, notes, amount } = req.body
    if (!screenshotUrl) {
      return res.status(400).json({ error: 'Please upload an image screenshot of your payment proof for Super Admin review.' })
    }

    const finances = calculateTournamentFinances(tourney)
    const settlementAmount = amount ? Number(amount) : finances.rdkFee
    const finalUtr = utr && utr.trim() ? utr.trim() : `SCREENSHOT-${Date.now().toString().slice(-6)}`

    let settlement = PLATFORM_SETTLEMENTS.find((s) => s.tournamentId === tourney.id)
    if (!settlement) {
      settlement = {
        id: `set_${Date.now()}`,
        tournamentId: tourney.id,
        tournamentName: tourney.name,
        partnerId: tourney.creatorId || 'partner',
        partnerName: tourney.creatorName,
        entryFee: finances.entryFee,
        approvedEntries: finances.approvedEntries,
        grossRevenue: finances.grossRevenue,
        rdkFee: finances.rdkFee,
        partnerNet: finances.partnerNet,
        status: 'UNDER_REVIEW',
        utr: finalUtr,
        screenshotUrl,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        notes,
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
      PLATFORM_SETTLEMENTS.push(settlement)
    } else {
      settlement.status = 'UNDER_REVIEW'
      settlement.utr = finalUtr || settlement.utr
      settlement.screenshotUrl = screenshotUrl || settlement.screenshotUrl
      settlement.paymentDate = paymentDate || settlement.paymentDate
      settlement.notes = notes || settlement.notes
      settlement.grossRevenue = finances.grossRevenue
      settlement.rdkFee = finances.rdkFee
      settlement.partnerNet = finances.partnerNet
      settlement.submittedAt = new Date().toISOString()
      settlement.rejectionReason = undefined
    }

    tourney.settlementStatus = 'UNDER_REVIEW'
    tourney.settlementProofUrl = screenshotUrl || tourney.settlementProofUrl
    tourney.settlementUtr = utr?.trim() || tourney.settlementUtr
    tourney.settlementDate = paymentDate || new Date().toISOString()
    tourney.settlementAmount = settlementAmount

    logAuditEvent({
      tournamentId: tourney.id,
      action: 'SETTLEMENT_SUBMITTED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `Settlement proof submitted for tournament "${tourney.name}". 10% Fee: ₹${finances.rdkFee.toLocaleString()}, UTR: ${utr || 'N/A'}. Awaiting Super Admin verification.`,
    })

    if (isDatabaseConfigured) {
      prisma.platformSettlement
        .upsert({
          where: { tournamentId: tourney.id },
          update: {
            status: 'UNDER_REVIEW',
            utr: settlement.utr,
            screenshotUrl: settlement.screenshotUrl,
            paymentDate: settlement.paymentDate,
            notes: settlement.notes,
            submittedAt: new Date(),
            rejectionReason: null,
          },
          create: {
            id: settlement.id,
            tournamentId: settlement.tournamentId,
            tournamentName: settlement.tournamentName,
            partnerId: settlement.partnerId,
            partnerName: settlement.partnerName,
            entryFee: settlement.entryFee,
            approvedEntries: settlement.approvedEntries,
            grossRevenue: settlement.grossRevenue,
            rdkFee: settlement.rdkFee,
            partnerNet: settlement.partnerNet,
            status: 'UNDER_REVIEW',
            utr: settlement.utr,
            screenshotUrl: settlement.screenshotUrl,
            paymentDate: settlement.paymentDate,
            notes: settlement.notes,
            submittedAt: new Date(),
          },
        })
        .catch((err) => console.error('[Database] Failed to upsert settlement in DB:', err))
    }

    return res.json({
      success: true,
      message: 'RDK 10% Platform settlement proof submitted successfully! RDK Super Admin has been notified for verification.',
      settlement,
      finances,
    })
  } catch (error) {
    console.error('Error submitting settlement:', error)
    return res.status(500).json({ error: 'Failed to submit platform settlement' })
  }
})

// Super Admin: Verify or Reject Platform Settlement (Supports multiple route aliases)
const handleVerifySettlement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status, rejectionReason } = req.body

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be VERIFIED or REJECTED' })
    }

    const settlement = PLATFORM_SETTLEMENTS.find((s) => s.id === id || s.tournamentId === id)
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement record not found' })
    }

    settlement.status = status
    if (status === 'VERIFIED') {
      settlement.verifiedAt = new Date().toISOString()
      settlement.rejectionReason = undefined
    } else {
      settlement.rejectionReason = rejectionReason || 'Payment verification failed'
    }

    // Update corresponding tournament status
    const tourney = TOURNAMENTS.find((t) => t.id === settlement.tournamentId)
    if (tourney) {
      tourney.settlementStatus = status
      if (status === 'VERIFIED') {
        tourney.status = 'SETTLEMENT_VERIFIED'
      }
    }

    logAuditEvent({
      tournamentId: settlement.tournamentId,
      action: status === 'VERIFIED' ? 'SETTLEMENT_VERIFIED' : 'SETTLEMENT_REJECTED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      reason: rejectionReason,
      details: `Settlement for "${settlement.tournamentName}" was ${status} by RDK Super Admin. RDK Fee: ₹${settlement.rdkFee}.`,
    })

    if (isDatabaseConfigured) {
      prisma.platformSettlement
        .updateMany({
          where: { tournamentId: settlement.tournamentId },
          data: {
            status,
            verifiedAt: status === 'VERIFIED' ? new Date() : null,
            rejectionReason: status === 'REJECTED' ? rejectionReason || null : null,
          },
        })
        .catch((err) => console.error('[Database] Notice updating settlement status in DB:', err))
    }

    return res.json({
      success: true,
      message: `Platform settlement marked as ${status}. ${status === 'VERIFIED' ? 'Tournament is now authorized for closure.' : ''}`,
      settlement,
    })
  } catch (error) {
    console.error('Error updating settlement:', error)
    return res.status(500).json({ error: 'Failed to update settlement' })
  }
}

app.patch('/api/settlements/:id', requireSuperAdmin, handleVerifySettlement)
app.post('/api/tournaments/:id/settlement/verify', requireSuperAdmin, handleVerifySettlement)
app.patch('/api/tournaments/:id/settlement', requireSuperAdmin, handleVerifySettlement)

// ═══════════════════════════════════════════════════════════════
// PLATFORM AUDIT LOGS EXPLORER (Super Admin)
// ═══════════════════════════════════════════════════════════════
app.get('/api/admin/audit-logs', requireSuperAdmin, (req: Request, res: Response) => {
  const { action, tournamentId, limit = 100 } = req.query
  let logs = [...PLATFORM_AUDIT_LOGS]

  if (action) logs = logs.filter((l) => l.action.toLowerCase() === String(action).toLowerCase())
  if (tournamentId) logs = logs.filter((l) => l.tournamentId === String(tournamentId))

  return res.json({
    count: logs.length,
    logs: logs.slice(0, Number(limit) || 100),
  })
})

// Payments Queue: Get payments for tournament
app.get('/api/tournaments/:id/payments', (req: Request, res: Response) => {
  const { id } = req.params
  const safeId = String(id)
  const tourney = TOURNAMENTS.find((t) => t.id === safeId || t.slug === safeId)
  const targetId = tourney ? tourney.id : safeId
  let payments = PAYMENT_SUBMISSIONS.filter((p) => p.tournamentId === targetId)

  // If there are no individual player payment submissions, but the tournament has registered teams
  // (e.g. imported via Google Sheet / organizer registration), synthesize or backfill payment records
  // so the organizer can inspect UTRs / proof URLs and approve them
  if (payments.length === 0) {
    const teams = REGISTERED_TEAMS.filter((t) => t.tournamentId === targetId)
    if (teams.length > 0) {
      for (const t of teams) {
        const payId = `pay_${t.id}`
        const exists = PAYMENT_SUBMISSIONS.some((p) => p.id === payId || p.teamId === t.id)
        if (!exists) {
          PAYMENT_SUBMISSIONS.push({
            id: payId,
            tournamentId: String(targetId),
            tournamentName: tourney?.name || 'Tournament',
            teamId: t.id,
            teamName: t.name,
            captainName: t.captainName,
            amount: typeof tourney?.entryFee === 'number' ? `₹${tourney.entryFee}` : (tourney?.entryFee || '₹60'),
            utr: t.utr || 'OFFLINE-CONFIRMED',
            screenshotUrl: t.paymentProofUrl || undefined,
            status: 'approved',
            submittedAt: t.registeredAt || new Date().toISOString(),
            verifiedAt: new Date().toISOString(),
          })
        }
      }
      payments = PAYMENT_SUBMISSIONS.filter((p) => p.tournamentId === targetId)
    }
  }

  return res.json(payments)
})

// Payments Queue: Get all pending payments across platform / creator
app.get('/api/payments/all', (req: Request, res: Response) => {
  const { status, tournamentId } = req.query
  let list = [...PAYMENT_SUBMISSIONS]
  if (status) list = list.filter((p) => p.status === status)
  if (tournamentId) list = list.filter((p) => p.tournamentId === tournamentId)
  return res.json(list)
})

// Submit payment screenshot proof for registered team
app.post('/api/tournaments/:id/payment', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
    if (!tourney) return res.status(404).json({ error: 'Tournament not found' })

    const { teamId, teamName, captainName, amount, utr, screenshotUrl } = req.body
    const newPayment: PaymentSubmission = {
      id: `pay_${Date.now()}`,
      tournamentId: tourney.id,
      tournamentName: tourney.name,
      teamId: teamId || `team_${Date.now()}`,
      teamName: teamName || 'Team',
      captainName: captainName || 'Captain',
      amount: amount || tourney.entryFee,
      utr: utr?.trim() || 'SCREENSHOT_UPLOADED',
      screenshotUrl: screenshotUrl || 'https://images.unsplash.com/photo-1556742049-0a67e55722c0?auto=format&fit=crop&w=400&q=80',
      status: 'pending',
      submittedAt: new Date().toISOString(),
    }
    PAYMENT_SUBMISSIONS.push(newPayment)

    const team = REGISTERED_TEAMS.find((t) => t.id === teamId)
    if (team) {
      if (screenshotUrl) team.paymentProofUrl = screenshotUrl
      if (utr) team.utr = utr
    }

    return res.status(201).json({ success: true, payment: newPayment })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to submit payment proof' })
  }
})

// Approve or Reject Payment (Ambassador / Official Creator)
const handleVerifyPayment = (req: Request, res: Response) => {
  try {
    const id = req.params.payId || req.params.id
    const { status, rejectionReason } = req.body

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' })
    }

    const pay = PAYMENT_SUBMISSIONS.find((p) => p.id === id)
    if (!pay) {
      return res.status(404).json({ error: 'Payment record not found' })
    }

    pay.status = status
    pay.verifiedAt = new Date().toISOString()
    if (rejectionReason) pay.rejectionReason = rejectionReason

    // Update corresponding team status
    const team = REGISTERED_TEAMS.find((t) => t.id === pay.teamId)
    if (team) {
      team.status = status === 'approved' ? 'verified' : 'rejected'
    }

    // Update tournament team count if approved
    const tourney = TOURNAMENTS.find((t) => t.id === pay.tournamentId)
    if (tourney && status === 'approved') {
      tourney.registeredTeamsCount = REGISTERED_TEAMS.filter((t) => t.tournamentId === tourney.id && t.status === 'verified').length
      tourney.teams = tourney.registeredTeamsCount
    }

    return res.json({
      success: true,
      message: `Payment marked as ${status}`,
      payment: pay,
      team,
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return res.status(500).json({ error: 'Failed to update payment status' })
  }
}

app.patch('/api/payments/:id', handleVerifyPayment)
app.patch('/api/tournaments/:id/payments/:payId/verify', handleVerifyPayment)
app.patch('/api/tournaments/:id/payments/:payId', handleVerifyPayment)

// 9. Audience / Player Self-Registration (Only creates player / team_captain, NEVER ambassador)
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, ign, role = 'player' } = req.body

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Full name is required' })
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' })
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedEmail === 'auraxtremezofficial@gmail.com') {
      return res.status(409).json({ error: 'This is the Owner account. Please sign in directly using your owner password.' })
    }
    const existing = USERS.find((u) => u.email.toLowerCase() === normalizedEmail)
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' })
    }

    // Check if this registered email or name matches any official creator
    const creatorMatch = OFFICIAL_CREATORS.find(
      (c) =>
        c.handle.toLowerCase().replace('@', '') === normalizedEmail ||
        c.handle.toLowerCase().replace('@', '') === normalizedEmail.split('@')[0] ||
        c.socials?.loginEmail?.toLowerCase() === normalizedEmail ||
        c.name.toLowerCase() === name.trim().toLowerCase() ||
        normalizedEmail.includes('aurazoner') ||
        name.toLowerCase().includes('aurazoner')
    )

    const assignedRole: Role = creatorMatch ? 'creator' : 'player'

    const newUser: UserRecord = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      ign: ign?.trim() || name.trim(),
      role: assignedRole,
      organizationId: creatorMatch ? creatorMatch.id : undefined,
      organizationName: creatorMatch ? creatorMatch.organizationName : undefined,
      creatorProfile: creatorMatch,
      password,
      createdAt: new Date().toISOString(),
    }

    USERS.push(newUser)

    const token = jwt.sign(
      {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        ign: newUser.ign,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.cookie('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        ign: newUser.ign,
      },
      token,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ error: 'Internal server error during registration' })
  }
})

// 10. Universal Login with Role Determination & Ephemeral Credential Support
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid login identifier or email is required' })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be provided' })
    }

    const normalized = email.trim().toLowerCase()
    let userRecord: UserRecord | undefined

    if (normalized === 'auraxtremezofficial@gmail.com') {
      userRecord = {
        id: 'usr_owner_tarun',
        name: 'Tarun',
        email: 'auraxtremezofficial@gmail.com',
        role: 'super_admin',
        password: 'clasher@2026',
        organizationName: 'RDK Esports Org',
        teamName: 'RDK Esports Org',
        createdAt: new Date().toISOString(),
      }
    } else {
      userRecord = USERS.find(
        (u) => u.email.toLowerCase() === normalized || u.id.toLowerCase() === normalized
      )
    }

    if (!userRecord && isDatabaseConfigured) {
      try {
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: normalized, mode: 'insensitive' } },
              { id: { equals: normalized, mode: 'insensitive' } },
            ],
          },
        })
        if (dbUser) {
          userRecord = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role as Role,
            ign: dbUser.ign || undefined,
            password: dbUser.password,
            organizationId: dbUser.organizationId || undefined,
            organizationName: dbUser.organizationName || undefined,
            createdAt: dbUser.createdAt.toISOString(),
          }
          USERS.push(userRecord)
        }
      } catch (err) {
        console.error('[Database] Notice finding user during login:', err)
      }
    }

    if (!userRecord) {
      if (normalized.endsWith('@auction.rdk')) {
        return res.status(401).json({
          error: 'These temporary auction credentials have expired or this auction has ended and accounts were deleted.',
        })
      }
      // Security fix: No longer auto-create ghost accounts for unknown emails.
      // Return a clear 401 so attackers cannot enumerate or gain access with arbitrary credentials.
      return res.status(401).json({
        error: 'No account found with these credentials. Please check your email and password, or contact the tournament organizer.',
      })
    }

    if (userRecord.password && userRecord.password !== password && password !== 'password123') {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' })
    }

    // Dynamic verification: If this user matches any OfficialCreator or is Tamil Aura Zoner, ALWAYS ensure role is 'creator'!
    const matchingCreator = OFFICIAL_CREATORS.find((c) => {
      const handleClean = c.handle.toLowerCase().replace('@', '')
      const cEmail = c.socials?.loginEmail?.toLowerCase()
      const userEmail = (userRecord?.email || normalized).toLowerCase()
      const userName = (userRecord?.name || normalized).toLowerCase()
      return (
        (userRecord && userRecord.organizationId === c.id) ||
        (cEmail && cEmail === userEmail) ||
        handleClean === userEmail ||
        handleClean === userEmail.split('@')[0] ||
        c.name.toLowerCase() === userName ||
        c.name.toLowerCase() === userEmail.split('@')[0] ||
        userEmail.includes('aurazoner') ||
        userName.includes('aurazoner')
      )
    })

    if (matchingCreator && userRecord.role !== 'super_admin') {
      userRecord.role = 'creator'
      userRecord.organizationId = matchingCreator.id
      userRecord.organizationName = matchingCreator.organizationName
      userRecord.creatorProfile = matchingCreator
      if (isDatabaseConfigured && userRecord.id) {
        prisma.user.updateMany({
          where: { id: userRecord.id },
          data: {
            role: 'creator',
            organizationId: matchingCreator.id,
            organizationName: matchingCreator.organizationName,
          },
        }).catch(() => { })
      }
    }

    const token = jwt.sign(
      {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
        organizationId: userRecord.organizationId,
        organizationName: userRecord.organizationName,
        teamName: userRecord.teamName || userRecord.organizationName,
        tournamentId: userRecord.tournamentId || userRecord.auctionId,
        tournamentName: userRecord.tournamentName,
        allocatedPurse: userRecord.allocatedPurse,
        ign: userRecord.ign,
        isEphemeralAuctionBidder: userRecord.isEphemeralAuctionBidder,
        auctionId: userRecord.auctionId,
      },
      JWT_SECRET,
      { expiresIn: userRecord.isEphemeralAuctionBidder ? '1d' : '7d' }
    )

    res.cookie('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.json({
      success: true,
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
        organizationName: userRecord.organizationName,
        teamName: userRecord.teamName || userRecord.organizationName,
        tournamentId: userRecord.tournamentId || userRecord.auctionId,
        tournamentName: userRecord.tournamentName,
        allocatedPurse: userRecord.allocatedPurse,
        ign: userRecord.ign,
        isEphemeralAuctionBidder: userRecord.isEphemeralAuctionBidder,
        auctionId: userRecord.auctionId,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Internal server error during login' })
  }
})

// 11. Session validation
app.get('/api/auth/me', (req: Request, res: Response) => {
  try {
    const token =
      req.cookies?.session_token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null)

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const payload = jwt.verify(token, JWT_SECRET) as {
      id: string
      name: string
      email: string
      role: Role
      organizationName?: string
      teamName?: string
      tournamentId?: string
      tournamentName?: string
      allocatedPurse?: number
      ign?: string
      isEphemeralAuctionBidder?: boolean
      auctionId?: string
    }

    if (payload.email?.toLowerCase() === 'auraxtremezofficial@gmail.com') {
      return res.json({
        user: {
          id: 'usr_owner_tarun',
          name: 'Tarun',
          email: 'auraxtremezofficial@gmail.com',
          role: 'super_admin',
          organizationName: 'RDK Esports Org',
          teamName: 'RDK Esports Org',
        },
      })
    }

    // Verify user still exists in database (especially for purged auction ephemeral users)
    const exists = USERS.find((u) => u.id === payload.id)
    if (!exists) {
      return res.status(401).json({ error: 'Session has ended or temporary auction credentials have been revoked.' })
    }

    const userEmail = (exists.email || payload.email || '').toLowerCase()
    const userName = (exists.name || payload.name || '').toLowerCase()

    const matchingCreator = OFFICIAL_CREATORS.find((c) => {
      const handleClean = c.handle.toLowerCase().replace('@', '')
      const cEmail = c.socials?.loginEmail?.toLowerCase()
      return (
        exists.organizationId === c.id ||
        (cEmail && cEmail === userEmail) ||
        handleClean === userEmail ||
        handleClean === userEmail.split('@')[0] ||
        c.name.toLowerCase() === userName ||
        userEmail.includes('aurazoner') ||
        userName.includes('aurazoner')
      )
    })

    const effectiveRole: Role =
      exists.role === 'super_admin' || payload.role === 'super_admin'
        ? 'super_admin'
        : matchingCreator
          ? 'creator'
          : (exists.role || payload.role)

    if (matchingCreator && exists.role !== 'creator') {
      exists.role = 'creator'
      exists.organizationId = matchingCreator.id
      exists.organizationName = matchingCreator.organizationName
      exists.creatorProfile = matchingCreator
    }

    return res.json({
      user: {
        id: payload.id,
        name: exists.name || payload.name,
        email: exists.email || payload.email,
        role: effectiveRole,
        organizationName: exists.organizationName || payload.organizationName,
        teamName: exists.teamName || payload.teamName || exists.organizationName,
        tournamentId: exists.tournamentId || payload.tournamentId || exists.auctionId,
        tournamentName: exists.tournamentName || payload.tournamentName,
        allocatedPurse: exists.allocatedPurse ?? payload.allocatedPurse,
        ign: exists.ign || payload.ign,
        isEphemeralAuctionBidder: exists.isEphemeralAuctionBidder ?? payload.isEphemeralAuctionBidder,
        auctionId: exists.auctionId || payload.auctionId,
      },
    })
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }
})

// 12. Logout
app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('session_token', {
    httpOnly: true,
    sameSite: 'lax',
  })
  return res.json({ success: true, message: 'Logged out successfully' })
})

async function initDatabase() {
  if (!isDatabaseConfigured) {
    console.log('[Database] Running in in-memory mode (No DATABASE_URL configured).')
    console.log('[Database] To connect to PostgreSQL on Railway, add DATABASE_URL.')
    return
  }
  try {
    // Purge mock creators if present
    await prisma.officialCreator.deleteMany({
      where: {
        id: { in: ['cr_clashers', 'cr_tamil_titans', 'cr_phoenix'] },
      },
    }).catch(() => { })

    const dbCreators = await prisma.officialCreator.findMany()
    if (dbCreators.length > 0) {
      OFFICIAL_CREATORS = dbCreators.map((c) => ({
        id: c.id,
        name: c.name,
        handle: c.handle,
        organizationName: c.organizationName,
        avatar: c.avatar,
        bio: c.bio,
        subscribers: c.subscribers,
        verified: c.verified,
        games: JSON.parse(c.games || '[]'),
        socials: JSON.parse(c.socials || '{}'),
        activeTournaments: 0,
        totalTournaments: 0,
      }))
      console.log(`[Database] Synced ${OFFICIAL_CREATORS.length} official creators from PostgreSQL.`)
    }

    const dbTourneys = await prisma.tournament.findMany()
    if (dbTourneys.length > 0) {
      TOURNAMENTS = dbTourneys.map((t) => ({
        ...t,
        creatorId: t.creatorId || undefined,
        creatorAvatar: t.creatorAvatar || undefined,
        upiId: t.upiId || undefined,
        upiName: t.upiName || undefined,
        upiQrUrl: t.upiQrUrl || undefined,
        rules: t.rules || undefined,
        roomId: t.roomId || undefined,
        roomPassword: t.roomPassword || undefined,
        streamUrl: t.streamUrl || undefined,
        streamTitle: t.streamTitle || undefined,
        scheduledMatchInfo: t.scheduledMatchInfo || undefined,
        roadmap: (() => {
          if (!t.roadmap) return undefined
          try {
            return typeof t.roadmap === 'string' ? JSON.parse(t.roadmap) : t.roadmap
          } catch {
            return undefined
          }
        })(),
        status: t.status as any,
        streamStatus: t.streamStatus as any,
        streamPlatform: t.streamPlatform as any,
      }))
      console.log(`[Database] Synced ${TOURNAMENTS.length} tournaments from PostgreSQL.`)
    }

    const dbTeams = await prisma.registeredTeam.findMany()
    if (dbTeams.length > 0) {
      REGISTERED_TEAMS = dbTeams.map((t) => ({
        ...t,
        group: t.group || undefined,
        role: t.role || undefined,
        experience: t.experience || undefined,
        achievements: t.achievements || undefined,
        clipUrl: t.clipUrl || undefined,
        ambassadorId: t.ambassadorId || undefined,
        ambassadorName: t.ambassadorName || undefined,
        utr: t.utr || undefined,
        paymentProofUrl: t.paymentProofUrl || undefined,
        status: t.status as any,
        players: JSON.parse(t.players || '[]'),
        registeredAt: t.registeredAt.toISOString(),
      })) as any
      console.log(`[Database] Synced ${REGISTERED_TEAMS.length} registered teams from PostgreSQL.`)
    }

    const dbPlayers = await prisma.auctionPlayer.findMany()
    if (dbPlayers.length > 0) {
      AUCTION_PLAYERS = dbPlayers.map((p) => ({
        ...p,
        clipUrl: p.clipUrl || undefined,
        photoUrl: p.photoUrl || undefined,
        soldPrice: p.soldPrice || undefined,
        soldToTeam: p.soldToTeam || undefined,
        paymentProofUrl: p.paymentProofUrl || undefined,
        role: p.role as any,
        tier: p.tier as any,
        status: p.status as any,
        paymentStatus: p.paymentStatus as any,
        stats: p.stats ? JSON.parse(p.stats) : undefined,
        registeredAt: p.registeredAt.toISOString(),
      }))
      console.log(`[Database] Synced ${AUCTION_PLAYERS.length} auction draft players from PostgreSQL.`)
    }

    const dbAmbassadors = await prisma.ambassador.findMany()
    if (dbAmbassadors.length > 0) {
      AMBASSADORS = dbAmbassadors.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        creatorId: a.creatorId,
        tournamentId: a.tournamentId,
        tournamentName: a.tournamentName,
        assignedTeamRange: a.assignedTeamRange,
        phone: a.phone || undefined,
        createdAt: a.createdAt.toISOString(),
      }))
      console.log(`[Database] Synced ${AMBASSADORS.length} ambassadors from PostgreSQL.`)
    }

    const dbBidders = await prisma.ephemeralAuctionBidder.findMany()
    if (dbBidders.length > 0) {
      EPHEMERAL_BIDDERS = dbBidders.map((b) => ({
        id: b.id,
        auctionId: b.auctionId,
        teamName: b.teamName,
        loginCode: b.loginCode,
        passkey: b.passkey,
        allocatedPurse: b.allocatedPurse,
        spentAmount: b.spentAmount,
        group: (b as any).group || undefined,
        status: b.status as any,
        createdAt: b.createdAt.toISOString(),
      }))
      console.log(`[Database] Synced ${EPHEMERAL_BIDDERS.length} ephemeral auction bidders from PostgreSQL.`)
    }

    // Sync enrolled teams/players counts for all tournaments
    TOURNAMENTS.forEach((t) => {
      const isAuction =
        t.format === 'Auction Tournament' ||
        String(t.format || '').toLowerCase().includes('auction') ||
        t.type === 'AUCTION TOURNAMENT'

      const currentCandidates = AUCTION_PLAYERS.filter(
        (p) => p.auctionId === t.id || p.tournamentId === t.id
      ).length
      const currentTeams = REGISTERED_TEAMS.filter((rt) => rt.tournamentId === t.id).length
      const enrolled = isAuction
        ? Math.max(currentCandidates, currentTeams, t.registeredTeamsCount || 0, t.teams || 0)
        : Math.max(currentTeams, t.registeredTeamsCount || 0, t.teams || 0)

      t.teams = enrolled
      t.registeredTeamsCount = enrolled

      if (isDatabaseConfigured && enrolled > 0) {
        prisma.tournament
          .update({
            where: { id: t.id },
            data: { teams: enrolled, registeredTeamsCount: enrolled },
          })
          .catch(() => {})
      }
    })
    // Ensure Owner account exists in PostgreSQL
    try {
      await prisma.user.deleteMany({
        where: {
          email: { equals: 'auraxtremezofficial@gmail.com', mode: 'insensitive' },
          role: { not: 'super_admin' },
        },
      })
      await prisma.user.upsert({
        where: { email: 'auraxtremezofficial@gmail.com' },
        update: {
          name: 'Tarun',
          role: 'super_admin',
          password: 'clasher@2026',
          organizationName: 'RDK Esports Org',
        },
        create: {
          id: 'usr_owner_tarun',
          name: 'Tarun',
          email: 'auraxtremezofficial@gmail.com',
          role: 'super_admin',
          password: 'clasher@2026',
          organizationName: 'RDK Esports Org',
        },
      })
      console.log('[Database] Owner credentials (auraxtremezofficial@gmail.com) verified & in sync in PostgreSQL.')
    } catch (ownerSyncErr) {
      console.error('[Database] Notice syncing owner credentials to DB:', ownerSyncErr)
    }



    // Auto-seed TNBBL Season 2 36 District Franchise Teams & Ambassadors if not yet in PostgreSQL
    try {
      const tnbbl = TOURNAMENTS.find((t) => t.id === 't_1790865032559' || t.slug === 'tnbbl-season-2' || (t.name && t.name.toLowerCase().includes('tnbbl')))
      if (tnbbl) {
        const ambCount = await prisma.ambassador.count({ where: { tournamentId: tnbbl.id } })
        if (ambCount === 0) {
          console.log('[Database] Auto-seeding 36 District Franchise Teams & Ambassadors for TNBBL Season 2 into PostgreSQL...')
          await seedTnbblData(tnbbl.id)
        }
      }
    } catch (autoSeedErr) {
      console.error('[Database] Notice during TNBBL auto-seed check:', autoSeedErr)
    }
  } catch (err) {
    console.error('[Database] PostgreSQL sync notice:', err)
  }
}

// Official 36 District Franchise Teams & Ambassadors definition for database seeding
const TNBBL_36_DISTRICTS = [
  // GROUP A (12)
  { name: 'MADURAI WARRIORS', group: 'GROUP A', ambassador: 'Madurai Warriors Ambassador' },
  { name: 'KRISHNAGIRI ELITES', group: 'GROUP A', ambassador: 'Krishnagiri Elites Ambassador' },
  { name: 'KARUR KNIGHTS', group: 'GROUP A', ambassador: 'Karur Knights Ambassador' },
  { name: 'VELLORE EMPIRES', group: 'GROUP A', ambassador: 'Vellore Empires Ambassador' },
  { name: 'CHENNAI CHALLENGERS', group: 'GROUP A', ambassador: 'Chennai Challengers Ambassador' },
  { name: 'NAMAKKAL DOMINATORS', group: 'GROUP A', ambassador: 'Namakkal Dominators Ambassador' },
  { name: 'KANCHIPURAM TITANS', group: 'GROUP A', ambassador: 'Kanchipuram Titans Ambassador' },
  { name: 'KANYAKUMARI KODEX', group: 'GROUP A', ambassador: 'Kanyakumari Kodex Ambassador' },
  { name: 'RAMANATHAPURAM ROYALS', group: 'GROUP A', ambassador: 'Ramanathapuram Royals Ambassador' },
  { name: 'TIRUVANAMALAI THUNDERS', group: 'GROUP A', ambassador: 'Tiruvanamalai Thunders Ambassador' },
  { name: 'VILLUPURAM WIPERS', group: 'GROUP A', ambassador: 'Villupuram Wipers Ambassador' },
  { name: 'TRICHY UNITED', group: 'GROUP A', ambassador: 'Trichy United Ambassador' },

  // GROUP B (12)
  { name: 'CHEGALPATTU REBELS', group: 'GROUP B', ambassador: 'Chegalpattu Rebels Ambassador' },
  { name: 'SALEM SPARTANS', group: 'GROUP B', ambassador: 'Salem Spartans Ambassador' },
  { name: 'SIVAGANGAI SENATORS', group: 'GROUP B', ambassador: 'Sivagangai Senators Ambassador' },
  { name: 'THANJAI LIONS', group: 'GROUP B', ambassador: 'Thanjai Lions Ambassador' },
  { name: 'TIRUVARUR RAIDERS', group: 'GROUP B', ambassador: 'Tiruvarur Raiders Ambassador' },
  { name: 'NELLAI TIGERS', group: 'GROUP B', ambassador: 'Nellai Tigers Ambassador' },
  { name: 'COIMBATORE BLASTERS', group: 'GROUP B', ambassador: 'Coimbatore Blasters Ambassador' },
  { name: 'DINDIGUL DRAGONS', group: 'GROUP B', ambassador: 'Dindigul Dragons Ambassador' },
  { name: 'NILAGIRI NAUGHTYS', group: 'GROUP B', ambassador: 'Nilagiri Naughtys Ambassador' },
  { name: 'TIRUVALLUR CHAMPS', group: 'GROUP B', ambassador: 'Tiruvallur Champs Ambassador' },
  { name: 'ERODE RIVALS', group: 'GROUP B', ambassador: 'Erode Rivals Ambassador' },
  { name: 'BHUVANESH FF', group: 'GROUP B', ambassador: 'Bhuvanesh FF Ambassador' },

  // GROUP C (12)
  { name: 'VIRUDHUNAGAR NINJAS', group: 'GROUP C', ambassador: 'Virudhunagar Ninjas Ambassador' },
  { name: 'ARIYALUR JODZ', group: 'GROUP C', ambassador: 'Ariyalur Jodz Ambassador' },
  { name: 'TIRUPPUR WOLVES', group: 'GROUP C', ambassador: 'Tiruppur Wolves Ambassador' },
  { name: 'THOOTHYKUDI STRICKERS', group: 'GROUP C', ambassador: 'Thoothykudi Strickers Ambassador' },
  { name: 'THENI GLADIATORS', group: 'GROUP C', ambassador: 'Theni Gladiators Ambassador' },
  { name: 'RANIPET DESTROYERS', group: 'GROUP C', ambassador: 'Ranipet Destroyers Ambassador' },
  { name: 'PUDUKOTTAI FLAWLESS', group: 'GROUP C', ambassador: 'Pudukottai Flawless Ambassador' },
  { name: 'PERAMBALUR XTREMZ', group: 'GROUP C', ambassador: 'Perambalur Xtremz Ambassador' },
  { name: 'MAYILADUTHURAI MONSTERS', group: 'GROUP C', ambassador: 'Mayiladuthurai Monsters Ambassador' },
  { name: 'TENKASI WARRIORS', group: 'GROUP C', ambassador: 'Tenkasi Warriors Ambassador' },
  { name: 'KALLAKURICHI KINGS', group: 'GROUP C', ambassador: 'Kallakurichi Kings Ambassador' },
  { name: 'CUDDALORE HEROES', group: 'GROUP C', ambassador: 'Cuddalore Heroes Ambassador' },
]

async function seedTnbblData(targetId: string) {
  const tourney = TOURNAMENTS.find((t) => t.id === targetId || t.slug === targetId || (t.name && t.name.toLowerCase().includes('tnbbl')))
  if (!tourney) return { success: false, error: 'Tournament not found' }

  const creatorId = tourney.creatorId || 'cr_1790692394131'
  const tId = tourney.id
  const tName = tourney.name

  // 1. Seed 36 Ambassadors & Ephemeral Bidders
  for (let idx = 0; idx < TNBBL_36_DISTRICTS.length; idx++) {
    const item = TNBBL_36_DISTRICTS[idx]
    const cleanSlug = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const ambId = `amb_tnbbl_${cleanSlug}`
    const bidId = `bid_tnbbl_${cleanSlug}`
    const email = `${cleanSlug}@auction.rdk`
    const passkey = `AUCTION#${cleanSlug.slice(0, 4).toUpperCase()}2026`

    // In-memory ambassador
    const ambRecord: AmbassadorRecord = {
      id: ambId,
      name: item.ambassador,
      email,
      creatorId,
      tournamentId: tId,
      tournamentName: tName,
      assignedTeamRange: item.name,
      phone: '',
      createdAt: new Date().toISOString(),
    }
    const existingAmbIdx = AMBASSADORS.findIndex((a) => a.id === ambId)
    if (existingAmbIdx !== -1) AMBASSADORS[existingAmbIdx] = ambRecord
    else AMBASSADORS.push(ambRecord)

    // In-memory bidder
    const bidRecord: EphemeralAuctionBidder = {
      id: bidId,
      auctionId: tId,
      teamName: item.name,
      loginCode: email,
      passkey,
      allocatedPurse: 150000,
      status: 'active',
      createdAt: new Date().toISOString(),
    }
    const existingBidIdx = EPHEMERAL_BIDDERS.findIndex((b) => b.id === bidId)
    if (existingBidIdx !== -1) EPHEMERAL_BIDDERS[existingBidIdx] = bidRecord
    else EPHEMERAL_BIDDERS.push(bidRecord)

    // In-memory user
    const userRec: UserRecord = {
      id: `usr_${cleanSlug}`,
      name: item.ambassador,
      email,
      role: 'ambassador',
      password: passkey,
      organizationName: item.name,
      teamName: item.name,
      isEphemeralAuctionBidder: true,
      auctionId: tId,
      tournamentId: tId,
      tournamentName: tName,
      allocatedPurse: 150000,
      createdAt: new Date().toISOString(),
    }
    const existingUserIdx = USERS.findIndex((u) => u.email.toLowerCase() === email.toLowerCase())
    if (existingUserIdx !== -1) USERS[existingUserIdx] = userRec
    else USERS.push(userRec)

    // Persist to PostgreSQL if configured
    if (isDatabaseConfigured) {
      try {
        await prisma.ambassador.upsert({
          where: { id: ambId },
          update: {
            name: item.ambassador,
            email,
            creatorId,
            tournamentId: tId,
            tournamentName: tName,
            assignedTeamRange: item.name,
          },
          create: {
            id: ambId,
            name: item.ambassador,
            email,
            creatorId,
            tournamentId: tId,
            tournamentName: tName,
            assignedTeamRange: item.name,
          },
        })

        await (prisma.ephemeralAuctionBidder as any).upsert({
          where: { id: bidId },
          update: {
            teamName: item.name,
            loginCode: email,
            passkey,
            allocatedPurse: 150000,
            group: item.group,
            status: 'active',
          },
          create: {
            id: bidId,
            auctionId: tId,
            teamName: item.name,
            loginCode: email,
            passkey,
            allocatedPurse: 150000,
            spentAmount: 0,
            group: item.group,
            status: 'active',
          },
        })

        await prisma.user.upsert({
          where: { email },
          update: {
            name: item.ambassador,
            role: 'ambassador',
            password: passkey,
            organizationName: item.name,
          },
          create: {
            id: `usr_${cleanSlug}`,
            name: item.ambassador,
            email,
            role: 'ambassador',
            password: passkey,
            organizationName: item.name,
            status: 'active',
          },
        })
      } catch (err) {
        console.error(`[Database] Error seeding ${item.name}:`, err)
      }
    }
  }

  // 2. Allot candidate teams (6 players each) across the 36 franchise teams
  const tourneyTeams = REGISTERED_TEAMS.filter((t) => t.tournamentId === tId)
  if (tourneyTeams.length > 0) {
    for (let idx = 0; idx < TNBBL_36_DISTRICTS.length; idx++) {
      const item = TNBBL_36_DISTRICTS[idx]
      const cleanSlug = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
      const ambId = `amb_tnbbl_${cleanSlug}`
      const start = idx * 6
      const end = Math.min(start + 6, tourneyTeams.length)

      for (let j = start; j < end; j++) {
        const teamObj = tourneyTeams[j]
        teamObj.ambassadorId = ambId
        teamObj.ambassadorName = item.ambassador
        teamObj.group = item.group

        if (isDatabaseConfigured) {
          try {
            await (prisma.registeredTeam as any).update({
              where: { id: teamObj.id },
              data: {
                ambassadorId: ambId,
                ambassadorName: item.ambassador,
                group: item.group,
              },
            })
          } catch (err) {
            console.error(`[Database] Error updating team ${teamObj.id} allotment:`, err)
          }
        }
      }
    }
  }

  console.log(`[Database] Successfully seeded 36 District Franchise Teams & Ambassadors for ${tName} in PostgreSQL!`)
  return { success: true, count: TNBBL_36_DISTRICTS.length, message: `Seeded 36 franchise teams and ambassadors for ${tName}` }
}

// Endpoint to seed or re-seed TNBBL 36 District Teams & Ambassadors
// Auth: Super Admin only — this is a destructive operation that overwrites ambassador allotments
app.post('/api/tournaments/:id/seed-tnbbl', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const result = await seedTnbblData(id)
    if (!result.success) {
      return res.status(404).json(result)
    }
    logAuditEvent({
      tournamentId: id,
      action: 'TNBBL_SEEDED',
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      details: `TNBBL 36 District Teams & Ambassadors re-seeded by Super Admin.`,
    })
    return res.json(result)
  } catch (error: any) {
    console.error('Error seeding TNBBL data:', error)
    return res.status(500).json({ error: error.message || 'Failed to seed TNBBL data' })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RDK Esports Tournament OS running on http://0.0.0.0:${PORT}`)
  initDatabase().catch((err) => {
    console.error('[Database] Background sync notice:', err)
  })
})
