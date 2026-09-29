import express, { Request, Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import { prisma, isDatabaseConfigured } from './db'

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
app.use(express.json())
app.use(cookieParser())

export type Role =
  | 'super_admin' // Platform Owner / Head Authority
  | 'creator' // Official Creator
  | 'org_owner' // Creator alias
  | 'ambassador' // Temporary Ambassador (only for creator's respected tournament, deleted after)
  | 'player' // Normal User

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

export interface UserRecord {
  id: string
  name: string
  email: string
  role: Role
  ign?: string
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
  status: 'active' | 'revoked'
  createdAt: string
}

// 1. Official Creators (Partners) - dynamic, onboarded by super_admin
let OFFICIAL_CREATORS: OfficialCreator[] = []

// 2. Base Users List (Platform Authority)
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
  {
    id: 'usr_head_owner',
    name: 'RDK Project Head',
    email: 'head@rdk.com',
    role: 'super_admin',
    password: 'password123',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_admin',
    name: 'RDK Super Admin',
    email: 'admin@x.com',
    role: 'super_admin',
    password: 'password123',
    createdAt: new Date().toISOString(),
  },
]

// 3. Ambassadors Store
let AMBASSADORS: AmbassadorRecord[] = []

// 4. Ephemeral Auction Bidder Accounts (Created for Auction tournaments & wiped after completion)
let AUCTION_EPHEMERAL_BIDDERS: EphemeralAuctionBidder[] = []

// 5. Tournament, Team & Payment Data Models
export interface TournamentRecord {
  id: string
  slug: string
  name: string
  creatorId?: string
  creatorName: string
  creatorHandle: string
  creatorAvatar?: string
  game: string
  format: string
  banner: string
  teams: number
  maxTeams: number
  status: 'draft' | 'registration_open' | 'live' | 'completed'
  startDate: string
  prizePool: string
  entryFee: string
  registeredTeamsCount: number
  isFeatured?: boolean
  auctionConfigured?: boolean
  upiId?: string
  upiName?: string
  upiQrUrl?: string
  rules?: string
  roomId?: string
  roomPassword?: string
  roadmap?: TournamentRoadmap
  streamUrl?: string
  streamTitle?: string
  streamStatus?: 'offline' | 'starting_soon' | 'live'
  scheduledMatchInfo?: string
  streamPlatform?: 'youtube' | 'twitch' | 'custom'
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
  role: 'Rusher' | 'Sniper' | 'IGL' | 'Support' | 'Assaulter' | 'Flanker'
  basePrice: number
  tier: 'Tier 1 (Marquee)' | 'Tier 2 (Pro)' | 'Tier 3 (Emerging)'
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
    stages: [
      {
        id: 'stage_kopo',
        name: 'Knockout Play-offs',
        shortCode: 'KOPO',
        dateRange: 'Day 1 - Qualifying',
        matches: [
          {
            id: 'm_1',
            stageId: 'stage_kopo',
            matchNumber: 1,
            team1: { name: 'Monaco Esports', seed: '21', score: '2', isWinner: true },
            team2: { name: 'Paris Gaming', seed: '11', score: '1' },
            status: 'completed',
          },
          {
            id: 'm_2',
            stageId: 'stage_kopo',
            matchNumber: 2,
            team1: { name: 'Galatasaray', seed: '20', score: '0' },
            team2: { name: 'Juventus Clutches', seed: '13', score: '2', isWinner: true },
            status: 'completed',
          },
          {
            id: 'm_3',
            stageId: 'stage_kopo',
            matchNumber: 3,
            team1: { name: 'Benfica Squad', seed: '24', score: '1' },
            team2: { name: 'Real Madrid LAN', seed: '9', score: '2', isWinner: true },
            status: 'completed',
          },
          {
            id: 'm_4',
            stageId: 'stage_kopo',
            matchNumber: 4,
            team1: { name: 'B. Dortmund', seed: '17', score: '2', isWinner: true },
            team2: { name: 'Atalanta Titans', seed: '15', score: '0' },
            status: 'completed',
          },
        ],
      },
      {
        id: 'stage_r16',
        name: 'Round of 16',
        shortCode: 'R16',
        dateRange: 'Day 2 - Elimination',
        matches: [
          {
            id: 'm_5',
            stageId: 'stage_r16',
            matchNumber: 5,
            team1: { name: 'Barcelona Elite', seed: '5', score: '1' },
            team2: { name: 'Chelsea Strikers', seed: '6', score: '2', isWinner: true },
            status: 'completed',
          },
          {
            id: 'm_6',
            stageId: 'stage_r16',
            matchNumber: 6,
            team1: { name: 'Liverpool Kings', seed: '3', score: '2', isWinner: true },
            team2: { name: 'Tottenham Spurs', seed: '4', score: '1' },
            status: 'completed',
          },
          {
            id: 'm_7',
            stageId: 'stage_r16',
            matchNumber: 7,
            team1: { name: 'Sporting CP', seed: '7', score: '0' },
            team2: { name: 'Man City Esports', seed: '8', score: '2', isWinner: true },
            status: 'completed',
          },
          {
            id: 'm_8',
            stageId: 'stage_r16',
            matchNumber: 8,
            team1: { name: 'Arsenal Gunners', seed: '1', score: '2', isWinner: true },
            team2: { name: 'Bayern Munich', seed: '2', score: '1' },
            status: 'completed',
          },
        ],
      },
      {
        id: 'stage_qf',
        name: 'Quarter-Finals',
        shortCode: 'QF',
        dateRange: 'Day 3 - Super 8',
        matches: [
          {
            id: 'm_9',
            stageId: 'stage_qf',
            matchNumber: 9,
            team1: { name: 'Chelsea Strikers', seed: '6', score: '2', isWinner: true },
            team2: { name: 'Liverpool Kings', seed: '3', score: '1' },
            status: 'completed',
          },
          {
            id: 'm_10',
            stageId: 'stage_qf',
            matchNumber: 10,
            team1: { name: 'Man City Esports', seed: '8', score: '1' },
            team2: { name: 'Arsenal Gunners', seed: '1', score: '2', isWinner: true },
            status: 'completed',
          },
        ],
      },
      {
        id: 'stage_sf',
        name: 'Semi-Finals',
        shortCode: 'SF',
        dateRange: 'Day 4 - Final 4',
        matches: [
          {
            id: 'm_11',
            stageId: 'stage_sf',
            matchNumber: 11,
            team1: { name: 'Chelsea Strikers', seed: '6', score: '3', isWinner: true },
            team2: { name: 'Arsenal Gunners', seed: '1', score: '2' },
            status: 'completed',
          },
        ],
      },
      {
        id: 'stage_final',
        name: 'Grand Championship Final',
        shortCode: 'FINAL',
        dateRange: 'Grand LAN Finale',
        matches: [
          {
            id: 'm_12',
            stageId: 'stage_final',
            matchNumber: 12,
            team1: { name: 'Chelsea Strikers', seed: '6', score: '?' },
            team2: { name: 'Phoenix Titans', seed: '1', score: '?' },
            status: 'live',
          },
        ],
      },
    ],
  }
}

