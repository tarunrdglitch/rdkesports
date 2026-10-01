import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Users,
  Calendar,
  Gamepad2,
  ShieldCheck,
  IndianRupee,
  Share2,
  Copy,
  CheckCircle2,
  AlertCircle,
  QrCode,
  KeyRound,
  Eye,
  ExternalLink,
  ChevronRight,
  Sparkles,
  X,
  Clock,
  Play,
  Upload,
  FileText,
  Video,
  Download,
  Flame,
  User,
  GitBranch,
  Lock,
  ShieldAlert,
  BadgeCheck,
  Unlock,
  Radio,
  Tv,
  Shield,
  Zap,
  Crosshair,
  Target,
} from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { StatusBadge } from '@/components/common/StatusBadge'
import { parseStreamEmbed } from '@/utils/stream'
import { TournamentRoadmapTree, TournamentRoadmap } from '@/components/tournament/TournamentRoadmapTree'
import { compressImageFile } from '@/utils/imageCompressor'
import { SHEET_CLIPS, SHEET_ROLES, SHEET_NAMES } from '@/data/sheetClips'

function getEmbedUrl(url: string): string | null {
  if (!url) return null
  if (url.includes('youtube.com/watch?v=')) {
    const id = url.split('v=')[1]?.split('&')[0]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  if (url.includes('youtube.com/shorts/')) {
    const id = url.split('shorts/')[1]?.split('?')[0]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/file/d/${idMatch[1]}/preview`
    }
  }
  return null
}


interface Tournament {
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
  streamUrl?: string
  streamTitle?: string
  streamStatus?: 'offline' | 'starting_soon' | 'live'
  scheduledMatchInfo?: string
}

interface Team {
  id: string
  name: string
  group?: string
  captainName: string
  captainEmail: string
  captainPhone: string
  captainIgn: string
  players: { ign: string; gameUid: string; name?: string; role?: string; phone?: string; experience?: string; achievements?: string }[]
  status: 'pending' | 'verified' | 'rejected'
  utr?: string
  paymentProofUrl?: string
  ambassadorId?: string
  ambassadorName?: string
  role?: string
  experience?: string
  achievements?: string
  clipUrl?: string
  registeredAt: string
}

interface AuctionPlayer {
  id: string
  auctionId: string
  tournamentId: string
  name: string
  ign: string
  gameUid: string
  role: string
  basePrice: number
  tier: string
  phone: string
  email: string
  clipUrl?: string
  photoUrl?: string
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



function mapTeamsToCandidates(teamList: any[], tourneyId: string = ''): AuctionPlayer[] {
  return teamList.map((t: any, index: number) => {
    const ign = t.captainIgn || t.players?.[0]?.ign || t.name || `Player #${index + 1}`
    const name = t.captainName || t.players?.[0]?.name || ign
    const ignKey = (ign || '').toLowerCase().trim()
    const nameKey = (name || '').toLowerCase().trim()
    const resolvedClipUrl = t.clipUrl || SHEET_CLIPS[ignKey] || SHEET_CLIPS[nameKey] || ''
    const realRole = SHEET_ROLES[ignKey] || SHEET_ROLES[nameKey] || t.role || 'Rusher'
    const realName = name && name !== ign ? name : (SHEET_NAMES[ignKey] || name)

    return {
      id: t.id || `candidate-${index + 1}`,
      auctionId: tourneyId,
      tournamentId: tourneyId,
      name: realName,
      ign,
      gameUid: t.players?.[0]?.gameUid || 'N/A',
      phone: t.captainPhone,
      email: t.captainEmail,
      role: (realRole as any),
      tier: (t.tier || 'Tier 2 (Pro)') as any,
      basePrice: t.basePrice || 5000,
      currentBid: t.currentBid || 5000,
      soldPrice: t.soldPrice,
      soldToTeam: t.soldToTeam || t.ambassadorName,
      status: (t.soldPrice ? 'sold' : 'available') as any,
      paymentStatus: (t.status === 'verified' || t.paymentStatus === 'verified' ? 'verified' : 'pending') as any,
      registeredAt: t.registeredAt || new Date().toISOString(),
      clipUrl: resolvedClipUrl,
      stats: {
        kd: t.kd || '3.80',
        matchesPlayed: 45,
        headshotRate: t.headshotRate || '58%',
        achievements: t.achievements || t.experience || 'Competitive Draft Candidate',
      },
      photoUrl: t.photoUrl && !t.photoUrl.includes('photo-1566492031773-4f4e44671857') ? t.photoUrl : '/gg.png',
    }
  })
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [auctionPlayers, setAuctionPlayers] = useState<AuctionPlayer[]>([])
  const [activeTab, setActiveTab] = useState<'live' | 'overview' | 'teams' | 'auction_pool' | 'roadmap' | 'room' | 'rules'>('overview')
  const [roadmap, setRoadmap] = useState<TournamentRoadmap | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const isAuction = Boolean(tournament && (tournament.format === 'Auction Tournament' || tournament.format.toLowerCase().includes('auction')))

  // Video Montage Clip Modal State
  const [activeClip, setActiveClip] = useState<{ ign: string; name: string; url: string; role: string } | null>(null)

  // Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)

  // Standard Squad Registration State
  const [teamName, setTeamName] = useState('')
  const [captainName, setCaptainName] = useState(user?.name || '')
  const [captainEmail, setCaptainEmail] = useState(user?.email || '')
  const [captainPhone, setCaptainPhone] = useState('')
  const [captainIgn, setCaptainIgn] = useState(user?.ign || '')
  const [player2Ign, setPlayer2Ign] = useState('')
  const [player2Uid, setPlayer2Uid] = useState('')
  const [player3Ign, setPlayer3Ign] = useState('')
  const [player3Uid, setPlayer3Uid] = useState('')
  const [player4Ign, setPlayer4Ign] = useState('')
  const [player4Uid, setPlayer4Uid] = useState('')
  const [player5Ign, setPlayer5Ign] = useState('')
  const [player5Uid, setPlayer5Uid] = useState('')
  const [teamExperience, setTeamExperience] = useState('')
  const [teamAchievements, setTeamAchievements] = useState('')

  // Auction Candidate Registration State
  const [playerName, setPlayerName] = useState(user?.name || '')
  const [playerIgn, setPlayerIgn] = useState(user?.ign || '')
  const [playerGameUid, setPlayerGameUid] = useState('')
  const [playerRole, setPlayerRole] = useState('Primary Rusher')
  const [playerExperience, setPlayerExperience] = useState('')
  const [playerBasePrice, setPlayerBasePrice] = useState('5000')
  const [playerPhone, setPlayerPhone] = useState('')
  const [playerEmail, setPlayerEmail] = useState(user?.email || '')
  const [playerClipUrl, setPlayerClipUrl] = useState('')
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState('')
  const [playerKd, setPlayerKd] = useState('4.20')
  const [playerAchievements, setPlayerAchievements] = useState('')

  // Group filter for regular Teams tab
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'ALL' | 'GROUP A' | 'GROUP B' | 'GROUP C'>('ALL')
  const hasGroups = !isAuction && teams.some((t) => t.group)
  const filteredTeams = selectedGroupFilter === 'ALL'
    ? teams
    : teams.filter((t) => (t.group || '').toUpperCase() === selectedGroupFilter)

  const [ambassadors, setAmbassadors] = useState<any[]>([])

  // Group candidate players into Franchise Teams & Ambassadors dynamically loaded from DB
  const franchiseGroups = useMemo(() => {
    if (!isAuction) return []

    // 1. Collect all franchise teams from dynamically loaded ambassadors and teams
    const franchiseList: Array<{ name: string; ambassador: string; group?: string }> = []
    const seen = new Set<string>()

    ambassadors.forEach((a: any) => {
      const teamName = (a.assignedTeamRange || a.name || '').trim()
      const key = teamName.toLowerCase()
      if (key && !seen.has(key)) {
        seen.add(key)
        franchiseList.push({
          name: teamName,
          ambassador: a.name,
          group: a.group,
        })
      }
    })

    teams.forEach((t: any) => {
      if (t.ambassadorName) {
        const teamName = (t.name || t.ambassadorName).trim()
        const key = teamName.toLowerCase()
        if (key && !seen.has(key)) {
          seen.add(key)
          franchiseList.push({
            name: teamName,
            ambassador: t.ambassadorName,
            group: t.group,
          })
        }
      }
    })

    if (franchiseList.length === 0) return []

    // 2. Initialize dynamic franchise groups
    const groups = franchiseList.map((tDef, idx) => ({
      index: idx + 1,
      ambassadorName: tDef.ambassador,
      teamName: tDef.name,
      group: tDef.group,
      status: 'verified',
      players: [] as Array<{
        ign: string
        name?: string
        role?: string
      }>,
    }))

    // 3. Match candidate players to their franchise teams
    const unassigned: Array<{ ign: string; name?: string; role?: string }> = []
    const candidateSources = teams && teams.length > 0 ? teams : (auctionPlayers as any[])

    candidateSources.forEach((t: any) => {
      const ign = t.captainIgn || t.ign || t.players?.[0]?.ign || t.name
      const name = t.captainName || t.name || t.players?.[0]?.name || ign
      const ignKey = (ign || '').toLowerCase().trim()
      const nameKey = (name || '').toLowerCase().trim()
      const realRole = SHEET_ROLES[ignKey] || SHEET_ROLES[nameKey] || t.role || 'Rusher'
      const realName = name && name !== ign ? name : (SHEET_NAMES[ignKey] || name)

      const pData = { ign, name: realName, role: realRole }

      let matched = false
      if (t.ambassadorName || t.ambassadorId) {
        const target = groups.find((g) =>
          (t.ambassadorName && g.ambassadorName.toLowerCase().includes(t.ambassadorName.toLowerCase())) ||
          (t.ambassadorName && g.teamName.toLowerCase().includes(t.ambassadorName.toLowerCase())) ||
          (g.teamName.toLowerCase() === (t.name || '').toLowerCase())
        )
        if (target) {
          target.players.push(pData)
          matched = true
        }
      }

      if (!matched) {
        unassigned.push(pData)
      }
    })

    // If there are unassigned candidates, distribute them evenly 6 per team
    let teamCursor = 0
    unassigned.forEach((p) => {
      while (teamCursor < groups.length && groups[teamCursor].players.length >= 6) {
        teamCursor++
      }
      if (teamCursor < groups.length) {
        groups[teamCursor].players.push(p)
      } else {
        const minTeam = groups.reduce((min, curr) => curr.players.length < min.players.length ? curr : min, groups[0])
        minTeam.players.push(p)
      }
    })

    return groups
  }, [teams, auctionPlayers, ambassadors, isAuction])

  const filteredFranchiseGroups = franchiseGroups


  // Payment Screenshot State (Primary verification)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [screenshotFileName, setScreenshotFileName] = useState<string>('')
  const [utrNumber, setUtrNumber] = useState('')

  const [copiedUpi, setCopiedUpi] = useState(false)
  const [copiedRoom, setCopiedRoom] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registerSuccess, setRegisterSuccess] = useState('')
  const [registerError, setRegisterError] = useState('')

  useEffect(() => {
    loadTournament()
  }, [id])

  // Keep auction player pool synchronized with teams data
  useEffect(() => {
    if (isAuction && auctionPlayers.length === 0 && teams.length > 0) {
      setAuctionPlayers(mapTeamsToCandidates(teams))
    }
  }, [isAuction, auctionPlayers.length, teams])

  const loadTournament = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/tournaments/${id}`)
      if (!res.ok) throw new Error('Tournament not found')
      const data = await res.json()
      setTournament(data.tournament)
      setTeams(data.teams || [])

      // If auction tournament, load auction players, dynamic ambassadors, and default to auction pool tab
      if (data.tournament.format === 'Auction Tournament') {
        try {
          const [pRes, ambRes] = await Promise.all([
            fetch(`/api/auctions/${data.tournament.id}/players`),
            fetch('/api/creators/ambassadors'),
          ])

          if (pRes.ok) {
            const pData = await pRes.json()
            if (pData.players && pData.players.length > 0) {
              setAuctionPlayers(pData.players)
            } else if (data.teams && data.teams.length > 0) {
              setAuctionPlayers(mapTeamsToCandidates(data.teams))
            }
          } else if (data.teams && data.teams.length > 0) {
            setAuctionPlayers(mapTeamsToCandidates(data.teams))
          }

          if (ambRes.ok) {
            const ambData = await ambRes.json()
            if (Array.isArray(ambData)) {
              setAmbassadors(
                ambData.filter(
                  (a: any) =>
                    a.tournamentId === data.tournament.id ||
                    a.tournamentId === id ||
                    (a.tournamentName &&
                      data.tournament.name &&
                      a.tournamentName.toLowerCase().replace(/[^a-z0-9]/g, '') ===
                        data.tournament.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
                )
              )
            }
          }
        } catch {
          if (data.teams && data.teams.length > 0) {
            setAuctionPlayers(mapTeamsToCandidates(data.teams))
          }
        }
        setActiveTab('auction_pool')
      }

      // Load tournament roadmap / bracket
      try {
        const rRes = await fetch(`/api/tournaments/${data.tournament.id}/roadmap`)
        if (rRes.ok) {
          const rData = await rRes.json()
          setRoadmap(rData.roadmap)
        }
      } catch {
        // Fallback roadmap will be displayed
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to load tournament')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyUpi = () => {
    if (tournament?.upiId) {
      navigator.clipboard.writeText(tournament.upiId)
      setCopiedUpi(true)
      setTimeout(() => setCopiedUpi(false), 2000)
    }
  }

  // Registered Player Room Access Control
  const [registeredAccess, setRegisteredAccess] = useState<{
    isAuthorized: boolean
    verifiedPlayer?: { name: string; ign?: string; teamName?: string; role?: string }
    roomId?: string
    roomPassword?: string
  }>({ isAuthorized: false })
  const [verifyInput, setVerifyInput] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  // Automatic verification of registered status
  useEffect(() => {
    if (!tournament) return

    // 1. Check local session registration for this tournament
    const saved = localStorage.getItem(`rdk_registered_${tournament.id}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed?.verified) {
          setRegisteredAccess({
            isAuthorized: true,
            verifiedPlayer: parsed,
            roomId: tournament.roomId,
            roomPassword: tournament.roomPassword,
          })
          return
        }
      } catch {}
    }

    // 2. Check if logged-in user is tournament creator / admin / host
    const isCreatorOrAdmin =
      (user && ['super_admin', 'org_owner', 'org_admin'].includes(user.role)) ||
      (user && tournament.creatorId && user.id === tournament.creatorId)

    if (isCreatorOrAdmin) {
      setRegisteredAccess({
        isAuthorized: true,
        verifiedPlayer: {
          name: user?.name || tournament.creatorName,
          ign: user?.ign || 'HOST',
          teamName: 'Organizer / Host',
          role: 'Host',
        },
        roomId: tournament.roomId,
        roomPassword: tournament.roomPassword,
      })
      return
    }

    // 3. Check if logged-in user matches any registered squad captain or squad roster member
    if (user) {
      const userEmail = user.email?.toLowerCase().trim()
      const userIgn = user.ign?.toLowerCase().trim()
      const userUid = (user as { gameUid?: string }).gameUid?.toLowerCase().trim()

      const matchedTeam = teams.find((t) => {
        if (userEmail && t.captainEmail?.toLowerCase() === userEmail) return true
        if (userIgn && t.captainIgn?.toLowerCase() === userIgn) return true
        if (userIgn && t.players?.some((p) => p.ign?.toLowerCase() === userIgn)) return true
        if (userUid && t.players?.some((p) => p.gameUid?.toLowerCase() === userUid)) return true
        return false
      })

      if (matchedTeam) {
        setRegisteredAccess({
          isAuthorized: true,
          verifiedPlayer: {
            name: user.name,
            ign: user.ign || matchedTeam.captainIgn,
            teamName: matchedTeam.name,
            role: matchedTeam.captainIgn.toLowerCase() === userIgn ? 'Captain' : 'Roster Player',
          },
          roomId: tournament.roomId,
          roomPassword: tournament.roomPassword,
        })
        return
      }

      // 4. Check if logged-in user matches any auction draft candidate
      const matchedCandidate = auctionPlayers.find((p) => {
        if (userEmail && p.email?.toLowerCase() === userEmail) return true
        if (userIgn && p.ign?.toLowerCase() === userIgn) return true
        if (userUid && p.gameUid?.toLowerCase() === userUid) return true
        return false
      })

      if (matchedCandidate) {
        setRegisteredAccess({
          isAuthorized: true,
          verifiedPlayer: {
            name: matchedCandidate.name,
            ign: matchedCandidate.ign,
            teamName: matchedCandidate.soldToTeam || 'Draft Candidate Pool',
            role: matchedCandidate.role,
          },
          roomId: tournament.roomId,
          roomPassword: tournament.roomPassword,
        })
        return
      }
    }

    // Otherwise, not verified yet
    setRegisteredAccess({
      isAuthorized: false,
    })
  }, [tournament, teams, auctionPlayers, user])

  const handleManualVerifyRoomAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tournament || !verifyInput.trim()) return

    setIsVerifying(true)
    setVerifyError('')

    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/verify-room-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: verifyInput.trim() }),
      })
      const data = await res.json()

      if (!res.ok || !data.authorized) {
        throw new Error(data.error || 'Access Denied: Only registered tournament players can view room credentials.')
      }

      const regInfo = {
        verified: true,
        name: data.participantName,
        ign: data.participantName,
        teamName: data.teamName,
        role: data.role,
      }

      localStorage.setItem(`rdk_registered_${tournament.id}`, JSON.stringify(regInfo))

      setRegisteredAccess({
        isAuthorized: true,
        verifiedPlayer: regInfo,
        roomId: data.roomId,
        roomPassword: data.roomPassword,
      })
      setVerifyInput('')
    } catch (err: unknown) {
      if (err instanceof Error) setVerifyError(err.message)
      else setVerifyError('Verification failed. Only registered players have room access.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCopyRoom = () => {
    const finalRoomId = registeredAccess.roomId || tournament?.roomId
    const finalRoomPassword = registeredAccess.roomPassword || tournament?.roomPassword
    if (finalRoomId) {
      navigator.clipboard.writeText(`Room ID: ${finalRoomId} | Password: ${finalRoomPassword || 'None'}`)
      setCopiedRoom(true)
      setTimeout(() => setCopiedRoom(false), 2000)
    }
  }

  // Handle Screenshot Upload with Instant Client-Side Compression & Data URL Preview
  const handleScreenshotFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshotFileName(file.name)
    setRegisterError('')

    try {
      const compressedDataUrl = await compressImageFile(file, 1200, 1200, 0.75)
      setScreenshotPreview(compressedDataUrl)
    } catch {
      const reader = new FileReader()
      reader.onload = () => {
        setScreenshotPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tournament) return

    setIsSubmitting(true)
    setRegisterError('')
    setRegisterSuccess('')

    const isPaid = tournament.entryFee && !tournament.entryFee.toLowerCase().includes('free')
    const isAuction = tournament.format === 'Auction Tournament' || tournament.format.toLowerCase().includes('auction')
    const isSolo = tournament.format === 'BR Solo' || (tournament as any).teamSize === 'Solo' || (tournament as any).playersPerTeam === 1

    // Validation: Require Payment Screenshot if it's a paid tournament
    if (isPaid && !screenshotPreview && !utrNumber.trim()) {
      setRegisterError('Please upload your UPI payment screenshot to verify registration.')
      setIsSubmitting(false)
      return
    }

    try {
      let payload: any = {}

      if (isAuction) {
        if (!playerIgn.trim() || !playerName.trim()) {
          setRegisterError('Player Name and In-Game Name (IGN) are required')
          setIsSubmitting(false)
          return
        }

        payload = {
          isAuctionRegistration: true,
          playerName: playerName.trim(),
          ign: playerIgn.trim(),
          gameUid: playerGameUid.trim() || 'UID-' + Math.floor(100000 + Math.random() * 900000),
          role: playerRole,
          basePrice: Number(playerBasePrice) || 5000,
          experience: playerExperience.trim(),
          phone: playerPhone.trim(),
          email: playerEmail.trim(),
          clipUrl: playerClipUrl.trim(),
          photoUrl: playerPhotoUrl.trim(),
          kd: playerKd.trim(),
          achievements: playerAchievements.trim(),
          screenshotUrl: screenshotPreview,
          utr: utrNumber.trim(),
        }
      } else if (isSolo) {
        if (!captainName.trim() || !captainIgn.trim()) {
          setRegisterError('Player Full Name and In-Game Name (IGN) are required for solo registration')
          setIsSubmitting(false)
          return
        }

        payload = {
          teamName: teamName.trim() || `${captainIgn.trim()} (Solo)`,
          captainName: captainName.trim(),
          captainEmail: captainEmail.trim() || `${captainIgn.toLowerCase()}@gamer.rdk`,
          captainPhone: captainPhone.trim(),
          captainIgn: captainIgn.trim(),
          players: [{ ign: captainIgn.trim(), gameUid: player2Uid?.trim() || 'Solo-UID' }],
          screenshotUrl: screenshotPreview,
          utr: utrNumber.trim(),
        }
      } else {
        if (!teamName.trim() || !captainName.trim() || !captainIgn.trim()) {
          setRegisterError('Team Name, Captain Name, and Captain IGN are required')
          setIsSubmitting(false)
          return
        }

        const players = [
          { ign: captainIgn, gameUid: 'Captain' },
          ...(player2Ign ? [{ ign: player2Ign, gameUid: player2Uid || 'N/A' }] : []),
          ...(player3Ign ? [{ ign: player3Ign, gameUid: player3Uid || 'N/A' }] : []),
          ...(player4Ign ? [{ ign: player4Ign, gameUid: player4Uid || 'N/A' }] : []),
          ...(player5Ign ? [{ ign: player5Ign, gameUid: player5Uid || 'N/A' }] : []),
        ]

        payload = {
          teamName: teamName.trim(),
          captainName: captainName.trim(),
          captainEmail: captainEmail.trim(),
          captainPhone: captainPhone.trim(),
          captainIgn: captainIgn.trim(),
          experience: teamExperience.trim(),
          achievements: teamAchievements.trim(),
          players,
          screenshotUrl: screenshotPreview,
          utr: utrNumber.trim(),
        }
      }

      const res = await fetch(`/api/tournaments/${tournament.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let data: any = {}
      const contentType = res.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text()
        if (!res.ok) {
          throw new Error(
            res.status === 413
              ? 'Payment screenshot is too large. Please upload a smaller image file.'
              : res.status === 404
              ? 'Tournament not found or registration is currently closed.'
              : `Server error (${res.status}). Please try again.`
          )
        }
        try {
          data = JSON.parse(text)
        } catch {
          data = { message: 'Registration submitted successfully!' }
        }
      }

      if (!res.ok) throw new Error(data?.error || data?.message || 'Registration failed')

      setRegisterSuccess(data.message)

      // Grant instant room clearance to this registered player/squad
      const regInfo = {
        verified: true,
        name: isAuction ? (playerName.trim() || playerIgn.trim()) : (captainName.trim() || captainIgn.trim()),
        ign: isAuction ? playerIgn.trim() : captainIgn.trim(),
        teamName: isAuction ? 'Draft Candidate Pool' : teamName.trim(),
        role: isAuction ? playerRole : 'Captain',
      }
      try {
        localStorage.setItem(`rdk_registered_${tournament.id}`, JSON.stringify(regInfo))
      } catch {}

      setRegisteredAccess({
        isAuthorized: true,
        verifiedPlayer: regInfo,
        roomId: tournament.roomId,
        roomPassword: tournament.roomPassword,
      })

      // Refresh tournament data
      loadTournament()
    } catch (err: unknown) {
      if (err instanceof Error) setRegisterError(err.message)
      else setRegisterError('Failed to register')
    } finally {
      setIsSubmitting(false)
    }
  }



  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Loading championship data...</p>
        </div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center px-4">
        <AlertCircle className="size-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-heading font-black text-foreground">Tournament Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          The requested tournament ID or slug does not exist or may have been archived.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-background bg-primary px-4 py-2 rounded"
        >
          Back to Tournament Hub
        </Link>
      </div>
    )
  }

  const isSolo = tournament.format === 'BR Solo' || (tournament as any).teamSize === 'Solo' || (tournament as any).playersPerTeam === 1
  const totalEnrolled = isAuction ? Math.max(auctionPlayers.length, tournament.registeredTeamsCount) : tournament.registeredTeamsCount
  const spotsLeft = Math.max(0, tournament.maxTeams - totalEnrolled)
  const isSlotsFull = totalEnrolled >= tournament.maxTeams
  const canRegister = tournament.status === 'registration_open' && !isSlotsFull
  const isPaid = tournament.entryFee && !tournament.entryFee.toLowerCase().includes('free')

  const formatBadge = (() => {
    const fmt = tournament.format
    if (fmt === 'Auction Tournament' || fmt.toLowerCase().includes('auction')) {
      return { label: 'Live Auction Arena', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
    }
    if (fmt === 'BR Squad') {
      return { label: 'Battle Royale (BR Squad)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    }
    if (fmt === 'BR Solo') {
      return { label: 'Battle Royale (BR Solo)', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }
    }
    if (fmt === 'CS Squad No Rules') {
      return { label: 'Clash Squad (No Rules)', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' }
    }
    if (fmt === 'CS Squad Limited') {
      return { label: 'Clash Squad (Limited Ammo)', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }
    }
    if (fmt === 'CS Squad One Tap') {
      return { label: 'Clash Squad (One Tap Only)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
    }
    return { label: fmt, color: 'bg-primary/10 text-primary border-primary/20' }
  })()

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Hero Banner Section */}
      <div className="relative border-b border-border bg-card overflow-hidden">
        <div className="absolute inset-0 h-80 sm:h-96 w-full">
          <img
            src={tournament.banner}
            alt={tournament.name}
            className="w-full h-full object-cover brightness-[0.25] scale-105 filter blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-transparent to-card" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-8 pb-8 sm:pt-14 sm:pb-12">
          {/* Breadcrumb / Top Bar */}
          <div className="flex items-center justify-between gap-3 text-xs mb-4">
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors"
            >
              ← Back to All Tournaments
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border">
                Powered by RDK Technologies
              </span>
              <StatusBadge status={tournament.status} />
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {tournament.game}
              </span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${formatBadge.color}`}
              >
                {formatBadge.label}
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-end">
            <div>
              {/* Creator Partner Badge */}
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/60 border border-border backdrop-blur-md mb-3">
                {tournament.creatorAvatar && (
                  <img
                    src={tournament.creatorAvatar}
                    alt={tournament.creatorName}
                    className="size-4 rounded-full object-cover"
                  />
                )}
                <span className="text-[11px] text-muted-foreground">Hosted by</span>
                <span className="text-[11px] font-bold text-foreground">{tournament.creatorName}</span>
                <span className="text-[10px] text-primary font-mono">{tournament.creatorHandle}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-heading font-black tracking-tight text-foreground uppercase">
                {tournament.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Gamepad2 className="size-4 text-primary" />
                  <span className="text-foreground font-semibold">{tournament.format}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-4 text-primary" />
                  <span>Starts: {tournament.startDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="size-4 text-primary" />
                  <span>
                    {isAuction
                      ? `${auctionPlayers.length} Draft Candidates Pool`
                      : `${tournament.registeredTeamsCount}/${tournament.maxTeams} Teams Enrolled`}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Card (Right Side) */}
            <div className="p-5 rounded-xl border border-border bg-card/90 backdrop-blur-xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">
                    Prize Pool
                  </span>
                  <span className="text-2xl font-heading font-black text-primary tracking-tight">
                    {tournament.prizePool}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">
                    {isAuction ? 'Draft Entry Fee' : 'Entry Fee'}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {tournament.entryFee}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {tournament.status === 'registration_open' ? (
                  isSlotsFull ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-lg font-medium text-xs bg-muted text-muted-foreground cursor-not-allowed text-center"
                    >
                      SLOTS FULL ({totalEnrolled}/{tournament.maxTeams}) — REGISTRATION CLOSED
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setRegisterError('')
                        setRegisterSuccess('')
                        setIsRegisterOpen(true)
                      }}
                      className="w-full py-3 rounded-lg font-heading font-black tracking-wide text-xs text-background bg-primary hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(255,46,0,0.4)] flex items-center justify-center gap-2"
                    >
                      <Trophy className="size-4" />
                      {isAuction ? 'REGISTER AS AUCTION DRAFT CANDIDATE' : 'REGISTER SQUAD NOW'}
                    </button>
                  )
                ) : tournament.status === 'live' ? (
                  registeredAccess.isAuthorized ? (
                    <button
                      onClick={() => setActiveTab('room')}
                      className="w-full py-3 rounded-lg font-heading font-black tracking-wide text-xs transition-all flex items-center justify-center gap-2 text-background bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    >
                      <KeyRound className="size-4" />
                      MATCH LIVE — VIEW ROOM ID
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab('live')}
                      className="w-full py-2.5 rounded-lg font-bold text-xs bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Radio className="size-4 animate-pulse text-white" />
                      MATCH LIVE — WATCH STREAM
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg font-medium text-xs bg-muted text-muted-foreground cursor-not-allowed"
                  >
                    Registration Closed
                  </button>
                )}

                {/* Organizer quick manage shortcut */}
                {user && ['super_admin', 'org_owner', 'org_admin'].includes(user.role) && (
                  <div className="flex gap-2 pt-1">
                    <Link
                      to={`/creator/tournaments/${tournament.id}/manage`}
                      className="flex-1 py-2 rounded-lg font-bold text-xs text-center border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Organizer Controls
                    </Link>
                    {isAuction && (
                      <Link
                        to={`/creator/auctions`}
                        className="py-2 px-3 rounded-lg font-bold text-xs text-center border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                        title="Auction Bidders & Sheets"
                      >
                        Bidders & Sync
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex items-center gap-1 border-b border-border pb-px overflow-x-auto">
          {/* TAB: Watch Live (Available to ALL - Registered & Non-Registered Spectators) */}
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'live'
                ? 'border-red-500 text-red-400 bg-red-500/10'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Radio className="size-3.5 text-red-500 animate-pulse" />
            <span>Watch Live</span>
            {tournament.streamStatus === 'live' ? (
              <span className="rounded bg-red-500 text-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider animate-pulse shadow-sm">
                LIVE
              </span>
            ) : tournament.streamStatus === 'starting_soon' ? (
              <span className="rounded bg-amber-500/20 text-amber-400 px-1.5 py-0.5 text-[9px] font-bold">
                SOON
              </span>
            ) : null}
          </button>

          {/* TAB 1: Auction Pool & Video Clips (If Auction Tournament) */}
          {isAuction && (
            <button
              onClick={() => setActiveTab('auction_pool')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'auction_pool'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Video className="size-3.5 text-amber-400" />
              <span>Draft Player Pool & Clips ({auctionPlayers.length})</span>
              <span className="size-2 rounded-full bg-amber-400" />
            </button>
          )}

          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Gamepad2 className="size-3.5" />
            <span>Overview & Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('roadmap')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'roadmap'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <GitBranch className="size-3.5 text-blue-400" />
            <span>Roadmap & Bracket</span>
            <span className="rounded bg-blue-500/20 text-blue-400 px-1.5 py-0.5 text-[9px] font-bold">
              TREE
            </span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'teams'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="size-3.5" />
            <span>{isAuction ? `Franchise Teams (${franchiseGroups.length})` : `Enrolled Squads (${teams.length})`}</span>
          </button>

          {/* Match Room Credentials Tab (Only available to registered players) */}
          {registeredAccess.isAuthorized && (
            <button
              onClick={() => setActiveTab('room')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'room'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <KeyRound className="size-3.5 text-emerald-400" />
              <span>Match Room Credentials</span>
              {tournament.status === 'live' && (
                <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'rules'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="size-3.5" />
            <span>Rulebook</span>
          </button>
        </div>

        {/* ═══ TAB: LIVE STREAM BROADCAST (AUDIENCE & SPECTATORS - NO REGISTRATION REQUIRED) ═══ */}
        {activeTab === 'live' && (
          <div className="mt-6 space-y-6 max-w-5xl mx-auto">
            {/* Live Stream Main Display */}
            {tournament.streamUrl && parseStreamEmbed(tournament.streamUrl).isValid ? (
              <div className="space-y-4">
                {/* 16:9 Video Player Container with Cyber Glow */}
                <div className="relative group rounded-2xl overflow-hidden border border-red-500/40 bg-black shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      src={parseStreamEmbed(tournament.streamUrl).embedUrl}
                      title={tournament.streamTitle || 'Official Tournament Live Stream'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="size-full border-0"
                    />
                  </div>
                </div>

                {/* Broadcast Meta Bar */}
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-lg flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {tournament.streamStatus === 'live' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/40 px-2.5 py-0.5 text-[10px] font-black text-red-400 uppercase tracking-wider">
                          <span className="size-2 rounded-full bg-red-500 animate-ping" />
                          OFFICIAL ON-AIR BROADCAST
                        </span>
                      ) : tournament.streamStatus === 'starting_soon' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                          <span className="size-2 rounded-full bg-amber-400" />
                          BROADCAST STARTING SOON
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          RECORDED / STREAM FEED
                        </span>
                      )}

                      <span className="text-xs text-muted-foreground font-medium">
                        Hosted by <b className="text-foreground">{tournament.creatorName}</b>
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-foreground">
                      {tournament.streamTitle || `${tournament.name} • Official Championship Broadcast`}
                    </h2>

                    {tournament.scheduledMatchInfo && (
                      <p className="text-xs text-primary font-mono flex items-center gap-1.5 pt-0.5">
                        <Clock className="size-3.5 text-primary" />
                        <span>{tournament.scheduledMatchInfo}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={tournament.streamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/25 transition-all hover:scale-105 active:scale-95"
                    >
                      <ExternalLink className="size-3.5" />
                      <span>Watch on {parseStreamEmbed(tournament.streamUrl).platform.toUpperCase()}</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              /* Standby / Scheduled Match Screen when stream is not active yet */
              <div className="p-8 sm:p-12 text-center rounded-2xl border border-red-500/30 bg-gradient-to-b from-red-500/5 via-card to-card space-y-4 shadow-xl">
                <div className="size-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                  <Tv className="size-8" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider mb-2">
                    <Radio className="size-3 animate-pulse" />
                    Live Broadcast Standby
                  </div>
                  <h3 className="font-heading font-black text-xl text-foreground uppercase tracking-wide">
                    Official Championship Stream
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    The tournament host has not started the live stream yet or is setting up the broadcast. All audience and spectators can watch directly on this tab once live!
                  </p>
                </div>

                {tournament.scheduledMatchInfo && (
                  <div className="p-3 max-w-md mx-auto rounded-xl bg-muted/40 border border-border text-xs font-mono text-primary flex items-center justify-center gap-2">
                    <Clock className="size-4" />
                    <span>Next Scheduled: {tournament.scheduledMatchInfo}</span>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('roadmap')}
                    className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition"
                  >
                    View Match Roadmap & Bracket Tree
                  </button>
                  <button
                    onClick={() => setActiveTab('overview')}
                    className="px-4 py-2 rounded-lg bg-primary text-background text-xs font-bold hover:bg-primary/90 transition shadow"
                  >
                    Tournament Overview & Details
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: AUCTION PLAYER POOL & CLIPS (FOR AUCTION TOURNAMENTS) ═══ */}
        {activeTab === 'auction_pool' && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <div>
                <h3 className="font-heading font-black text-base text-foreground uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-400" />
                  Live Auction Player Pool & Gameplay Montages
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Franchise owners bid on these candidates during the live auction. Click "Watch Clip" to view their gameplay montage!
                </p>
              </div>

              <div className="flex items-center gap-2">
                {canRegister ? (
                  <button
                    onClick={() => setIsRegisterOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-primary text-background font-bold text-xs hover:bg-primary/90 transition-colors shadow-md"
                  >
                    Register as Candidate
                  </button>
                ) : tournament.status === 'live' ? (
                  <span className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                    <Radio className="size-3.5 animate-pulse text-red-500" />
                    Tournament Live — Registration Closed
                  </span>
                ) : isSlotsFull ? (
                  <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs">
                    Slots Full ({totalEnrolled}/{tournament.maxTeams}) — Registration Closed
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground font-bold text-xs">
                    Registration Closed
                  </span>
                )}
              </div>
            </div>

            {/* Auction Player Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {auctionPlayers.map((player) => (
                <div
                  key={player.id}
                  className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all shadow-lg flex flex-col justify-between"
                >
                  {/* Card Header & Photo */}
                  <div className="relative h-44 w-full bg-black/70 overflow-hidden flex items-center justify-center border-b border-border">
                    <img
                      src={player.photoUrl && !player.photoUrl.includes('photo-1566492031773-4f4e44671857') ? player.photoUrl : '/gg.png'}
                      alt={player.ign}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent pointer-events-none" />

                    {/* Role & Tier Badges */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary text-background shadow-md">
                        {player.role}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-amber-300 border border-amber-400/30">
                        {player.tier}
                      </span>
                    </div>

                    {/* Base Price Pill */}
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                      <div className="truncate">
                        <span className="font-heading font-black text-base text-foreground block truncate">
                          {player.ign}
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">{player.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Base Purse</span>
                        <span className="font-heading font-black text-sm text-primary">₹{player.basePrice}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Achievements & Gameplay Montage Clip */}
                  <div className="p-3.5 space-y-3">
                    {player.stats?.achievements && (
                      <p className="text-[11px] text-muted-foreground italic line-clamp-2 leading-relaxed">
                        "{player.stats.achievements}"
                      </p>
                    )}

                    {/* Gameplay Montage Video Button & Direct Link */}
                    {(() => {
                      const ignKey = (player.ign || '').toLowerCase().trim()
                      const nameKey = (player.name || '').toLowerCase().trim()
                      const clip = player.clipUrl || SHEET_CLIPS[ignKey] || SHEET_CLIPS[nameKey] || ''

                      return clip ? (
                        <div className="flex items-center gap-1.5 w-full pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveClip({
                                ign: player.ign,
                                name: player.name,
                                url: clip,
                                role: player.role,
                              })
                            }
                            className="flex-1 py-2 rounded-lg font-heading font-black text-xs bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Play className="size-3.5 fill-current" />
                            <span>WATCH MONTAGE</span>
                          </button>
                          <a
                            href={clip}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open video link"
                            className="p-2 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors flex items-center justify-center shrink-0"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        </div>
                      ) : (
                        <div className="py-2 text-center text-[10px] text-muted-foreground bg-muted/20 rounded">
                          No montage video linked
                        </div>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TAB: OVERVIEW & STRUCTURE ═══ */}
        {activeTab === 'overview' && (
          <div className="mt-6 grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="p-5 rounded-xl border border-border bg-card">
                <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground mb-3">
                  Championship Structure & Format
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isAuction
                    ? 'This is an official IPL-style live esports player auction tournament. Registered draft candidates are placed on auction cards with their stats and gameplay video montages. Franchise team captains bid using allocated purse tokens.'
                    : `This tournament follows the official ${tournament.format} competitive framework. Squads will compete across scheduled lobbies with live point tallies.`}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                  <div className="p-3 bg-muted/40 rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Game Mode</span>
                    <span className="text-xs font-bold text-foreground">{tournament.game}</span>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                      {isAuction ? 'Draft Capacity' : 'Max Teams'}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {isAuction ? `${auctionPlayers.length} Candidates` : `${tournament.maxTeams} Teams`}
                    </span>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Verification</span>
                    <span className="text-xs font-bold text-foreground">Screenshot & Ambassador</span>
                  </div>
                </div>

                {/* Format-Specific Guidelines Card */}
                {tournament.format === 'CS Squad Limited' && (
                  <div className="mt-4 p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                      <Shield className="size-4 shrink-0 text-purple-400" />
                      <span>Clash Squad (CS Squad - Limited) Competitive Rules</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Gun Attributes: <strong className="text-foreground">OFF (Fair Play)</strong></li>
                      <li>Limited Ammo: <strong className="text-foreground">ON (Yes)</strong></li>
                      <li>Grenades, Smoke & Flashbangs: <strong className="text-rose-400">Strictly Prohibited</strong></li>
                      <li>Rooftop camping / zone glitching = <strong className="text-rose-400">Round Forfeiture</strong></li>
                    </ul>
                  </div>
                )}
                {tournament.format === 'CS Squad One Tap' && (
                  <div className="mt-4 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                      <Zap className="size-4 shrink-0 text-rose-400" />
                      <span>Clash Squad (CS Squad - One Tap) Aim Masters</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Authorized Weapons: <strong className="text-foreground">Desert Eagle, M1887, Woodpecker (Single Shot)</strong></li>
                      <li>Elimination Condition: <strong className="text-foreground">Headshot Only</strong></li>
                      <li>Body Spray & SMG Spray: <strong className="text-rose-400">Strictly Forbidden</strong></li>
                      <li>Touch gesture gameplay recording mandatory for all participants</li>
                    </ul>
                  </div>
                )}
                {tournament.format === 'CS Squad No Rules' && (
                  <div className="mt-4 p-4 rounded-xl border border-orange-500/30 bg-orange-500/10 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
                      <Crosshair className="size-4 shrink-0 text-orange-400" />
                      <span>Clash Squad (CS Squad - No Rules) Settings</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Gun Attributes: <strong className="text-foreground">ON</strong></li>
                      <li>Character Skills: <strong className="text-foreground">ON (All Skills Active)</strong></li>
                      <li>Throwables: <strong className="text-foreground">All Grenades, Smokes & Gloo Walls Allowed</strong></li>
                      <li>First to 7 rounds wins</li>
                    </ul>
                  </div>
                )}
                {tournament.format === 'BR Squad' && (
                  <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                      <Users className="size-4 shrink-0 text-emerald-400" />
                      <span>Battle Royale (BR Squad) Points Matrix</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Standard official tournament points matrix: 1st place: 12 pts, 2nd: 9 pts, 3rd: 8 pts, 4th: 7 pts, 5th: 6 pts... +1 point per confirmed kill. 4-player squad survival on classic map lobbies.
                    </p>
                  </div>
                )}
                {tournament.format === 'BR Solo' && (
                  <div className="mt-4 p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                      <Target className="size-4 shrink-0 text-cyan-400" />
                      <span>Battle Royale (BR Solo) Survival Rules</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Solo survival showdown: 48 solo drop competitors. Teaming up or vehicle collaboration triggers immediate permanent ban. +1 kill point per elimination + solo placement table.
                    </p>
                  </div>
                )}
              </div>

              {/* Tournament UPI & Payment Details */}
              {isPaid && (
                <div className="p-5 rounded-xl border border-border bg-card">
                  <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
                    <QrCode className="size-4 text-primary" />
                    Official Payment & UPI QR Code
                  </h3>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {tournament.upiQrUrl && (
                      <div className="p-2 bg-white rounded-lg shadow-md shrink-0">
                        <img src={tournament.upiQrUrl} alt="UPI QR" className="size-36 object-contain" />
                      </div>
                    )}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">UPI ID</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-foreground bg-muted px-2 py-1 rounded">
                            {tournament.upiId || 'rdkesports@upi'}
                          </span>
                          <button
                            onClick={handleCopyUpi}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedUpi ? <CheckCircle2 className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Account Name</span>
                        <span className="font-semibold text-foreground">{tournament.upiName || 'RDK Esports Partner'}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Pay {tournament.entryFee} via Google Pay, PhonePe, or Paytm. <strong>Take a screenshot of the payment receipt</strong> and upload it in the registration window!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side Info */}
            <div className="space-y-6">
              <div className="p-5 rounded-xl border border-border bg-card space-y-4">
                <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-foreground">
                  Important Timelines
                </h4>
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Registration Closes</p>
                      <p className="text-muted-foreground text-[11px]">24 hours prior to match kick-off</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="size-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">
                        {isAuction ? 'Live Auction Arena Starts' : 'Room ID Release'}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {isAuction ? 'Broadcasted on RDK Live Arena' : '15 minutes before match start'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: REGISTERED SQUADS & FRANCHISE TEAMS ═══ */}
        {activeTab === 'teams' && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground">
                  {isAuction
                    ? `Franchise Teams (${filteredFranchiseGroups.length}/${franchiseGroups.length} Teams • ${teams.length} Players)`
                    : `Enrolled Squads (${filteredTeams.length}/${teams.length || tournament.maxTeams})`}
                </h3>
                {isAuction && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    District Franchise Teams & Ambassadors with all drafted players rostered below each team.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canRegister ? (
                  <button
                    onClick={() => setIsRegisterOpen(true)}
                    className="px-3 py-1.5 text-xs font-bold rounded bg-primary text-background hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    {isAuction ? 'Register Draft Candidate' : 'Register Squad'}
                  </button>
                ) : isSlotsFull ? (
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded bg-muted text-muted-foreground border border-border">
                    Slots Full ({totalEnrolled}/{tournament.maxTeams})
                  </span>
                ) : null}
              </div>
            </div>

            {/* Group Tabs (GROUP A, GROUP B, GROUP C) if groups exist */}
            {hasGroups && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                {(['ALL', 'GROUP A', 'GROUP B', 'GROUP C'] as const).map((grp) => {
                  const count = grp === 'ALL' ? teams.length : teams.filter((t) => t.group === grp).length
                  return (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setSelectedGroupFilter(grp)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        selectedGroupFilter === grp
                          ? grp === 'GROUP A'
                            ? 'bg-purple-600 text-white shadow-md'
                            : grp === 'GROUP B'
                            ? 'bg-cyan-500 text-black shadow-md'
                            : grp === 'GROUP C'
                            ? 'bg-amber-500 text-black shadow-md'
                            : 'bg-primary text-background shadow-md'
                          : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span>{grp}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Empty State */}
            {(isAuction ? filteredFranchiseGroups.length : filteredTeams.length) === 0 ? (
              <div className="p-12 text-center border border-border rounded-xl bg-card">
                <Users className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted-foreground">
                  {teams.length === 0
                    ? 'No teams registered yet. Be the first to register!'
                    : `No teams found in ${selectedGroupFilter}.`}
                </p>
              </div>
            ) : isAuction ? (
              /* AUCTION FRANCHISE TEAMS: Ambassador Name & Team Name + Players of that team below */
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFranchiseGroups.map((group, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all shadow-md flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header: Team Name & Ambassador Name */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="size-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-black shrink-0">
                              #{idx + 1}
                            </span>
                            <h4 className="font-heading font-black text-base text-foreground uppercase tracking-wide">
                              {group.teamName}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-8">
                            <Shield className="size-3.5 text-purple-400 shrink-0" />
                            <span className="font-semibold text-muted-foreground">Ambassador:</span>
                            <span className="font-bold text-foreground">{group.ambassadorName}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border">
                            {group.players.length} {group.players.length === 1 ? 'Player' : 'Players'}
                          </span>
                        </div>
                      </div>

                      {/* Below that: Players of that Team */}
                      <div className="mt-3.5 space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                          Team Roster & Drafted Players:
                        </span>

                        <div className="space-y-1.5">
                          {group.players.map((p, pIdx) => (
                            <div
                              key={pIdx}
                              className="p-2.5 rounded-xl bg-muted/30 border border-border/60 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="size-5 rounded bg-background border border-border flex items-center justify-center text-[10px] font-mono text-muted-foreground shrink-0">
                                  {pIdx + 1}
                                </span>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-heading font-black text-xs text-foreground tracking-wide truncate block max-w-[120px]" title={p.ign}>
                                      {p.ign}
                                    </span>
                                    {p.name && p.name.toLowerCase().trim() !== p.ign.toLowerCase().trim() && (
                                      <span className="text-[10px] text-muted-foreground truncate block max-w-[80px]" title={p.name}>
                                        ({p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {p.role && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0 capitalize">
                                  {p.role}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* REGULAR TOURNAMENT SQUADS */
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTeams.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-border bg-card hover:border-border-strong transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="size-6 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-heading font-black text-sm text-foreground truncate">
                            {t.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {t.group && (
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                t.group === 'GROUP A'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                  : t.group === 'GROUP B'
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {t.group}
                            </span>
                          )}
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              t.status === 'verified'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {t.status === 'verified' ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-muted-foreground space-y-1 mb-3">
                        <p>
                          Captain / Lead: <strong className="text-foreground">{t.captainName}</strong> ({t.captainIgn})
                        </p>
                      </div>

                      {/* Players Roster */}
                      <div className="space-y-1.5 pt-2 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">
                            Squad Roster ({t.players?.length || 0}/6)
                          </span>
                          <span className="text-[9px] font-mono text-primary font-bold">
                            {t.players?.length === 6 ? 'Full Squad' : `${6 - (t.players?.length || 0)} Slots Left`}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {t.players?.map((p, i) => (
                            <div
                              key={i}
                              className="p-1.5 rounded bg-muted/40 border border-border/50 text-[10px] flex items-center justify-between"
                            >
                              <div className="truncate">
                                <span className="font-bold text-foreground block truncate">{p.ign}</span>
                                {p.name && p.name !== p.ign && (
                                  <span className="text-[8px] text-muted-foreground truncate block">{p.name}</span>
                                )}
                              </div>
                              {p.role && (
                                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0 ml-1">
                                  {p.role}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: MATCH ROOM CREDENTIALS (REGISTERED PLAYERS ONLY) ═══ */}
        {activeTab === 'room' && registeredAccess.isAuthorized && (
          <div className="mt-6 max-w-xl mx-auto">
            <div className="p-6 rounded-xl border border-emerald-500/30 bg-card text-center space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

              <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <KeyRound className="size-6" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  <BadgeCheck className="size-3.5 text-emerald-400" />
                  Verified Player Clearance
                </div>
                <h3 className="font-heading font-black text-lg text-foreground uppercase tracking-wide">
                  Match Lobby Credentials
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Confirmed participant clearance granted. Match lobby credentials are confidential and intended exclusively for you and your squad.
                </p>
              </div>

              {/* Verified Player Badge Details */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between text-left">
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    Cleared Participant
                  </div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                    <span>{registeredAccess.verifiedPlayer?.ign || registeredAccess.verifiedPlayer?.name || 'Registered Player'}</span>
                    {registeredAccess.verifiedPlayer?.teamName && (
                      <span className="text-muted-foreground font-normal">
                        • {registeredAccess.verifiedPlayer.teamName}
                      </span>
                    )}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {registeredAccess.verifiedPlayer?.role?.toUpperCase() || 'ROSTER PLAYER'}
                </span>
              </div>

              {tournament.status === 'live' && (registeredAccess.roomId || tournament.roomId) ? (
                <div className="p-4 bg-muted/40 border border-emerald-500/30 rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-bold">Room ID</span>
                    <span className="font-mono font-black text-sm text-primary tracking-wider">
                      {registeredAccess.roomId || tournament.roomId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-bold">Room Password</span>
                    <span className="font-mono font-bold text-foreground tracking-wider">
                      {registeredAccess.roomPassword || tournament.roomPassword || 'None'}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyRoom}
                    className="w-full mt-2 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-background font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                  >
                    {copiedRoom ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                    <span>{copiedRoom ? 'Copied to Clipboard' : 'Copy Room Details'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-muted/20 border border-border rounded-lg text-xs text-muted-foreground">
                  <Clock className="size-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-semibold text-foreground">Room ID not yet broadcasted</p>
                  <p className="mt-1 text-[11px]">
                    The organizer or match operator will broadcast the Room ID and Password 15 minutes before the match start. Because you are verified, credentials will unlock automatically here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB: RULES ═══ */}
        {activeTab === 'rules' && (
          <div className="mt-6 max-w-3xl mx-auto p-6 rounded-xl border border-border bg-card space-y-4">
            <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Tournament Rulebook & Compliance
            </h3>
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {tournament.rules || 'Standard competitive rules apply.'}
              </pre>
            </div>
          </div>
        )}

        {/* ═══ TAB: ROADMAP & BRACKET TREE ═══ */}
        {activeTab === 'roadmap' && (
          <div className="mt-6 space-y-6">
            {roadmap ? (
              <TournamentRoadmapTree roadmap={roadmap} />
            ) : (
              <div className="p-12 text-center border border-border rounded-xl bg-card">
                <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-muted-foreground">Loading championship roadmap tree...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ GAMEPLAY VIDEO MONTAGE POPUP MODAL ═══ */}
      <AnimatePresence>
        {activeClip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                  <Play className="size-4 text-primary fill-current" />
                  <div>
                    <h4 className="font-heading font-black text-sm text-foreground">
                      {activeClip.ign} • Gameplay Montage
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {activeClip.name} ({activeClip.role})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveClip(null)}
                  className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-5 text-center space-y-4">
                {getEmbedUrl(activeClip.url) ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-border shadow-inner">
                    <iframe
                      src={getEmbedUrl(activeClip.url)!}
                      title={`${activeClip.ign} Gameplay`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-xl bg-black flex flex-col items-center justify-center border border-border p-4 relative overflow-hidden">
                    <Video className="size-12 text-primary/60 mb-2" />
                    <p className="text-xs font-bold text-foreground">Gameplay Montage Link Provided by Player</p>
                    <p className="text-[11px] font-mono text-primary truncate max-w-md mt-1 select-all bg-muted/30 px-3 py-1 rounded">
                      {activeClip.url}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-center gap-3">
                  <a
                    href={activeClip.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-background font-bold text-xs hover:bg-primary/90 shadow-lg transition-all"
                  >
                    <ExternalLink className="size-4" />
                    Open Video in New Tab (YouTube / Drive)
                  </a>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Franchise captains evaluate gameplay montages and clutch clips during live draft bidding.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ REGISTRATION MODAL (DYNAMIC: AUCTION CANDIDATE VS SQUAD) ═══ */}
      <AnimatePresence>
        {isRegisterOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto"
            >
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-base text-foreground uppercase tracking-wide">
                      {isAuction ? 'AUCTION DRAFT CANDIDATE' : 'SQUAD REGISTRATION'}
                    </h3>
                    {isAuction && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Player Draft
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{tournament.name}</p>
                </div>
                <button
                  onClick={() => setIsRegisterOpen(false)}
                  className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {registerSuccess ? (
                  <div className="text-center py-8 space-y-3">
                    <CheckCircle2 className="size-12 text-emerald-400 mx-auto" />
                    <h4 className="font-heading font-black text-lg text-foreground">
                      Registration Submitted!
                    </h4>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-sm mx-auto">
                      {registerSuccess}
                    </p>
                    <button
                      onClick={() => {
                        setIsRegisterOpen(false)
                        setRegisterSuccess('')
                      }}
                      className="mt-3 px-6 py-2 rounded font-bold text-xs bg-primary text-background"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    {!canRegister && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>
                          {tournament.status === 'live'
                            ? 'Tournament is currently live. Registrations are closed.'
                            : tournament.status === 'completed'
                            ? 'Tournament has ended. Registrations are closed.'
                            : `All slots are currently filled (${totalEnrolled}/${tournament.maxTeams}). Registration is closed.`}
                        </span>
                      </div>
                    )}
                    {registerError && (
                      <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs flex items-center gap-2">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{registerError}</span>
                      </div>
                    )}

                    {/* ═══ CASE A: AUCTION CANDIDATE FORM ═══ */}
                    {isAuction ? (
                      <div className="space-y-3.5">
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
                          <Sparkles className="size-4 shrink-0 mt-0.5" />
                          <span>
                            You are registering as an <strong>individual draft player</strong>. Provide your IGN, role, and gameplay montage clip so franchise owners can evaluate your gameplay during live bidding!
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Player Full Name *
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={50}
                              placeholder="e.g. Praveen Kumar"
                              value={playerName}
                              onChange={(e) => setPlayerName(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              In-Game Name (IGN) *
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={30}
                              placeholder="e.g. AURA_SNIPER99"
                              value={playerIgn}
                              onChange={(e) => setPlayerIgn(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Game UID *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 554910283"
                              value={playerGameUid}
                              onChange={(e) => setPlayerGameUid(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary text-xs"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Primary In-Game Role *
                              </label>
                              <span className="text-[10px] font-mono font-semibold text-primary">
                                {playerRole || 'Type custom role'}
                              </span>
                            </div>
                            <input
                              type="text"
                              required
                              placeholder="Type role (e.g. Rusher, Sniper, IGL, Entry Fragger...)"
                              value={playerRole}
                              onChange={(e) => setPlayerRole(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground font-semibold focus:outline-none focus:border-primary text-xs"
                            />
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              {[
                                'Primary Rusher',
                                'Secondary Rusher',
                                'Sniper',
                                'Nader + IGL',
                                'Support',
                                'All Rounder',
                              ].map((roleName) => (
                                <button
                                  key={roleName}
                                  type="button"
                                  onClick={() => setPlayerRole(roleName)}
                                  className={`text-[10px] px-2 py-0.5 rounded border transition ${
                                    playerRole.toLowerCase() === roleName.toLowerCase()
                                      ? 'bg-primary text-background border-primary font-bold'
                                      : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted'
                                  }`}
                                >
                                  {roleName}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Gameplay Montage Video URL & Player Photo */}
                        <div className="p-3 bg-muted/30 border border-primary/30 rounded-xl space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-1.5">
                              <Video className="size-3.5" />
                              Gameplay Highlight / Montage Video URL *
                            </label>
                            <input
                              type="url"
                              placeholder="e.g. YouTube Montage, Drive link, or Reel URL"
                              value={playerClipUrl}
                              onChange={(e) => setPlayerClipUrl(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Franchise team captains will preview this clip on your card during the auction hammer sequence!
                            </p>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Player Photo / Portrait URL (Optional)
                            </label>
                            <input
                              type="url"
                              placeholder="https://... photo url"
                              value={playerPhotoUrl}
                              onChange={(e) => setPlayerPhotoUrl(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Phone / WhatsApp *
                            </label>
                            <input
                              type="tel"
                              required
                              placeholder="+91 98765 43210"
                              value={playerPhone}
                              onChange={(e) => setPlayerPhone(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Email Address *
                            </label>
                            <input
                              type="email"
                              required
                              value={playerEmail}
                              onChange={(e) => setPlayerEmail(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Esports Experience (Years / Tourneys) *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 2 years, Semi-Pro, Tier-1 Scrims"
                              value={playerExperience}
                              onChange={(e) => setPlayerExperience(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Esports Achievements
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 4.5 K/D | 120+ Headshots | City Open Finalist"
                              value={playerAchievements}
                              onChange={(e) => setPlayerAchievements(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ) : isSolo ? (
                      /* ═══ CASE B: SOLO PLAYER FORM ═══ */
                      <div className="space-y-3.5">
                        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs flex items-center gap-2 text-cyan-300">
                          <Target className="size-4 shrink-0 text-cyan-400" />
                          <span>
                            <strong>Solo Registration:</strong> Enter your personal player credentials. Teammates are not required for this solo survival showdown.
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Player Full Name *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Rahul Sharma"
                              value={captainName}
                              onChange={(e) => setCaptainName(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Player In-Game IGN *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. SNIPER_SOLO99"
                              value={captainIgn}
                              onChange={(e) => setCaptainIgn(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Game UID *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 559104829"
                              value={player2Uid}
                              onChange={(e) => setPlayer2Uid(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Phone / WhatsApp *
                            </label>
                            <input
                              type="tel"
                              required
                              placeholder="+91 98765 43210"
                              value={captainPhone}
                              onChange={(e) => setCaptainPhone(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={captainEmail}
                            onChange={(e) => setCaptainEmail(e.target.value)}
                            className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      /* ═══ CASE C: STANDARD SQUAD FORM ═══ */
                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Team / Clan Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Aura XtremeZ"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Captain Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={captainName}
                              onChange={(e) => setCaptainName(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Captain In-Game IGN *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. AURA_SNIPER99"
                              value={captainIgn}
                              onChange={(e) => setCaptainIgn(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Captain Phone / WhatsApp *
                            </label>
                            <input
                              type="tel"
                              required
                              placeholder="+91 98765 43210"
                              value={captainPhone}
                              onChange={(e) => setCaptainPhone(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Captain Email *
                            </label>
                            <input
                              type="email"
                              required
                              value={captainEmail}
                              onChange={(e) => setCaptainEmail(e.target.value)}
                              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>
                        </div>

                        {/* Squad Members */}
                        <div className="pt-2 border-t border-border space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Squad Players Roster (IGN + Game UID)
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Player 2 IGN"
                              value={player2Ign}
                              onChange={(e) => setPlayer2Ign(e.target.value)}
                              className="bg-background border border-border rounded px-2.5 py-1.5 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Player 2 UID"
                              value={player2Uid}
                              onChange={(e) => setPlayer2Uid(e.target.value)}
                              className="bg-background border border-border rounded px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Player 3 IGN"
                              value={player3Ign}
                              onChange={(e) => setPlayer3Ign(e.target.value)}
                              className="bg-background border border-border rounded px-2.5 py-1.5 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Player 3 UID"
                              value={player3Uid}
                              onChange={(e) => setPlayer3Uid(e.target.value)}
                              className="bg-background border border-border rounded px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Player 4 IGN"
                              value={player4Ign}
                              onChange={(e) => setPlayer4Ign(e.target.value)}
                              className="bg-background border border-border rounded px-2.5 py-1.5 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Player 4 UID"
                              value={player4Uid}
                              onChange={(e) => setPlayer4Uid(e.target.value)}
                              className="bg-background border border-border rounded px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Player 5 / Sub IGN (Optional)"
                              value={player5Ign}
                              onChange={(e) => setPlayer5Ign(e.target.value)}
                              className="bg-background border border-border rounded px-2.5 py-1.5 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Player 5 UID (Optional)"
                              value={player5Uid}
                              onChange={(e) => setPlayer5Uid(e.target.value)}
                              className="bg-background border border-border rounded px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Team Esports Experience
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Tier-1 Scrims, 2 Years"
                                value={teamExperience}
                                onChange={(e) => setTeamExperience(e.target.value)}
                                className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Past Tournaments / Achievements
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Championship Winners"
                                value={teamAchievements}
                                onChange={(e) => setTeamAchievements(e.target.value)}
                                className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ═══ PAYMENT SCREENSHOT UPLOAD (PRIMARY PROOF) ═══ */}
                    {isPaid && (
                      <div className="p-3.5 bg-muted/40 border border-primary/30 rounded-xl space-y-3.5 pt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <QrCode className="size-4 text-primary" />
                            UPI Payment Verification
                          </span>
                          <span className="font-bold text-primary font-heading text-sm">{tournament.entryFee}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          {tournament.upiQrUrl && (
                            <img
                              src={tournament.upiQrUrl}
                              alt="Scan UPI"
                              className="size-20 bg-white p-1 rounded shrink-0 object-contain shadow-md"
                            />
                          )}
                          <div className="text-[11px] space-y-1">
                            <p className="text-muted-foreground">Scan QR or pay to UPI ID:</p>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded">
                                {tournament.upiId || 'rdkesports@upi'}
                              </span>
                              <button
                                type="button"
                                onClick={handleCopyUpi}
                                className="text-primary hover:underline text-[10px] font-bold"
                              >
                                {copiedUpi ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Payee: {tournament.upiName || 'Organizer'}
                            </p>
                          </div>
                        </div>

                        {/* File Upload Zone for Payment Screenshot */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Upload Payment Screenshot *
                          </label>

                          {screenshotPreview ? (
                            <div className="relative p-2.5 border border-emerald-500/40 bg-emerald-500/10 rounded-xl flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 truncate">
                                <img
                                  src={screenshotPreview}
                                  alt="Receipt Preview"
                                  className="size-14 rounded object-cover border border-emerald-500/40 shrink-0"
                                />
                                <div className="truncate">
                                  <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                                    <CheckCircle2 className="size-3.5" />
                                    <span>Screenshot Uploaded</span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground truncate block">
                                    {screenshotFileName || 'payment_receipt.png'}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setScreenshotPreview(null)
                                  setScreenshotFileName('')
                                }}
                                className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold text-muted-foreground hover:text-foreground shrink-0"
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <label className="border-2 border-dashed border-border hover:border-primary/50 bg-background/50 hover:bg-muted/30 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                              <Upload className="size-6 text-primary mb-1.5" />
                              <span className="text-xs font-bold text-foreground">Click to upload payment receipt</span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                Google Pay, PhonePe, Paytm screenshot (PNG, JPG)
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleScreenshotFileChange}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        {/* Optional UTR Field */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            12-Digit UTR Number (Optional if clearly shown in screenshot)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 409827361928"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value)}
                            className="w-full bg-background border border-border rounded px-3 py-1.5 text-foreground font-mono focus:outline-none focus:border-primary text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || !canRegister}
                        className="w-full py-2.5 rounded font-heading font-black text-xs text-background bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(255,46,0,0.4)] flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trophy className="size-4" />
                        )}
                        <span>
                          {isSubmitting
                            ? 'Submitting...'
                            : !canRegister
                            ? tournament.status === 'live'
                              ? 'REGISTRATION CLOSED (TOURNAMENT LIVE)'
                              : isSlotsFull
                              ? 'REGISTRATION CLOSED (SLOTS FULL)'
                              : 'REGISTRATION CLOSED'
                            : isAuction
                            ? 'SUBMIT AUCTION DRAFT PROFILE & PROOF'
                            : 'SUBMIT SQUAD REGISTRATION & PROOF'}
                        </span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Platform Branding Footer */}
      <div className="max-w-6xl mx-auto px-4 mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="RDK Logo" className="h-5 w-auto" />
          <span className="font-semibold text-foreground">RDK Technologies</span>
          <span>• Powered by RDK Technologies Tournament OS</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Official Tournament Conducted by {tournament.creatorName}. All standings and brackets securely tracked.
        </p>
      </div>
    </div>
  )
}