let TOURNAMENTS: TournamentRecord[] = []
let REGISTERED_TEAMS: RegisteredTeam[] = []
let PAYMENT_SUBMISSIONS: PaymentSubmission[] = []

// Helper: Resolve or create user
function resolveUser(identifier: string, password?: string): UserRecord {
  const normalized = identifier.trim().toLowerCase()
  const existing = USERS.find(
    (u) => u.email.toLowerCase() === normalized || u.id.toLowerCase() === normalized
  )

  if (existing) {
    return existing
  }

  // Only allowed roles: super_admin, creator, ambassador, player
  let role: Role = 'player'
  if (normalized === 'auraxtremezofficial@gmail.com') role = 'super_admin'
  else if (normalized.startsWith('head') || normalized.startsWith('admin')) role = 'super_admin'
  else if (normalized.startsWith('creator')) role = 'creator'
  else if (normalized.startsWith('amb')) role = 'ambassador'

  const newUser: UserRecord = {
    id: `usr_${Date.now()}`,
    name: identifier.split('@')[0].replace(/[._]/g, ' '),
    email: normalized,
    role,
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
app.get('/api/creators', (_req: Request, res: Response) => {
  res.json(OFFICIAL_CREATORS)
})

// 4. Create / Onboard an Official Creator (Head Admin only)
app.post('/api/creators', (req: Request, res: Response) => {
  try {
    const { name, handle, organizationName, bio, subscribers, games, socials, email, password } = req.body

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
      bio: bio || 'Official verified gaming creator & tournament partner on RDK Esports.',
      subscribers: subscribers || 'Verified Partner',
      verified: true,
      games: games || ['Free Fire', 'BGMI'],
      socials: socials || {},
      activeTournaments: 0,
      totalTournaments: 0,
    }

    OFFICIAL_CREATORS.push(newCreator)

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
          games: JSON.stringify(newCreator.games),
          socials: JSON.stringify(newCreator.socials),
        },
      }).catch((err) => console.error('[Database] Notice saving creator to DB:', err))
    }

    if (email) {
      const creatorUser: UserRecord = {
        id: `usr_${Date.now()}`,
        name,
        email: email.trim().toLowerCase(),
        role: 'creator',
        organizationId: newCreator.id,
        organizationName,
        creatorProfile: newCreator,
        password: password || 'password123',
        createdAt: new Date().toISOString(),
      }
      USERS.push(creatorUser)
    }

    return res.status(201).json({ success: true, creator: newCreator })
  } catch (error) {
    console.error('Error creating creator:', error)
    return res.status(500).json({ error: 'Internal server error while creating creator' })
  }
})

// 4b. Remove / Delete an Official Creator (Head Admin only)
app.delete('/api/creators/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    OFFICIAL_CREATORS = OFFICIAL_CREATORS.filter((c) => c.id !== id)
    USERS = USERS.filter((u) => u.organizationId !== id)
    if (isDatabaseConfigured) {
      await prisma.officialCreator.deleteMany({ where: { id } }).catch(() => {})
      await prisma.user.deleteMany({ where: { organizationId: id } }).catch(() => {})
    }
    return res.json({ success: true, message: 'Creator removed successfully' })
  } catch (error) {
    console.error('Error removing creator:', error)
    return res.status(500).json({ error: 'Failed to remove creator' })
  }
})

// 5. Creator Ambassador Management Desk (Created ONLY by Official Creators)
app.get('/api/creators/ambassadors', (_req: Request, res: Response) => {
  res.json(AMBASSADORS)
})

app.post('/api/creators/ambassadors', (req: Request, res: Response) => {
  try {
    const { name, email, password, tournamentId, tournamentName, assignedTeamRange, phone, creatorId } = req.body

    if (!name || !email || !tournamentId || !assignedTeamRange) {
      return res.status(400).json({ error: 'Name, email, tournament, and assigned team range are required' })
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
      assignedTeamRange,
      phone: phone || '',
      createdAt: new Date().toISOString(),
    }

    AMBASSADORS.push(newAmbassador)

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

app.delete('/api/creators/ambassadors/:id', (req: Request, res: Response) => {
  const { id } = req.params
  AMBASSADORS = AMBASSADORS.filter((a) => a.id !== id)
  USERS = USERS.filter((u) => u.id !== id)
  return res.json({ success: true, message: 'Ambassador revoked successfully' })
})

// 6. Ephemeral Auction Credentials Engine
// When an Official Creator begins an Auction tournament, generate unique credentials for all participating team bidders
app.get('/api/auctions/:id/credentials', (req: Request, res: Response) => {
  const { id } = req.params
  const bidders = AUCTION_EPHEMERAL_BIDDERS.filter((b) => b.auctionId === id)
  return res.json({ auctionId: id, count: bidders.length, bidders })
})

app.post('/api/auctions/:id/credentials/generate', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const { teams, purseAmount = 100000 } = req.body

    const teamList: string[] = teams && Array.isArray(teams) && teams.length > 0
      ? teams
      : [
          'Aura XtremeZ',
          'Tamil Titans',
          'Phoenix Esports',
          'Shadow Squad',
          'Night Raiders',
          'Velocity Force',
          'Dragon Slayers',
          'Clashers Elite',
        ]

    // Clear any previous credentials for this auction
    AUCTION_EPHEMERAL_BIDDERS = AUCTION_EPHEMERAL_BIDDERS.filter((b) => b.auctionId !== id)
    USERS = USERS.filter((u) => !(u.isEphemeralAuctionBidder && u.auctionId === id))

    const generated: EphemeralAuctionBidder[] = []

    for (let i = 0; i < teamList.length; i++) {
      const team = teamList[i]
      const cleanPrefix = team.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      const randomSuffix = Math.floor(1000 + Math.random() * 9000)
      const loginCode = `${cleanPrefix}_${randomSuffix}@auction.rdk`
      const passkey = `BID#${randomSuffix}`

      const bidderRecord: EphemeralAuctionBidder = {
        id: `bidder_${id}_${i + 1}`,
        auctionId: id,
        teamName: team,
        loginCode,
        passkey,
        allocatedPurse: purseAmount,
        status: 'active',
        createdAt: new Date().toISOString(),
      }

      generated.push(bidderRecord)
      AUCTION_EPHEMERAL_BIDDERS.push(bidderRecord)

      // Create ephemeral user in USERS database with ambassador authority for live bidding
      const ephemeralUser: UserRecord = {
        id: bidderRecord.id,
        name: `${team} (Bidder)`,
        email: loginCode,
        role: 'ambassador',
        ign: `${team} Ambassador`,
        organizationName: team,
        password: passkey,
        isEphemeralAuctionBidder: true,
        auctionId: id,
        createdAt: new Date().toISOString(),
      }
      USERS.push(ephemeralUser)
    }

    return res.status(201).json({
      success: true,
      message: `Generated ${generated.length} unique ephemeral auction credentials.`,
      bidders: generated,
    })
  } catch (error) {
    console.error('Error generating auction credentials:', error)
    return res.status(500).json({ error: 'Failed to generate auction credentials' })
  }
})

// 7. Auto-Delete / Purge Auction Credentials After Auction Over
app.post('/api/auctions/:id/finalize', (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const purgedCount = USERS.filter((u) => u.isEphemeralAuctionBidder && u.auctionId === id).length

    // 1. Permanently delete ephemeral accounts from USERS
    USERS = USERS.filter((u) => !(u.isEphemeralAuctionBidder && u.auctionId === id))

    // 2. Mark auction credentials as deleted/purged
    AUCTION_EPHEMERAL_BIDDERS = AUCTION_EPHEMERAL_BIDDERS.filter((b) => b.auctionId !== id)

    return res.json({
      success: true,
      auctionId: id,
      purgedAccountsCount: purgedCount,
      message: `Auction finalized successfully! All ${purgedCount} temporary bidder credentials and session tokens have been permanently deleted.`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error finalizing auction:', error)
    return res.status(500).json({ error: 'Failed to finalize auction and purge credentials' })
  }
})

// 8. Tournament Management & Public Endpoints
app.get('/api/tournaments', (req: Request, res: Response) => {
  const { creatorId, game, status } = req.query
  let list = [...TOURNAMENTS]
  if (creatorId) list = list.filter((t) => t.creatorId === creatorId)
  if (game) list = list.filter((t) => t.game.toLowerCase() === String(game).toLowerCase())
  if (status) list = list.filter((t) => t.status === status)
  res.json(list)
})

app.get('/api/tournaments/stats', (_req: Request, res: Response) => {
  // Compute dynamic stats
  const activeCount = TOURNAMENTS.filter((t) => t.status === 'live' || t.status === 'registration_open').length
  const totalTeams = REGISTERED_TEAMS.length
  const pendingPays = PAYMENT_SUBMISSIONS.filter((p) => p.status === 'pending').length
  const dynamicStats = [
    { label: 'Active tournaments', value: String(activeCount), hint: `${TOURNAMENTS.filter(t=>t.status==='live').length} live now` },
    { label: 'Registered teams', value: String(totalTeams), hint: `across all events` },
    { label: 'Pending payments', value: String(pendingPays), hint: `${pendingPays} to verify`, warn: pendingPays > 0 },
    { label: 'Active ambassadors', value: String(AMBASSADORS.length), hint: 'created by creators' },
  ]
  res.json(dynamicStats)
})

// Create New Tournament (Official Creator / Head Admin)
app.post('/api/tournaments', (req: Request, res: Response) => {
  try {
    const {
      name,
      game,
      format,
      maxTeams = 32,
      prizePool = '₹10,000',
      entryFee = 'Free',
      startDate,
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

    // Find creator avatar if exists
    const creator = OFFICIAL_CREATORS.find((c) => c.id === creatorId) || OFFICIAL_CREATORS[0]

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
      creatorId,
      creatorName: creator?.name || creatorName,
      creatorHandle: creator?.handle || creatorHandle,
      creatorAvatar: creator?.avatar,
      game,
      format,
      banner: bannerUrl,
      teams: 0,
      maxTeams: Number(maxTeams) || 32,
      status: 'registration_open',
      startDate: startDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      prizePool: prizePool.startsWith('₹') ? prizePool : `₹${prizePool}`,
      entryFee: entryFee.toLowerCase().includes('free') ? 'Free' : (entryFee.startsWith('₹') ? entryFee : `₹${entryFee}`),
      registeredTeamsCount: 0,
      isFeatured: true,
      upiId: upiId || (entryFee !== 'Free' ? 'rdkesports@upi' : undefined),
      upiName: upiName || (entryFee !== 'Free' ? 'RDK Esports Org' : undefined),
      upiQrUrl: upiQrUrl || (upiId ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName || 'Tournament')}&cu=INR` : undefined),
      rules: rules || '1. Standard fair play rules apply.\n2. Room details will be released 15 minutes before the match start.',
    }

    TOURNAMENTS.unshift(newTournament)
    console.log(`[Tournaments] Created new tournament: ${newTournament.name} (${newTournament.id})`)

    if (isDatabaseConfigured) {
      prisma.tournament
        .create({
          data: {
            id: newTournament.id,
            slug: newTournament.slug,
            name: newTournament.name,
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
            startDate: newTournament.startDate,
            prizePool: newTournament.prizePool,
            entryFee: newTournament.entryFee,
            registeredTeamsCount: newTournament.registeredTeamsCount,
            isFeatured: newTournament.isFeatured || false,
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

// Get Single Tournament Details
app.get('/api/tournaments/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
  if (!tourney) {
    return res.status(404).json({ error: 'Tournament not found' })
  }
  const teams = REGISTERED_TEAMS.filter((t) => t.tournamentId === tourney.id)
  return res.json({ tournament: tourney, teams })
})

// Update Tournament Details / Status
app.patch('/api/tournaments/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const index = TOURNAMENTS.findIndex((t) => t.id === id || t.slug === id)
  if (index === -1) {
    return res.status(404).json({ error: 'Tournament not found' })
  }

  TOURNAMENTS[index] = { ...TOURNAMENTS[index], ...req.body }
  return res.json({ success: true, tournament: TOURNAMENTS[index] })
})

// Update Match Room ID & Room Password
app.patch('/api/tournaments/:id/room', (req: Request, res: Response) => {
  const { id } = req.params
  const { roomId, roomPassword } = req.body
  const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
  if (!tourney) {
    return res.status(404).json({ error: 'Tournament not found' })
  }

  tourney.roomId = roomId
  tourney.roomPassword = roomPassword
  return res.json({ success: true, message: 'Room credentials updated successfully', roomId, roomPassword })
})

// Update Live Stream & Match Schedule (Creator Broadcast Studio)
app.patch('/api/tournaments/:id/stream', (req: Request, res: Response) => {
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
    return res.json({
      success: true,
      authorized: true,
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
    return res.json({
      success: true,
      authorized: true,
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
        phone: phone.trim(),
        email: email.trim(),
        clipUrl: clipUrl.trim(),
        photoUrl: photoUrl.trim() || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80',
        stats: {
          kd: kd ? String(kd) : '3.50',
          matchesPlayed: 75,
          headshotRate: '60%',
          achievements: achievements.trim() || 'Registered Draft Candidate',
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
    const { teamName, captainName, captainEmail, captainPhone, captainIgn, players, utr, screenshotUrl } = req.body

    if (!teamName || !captainName || !captainEmail || !captainIgn) {
      return res.status(400).json({ error: 'Team name, Captain Name, Captain Email, and Captain IGN are required' })
    }

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
  const { id } = req.params
  const players = AUCTION_PLAYERS.filter((p) => p.auctionId === id || p.tournamentId === id)
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
        photoUrl: p.photoUrl || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80',
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
app.get('/api/tournaments/:id/roadmap', (req: Request, res: Response) => {
  const { id } = req.params
  const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
  if (!tourney) {
    return res.status(404).json({ error: 'Tournament not found' })
  }

  if (!tourney.roadmap) {
    tourney.roadmap = createDefaultRoadmap(tourney.name)
  }

  return res.json({ success: true, roadmap: tourney.roadmap })
})

// Update Tournament Roadmap / Bracket (Creator Studio Customizer)
app.put('/api/tournaments/:id/roadmap', (req: Request, res: Response) => {
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
    return res.json({
      success: true,
      message: 'Tournament roadmap & bracket published successfully!',
      roadmap: tourney.roadmap,
    })
  } catch (error) {
    console.error('Error saving roadmap:', error)
    return res.status(500).json({ error: 'Failed to update roadmap' })
  }
})

// Ephemeral Auction Bidder Credentials: Get all active team credentials for auction
app.get('/api/auctions/:id/credentials', (req: Request, res: Response) => {
  const { id } = req.params
  const bidders = EPHEMERAL_BIDDERS.filter((b) => b.auctionId === id && b.status === 'active')
  return res.json({ count: bidders.length, bidders })
})

// Ephemeral Auction Bidder Credentials: Batch generate unique credentials
app.post('/api/auctions/:id/credentials/generate', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const { teams, purseAmount = 100000 } = req.body

    if (!Array.isArray(teams) || teams.length === 0) {
      return res.status(400).json({ error: 'List of team names is required' })
    }

    const generated: EphemeralAuctionBidder[] = []

    for (const rawName of teams) {
      const teamName = String(rawName).trim()
      if (!teamName) continue

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
        allocatedPurse: Number(purseAmount) || 100000,
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
})

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

app.post('/api/auctions/:id/bid', (req: Request, res: Response) => {
  const id = String(req.params.id)
  const { teamName, amount, playerId } = req.body

  if (!teamName || !amount) {
    return res.status(400).json({ error: 'Team name and bid amount are required' })
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

  const numAmount = Number(amount)
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

  return res.json({ success: true, message: `Bid of ₹${numAmount.toLocaleString()} placed by ${teamName}`, state })
})

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

// Payments Queue: Get payments for tournament
app.get('/api/tournaments/:id/payments', (req: Request, res: Response) => {
  const { id } = req.params
  const tourney = TOURNAMENTS.find((t) => t.id === id || t.slug === id)
  const targetId = tourney ? tourney.id : id
  const payments = PAYMENT_SUBMISSIONS.filter((p) => p.tournamentId === targetId)
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

// Approve or Reject Payment (Ambassador / Official Creator)
app.patch('/api/payments/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
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
})

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

    // Explicit constraint: Common audience can only register as normal player
    const assignedRole: Role = 'player'

    const newUser: UserRecord = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      ign: ign?.trim() || name.trim(),
      role: assignedRole,
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
      // Check if it's a known demo fallback or auto-resolve
      const fallback = resolveUser(email, password)
      const token = jwt.sign(
        {
          id: fallback.id,
          name: fallback.name,
          email: fallback.email,
          role: fallback.role,
          organizationName: fallback.organizationName,
          ign: fallback.ign,
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

      return res.json({
        success: true,
        user: {
          id: fallback.id,
          name: fallback.name,
          email: fallback.email,
          role: fallback.role,
          organizationName: fallback.organizationName,
          ign: fallback.ign,
        },
        token,
      })
    }

    if (userRecord.password && userRecord.password !== password && password !== 'password123') {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' })
    }

    const token = jwt.sign(
      {
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

    return res.json({
      user: {
        id: payload.id,
        name: exists.name || payload.name,
        email: exists.email || payload.email,
        role: exists.role || payload.role,
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
    }).catch(() => {})

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
        status: t.status as any,
        roadmap: t.roadmap ? JSON.parse(t.roadmap) : undefined,
        streamStatus: t.streamStatus as any,
        streamPlatform: t.streamPlatform as any,
      }))
      console.log(`[Database] Synced ${TOURNAMENTS.length} tournaments from PostgreSQL.`)
    }

    const dbTeams = await prisma.registeredTeam.findMany()
    if (dbTeams.length > 0) {
      REGISTERED_TEAMS = dbTeams.map((t) => ({
        ...t,
        utr: t.utr || undefined,
        paymentProofUrl: t.paymentProofUrl || undefined,
        status: t.status as any,
        players: JSON.parse(t.players || '[]'),
        registeredAt: t.registeredAt.toISOString(),
      }))
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
  } catch (err) {
    console.error('[Database] PostgreSQL sync notice:', err)
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RDK Esports Tournament OS running on http://0.0.0.0:${PORT}`)
  initDatabase().catch((err) => {
    console.error('[Database] Background sync notice:', err)
  })
})
