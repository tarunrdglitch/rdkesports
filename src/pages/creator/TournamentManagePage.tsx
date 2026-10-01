import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Trophy,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Copy,
  Users,
  ExternalLink,
  Save,
  Radio,
  Clock,
  Sparkles,
  Search,
  GitBranch,
  Download,
  Edit3,
  Plus,
  Trash2,
  Crown,
  Check,
  FileSpreadsheet,
  X,
  FileText,
  Tv,
  Video,
  Globe,
  Gavel,
  ShieldAlert,
  Shield,
  Upload,
  Phone,
  Mail,
  Landmark,
  Receipt,
  Lock,
  Unlock,
  QrCode,
  AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useAuth } from '@/stores/authStore'
import { parseStreamEmbed } from '@/utils/stream'
import {
  TournamentRoadmapTree,
  TournamentRoadmap,
  BracketMatch,
} from '@/components/tournament/TournamentRoadmapTree'

interface Tournament {
  id: string
  slug: string
  name: string
  creatorId?: string
  creatorName: string
  game: string
  format: string
  status: 'draft' | 'registration_open' | 'live' | 'completed'
  startDate: string
  prizePool: string
  entryFee: string
  registeredTeamsCount: number
  maxTeams: number
  roomId?: string
  roomPassword?: string
  roomPublished?: boolean
  grossRevenue?: number
  rdkFee?: number
  partnerNet?: number
  settlementStatus?: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'
  isClosed?: boolean
  closedAt?: string
  upiId?: string
  upiName?: string
  rules?: string
  streamUrl?: string
  streamTitle?: string
  streamStatus?: 'offline' | 'starting_soon' | 'live'
  scheduledMatchInfo?: string
}

interface SettlementInfo {
  tournament: {
    id: string
    name: string
    type?: string
    status: string
    isClosed?: boolean
    closedAt?: string
  }
  finances: {
    entryFee: number
    approvedEntries: number
    totalEntries: number
    grossRevenue: number
    rdkFeeRate: number
    rdkFee: number
    partnerNet: number
    settlementStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'
    isClosed: boolean
    canClose: boolean
  }
  settlement?: {
    id?: string
    tournamentId: string
    status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'
    rdkFee: number
    grossRevenue: number
    utr?: string
    screenshotUrl?: string
    submittedAt?: string
    verifiedAt?: string
    verifiedBy?: string
    rejectionReason?: string
  }
  platformAccount: {
    accountName: string
    upiId: string
    bankName: string
    accountNumber: string
    ifsc: string
    qrCodeUrl: string
  }
}

interface Team {
  id: string
  name: string
  captainName: string
  captainEmail: string
  captainPhone: string
  captainIgn: string
  players: { ign: string; gameUid: string }[]
  status: 'pending' | 'verified' | 'rejected'
  utr?: string
  registeredAt: string
  ambassadorId?: string
  ambassadorName?: string
  role?: string
  experience?: string
  achievements?: string
  clipUrl?: string
  group?: string
}

interface Payment {
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
  rejectionReason?: string
}

function parseFee(fee: string | number | undefined): number {
  if (typeof fee === 'number') return fee
  if (!fee) return 0
  const cleaned = String(fee).replace(/[^0-9.]/g, '')
  return cleaned ? parseFloat(cleaned) : 0
}

export default function TournamentManagePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role === 'ambassador') {
      navigate('/ambassador/dashboard', { replace: true })
    }
  }, [user, navigate])

  interface TournamentAmbassador {
    id: string
    name: string
    email: string
    tournamentId: string
    tournamentName: string
    assignedTeamRange: string
    phone?: string
    createdAt: string
  }

  type TabType = 'teams' | 'room' | 'live' | 'roadmap' | 'payments' | 'auction' | 'ambassadors' | 'settlement'

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('teams')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Ambassador state for this tournament (Auction only)
  const [ambassadors, setAmbassadors] = useState<TournamentAmbassador[]>([])
  const [isAmbassadorModalOpen, setIsAmbassadorModalOpen] = useState(false)
  const [isSubmittingAmbassador, setIsSubmittingAmbassador] = useState(false)
  const [ambassadorForm, setAmbassadorForm] = useState({
    name: '',
    email: '',
    password: 'password123',
    assignedTeamRange: 'Teams 1 to 16',
    phone: '',
  })

  // Live Stream Broadcast Studio State
  const [streamUrl, setStreamUrl] = useState('')
  const [streamTitle, setStreamTitle] = useState('')
  const [streamStatus, setStreamStatus] = useState<'offline' | 'starting_soon' | 'live'>('offline')
  const [scheduledMatchInfo, setScheduledMatchInfo] = useState('')
  const [isSavingStream, setIsSavingStream] = useState(false)

  // Room Credentials State
  const [roomId, setRoomId] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [roomPublished, setRoomPublished] = useState(false)
  const [isSavingRoom, setIsSavingRoom] = useState(false)

  // Platform Settlement & Closure State
  const [settlementInfo, setSettlementInfo] = useState<SettlementInfo | null>(null)
  const [settlementForm, setSettlementForm] = useState({
    utr: '',
    screenshotUrl: '',
    notes: '',
  })
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false)
  const [isClosingTournament, setIsClosingTournament] = useState(false)

  // Status State
  const [tourneyStatus, setTourneyStatus] = useState<
    'draft' | 'registration_open' | 'live' | 'completed'
  >('registration_open')

  // Search filter
  const [searchQuery, setSearchQuery] = useState('')

  // Roadmap & Bracket State
  const [roadmap, setRoadmap] = useState<TournamentRoadmap | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null)
  const [isSavingRoadmap, setIsSavingRoadmap] = useState(false)

  // Rulebook Editor State
  const [rulesText, setRulesText] = useState('')
  const [isSavingRules, setIsSavingRules] = useState(false)

  // Sheet Import & Team Management State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false)
  const [isBatchAllotModalOpen, setIsBatchAllotModalOpen] = useState(false)
  const [importSheetUrl, setImportSheetUrl] = useState(
    'https://docs.google.com/spreadsheets/d/1tEgKRgm-P-HuOtrWtvC9Xt6hXTQec6dVbm1lEUu7w1Y/edit?usp=sharing'
  )
  const [importMode, setImportMode] = useState<'individual' | 'squads'>('individual')
  const [playersPerTeam, setPlayersPerTeam] = useState(4)
  const [teamNamePrefix, setTeamNamePrefix] = useState('Team')
  const [importAmbassadorId, setImportAmbassadorId] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [ambassadorFilter, setAmbassadorFilter] = useState<'all' | 'unassigned' | string>('all')
  const [teamGroupFilter, setTeamGroupFilter] = useState<'all' | 'GROUP A' | 'GROUP B' | 'GROUP C'>('all')

  // Edit / Add Team Form State
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [teamForm, setTeamForm] = useState({
    name: '',
    captainName: '',
    captainIgn: '',
    captainPhone: '',
    captainEmail: '',
    playersText: '',
    ambassadorId: '',
  })
  const [isSavingTeam, setIsSavingTeam] = useState(false)

  // Batch Allot State
  const [batchAmbassadorId, setBatchAmbassadorId] = useState('')
  const [batchRangeFrom, setBatchRangeFrom] = useState(1)
  const [batchRangeTo, setBatchRangeTo] = useState(18)
  const [isBatchAllotting, setIsBatchAllotting] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  const loadAmbassadors = async () => {
    try {
      const res = await fetch('/api/creators/ambassadors')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setAmbassadors(data.filter((a: TournamentAmbassador) => a.tournamentId === id || a.tournamentName === tournament?.name))
        }
      }
    } catch {
      // Fallback
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [tRes, pRes, rRes] = await Promise.all([
        fetch(`/api/tournaments/${id}`),
        fetch(`/api/tournaments/${id}/payments`),
        fetch(`/api/tournaments/${id}/roadmap`),
      ])

      if (!tRes.ok) throw new Error('Tournament not found')
      const tData = await tRes.json()
      const t = tData.tournament
      setTournament(t)
      setTeams(tData.teams || [])
      setRoomId(t.roomId || '')
      setRoomPassword(t.roomPassword || '')
      setRoomPublished(Boolean(t.roomPublished))
      setTourneyStatus(t.status)
      setRulesText(t.rules || '')
      setStreamUrl(t.streamUrl || '')
      setStreamTitle(t.streamTitle || '')
      setStreamStatus(t.streamStatus || 'offline')
      setScheduledMatchInfo(t.scheduledMatchInfo || '')

      loadSettlement()

      const isAuctionTournament = t.format === 'Auction Tournament' || t.format?.toLowerCase().includes('auction')
      const isPaidTournament = parseFee(t.entryFee) > 0 && !String(t.entryFee || '').toLowerCase().includes('free')

      // Only show applicable tab as default
      if (isAuctionTournament) {
        setActiveTab('auction')
      } else if (isPaidTournament) {
        setActiveTab('payments')
      } else {
        setActiveTab('teams')
      }

      if (pRes.ok) {
        const pData = await pRes.json()
        setPayments(pData)
      }

      if (rRes.ok) {
        const rData = await rRes.json()
        setRoadmap(rData.roadmap)
      }

      // Load ambassadors assigned strictly to this tournament
      fetch('/api/creators/ambassadors')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setAmbassadors(data.filter((a: TournamentAmbassador) => a.tournamentId === id || a.tournamentName === t.name))
          }
        })
        .catch(() => {})
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to load tournament data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveStream = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setIsSavingStream(true)
    setSuccessMsg('')
    try {
      const res = await fetch(`/api/tournaments/${id}/stream`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamUrl,
          streamTitle,
          streamStatus,
          scheduledMatchInfo,
        }),
      })
      if (!res.ok) throw new Error('Failed to update live stream broadcast')
      const data = await res.json()
      if (tournament) {
        setTournament({ ...tournament, ...data.tournament })
      }
      setSuccessMsg('Live Stream & Match Schedule broadcasted successfully! Audience can now watch live.')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to save stream')
    } finally {
      setIsSavingStream(false)
    }
  }

  const loadSettlement = async () => {
    try {
      const res = await fetch(`/api/tournaments/${id}/settlement`)
      if (res.ok) {
        const data = await res.json()
        setSettlementInfo(data)
      }
    } catch {
      // Ignored
    }
  }

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingRoom(true)
    setSuccessMsg('')
    try {
      const res = await fetch(`/api/tournaments/${id}/room`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, roomPassword, roomPublished }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to update room credentials')
      }
      setSuccessMsg(
        roomPublished
          ? 'Match Room ID & Password broadcasted and LIVE to verified captains!'
          : 'Match Room credentials saved in DRAFT mode (hidden from players).'
      )
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
    } finally {
      setIsSavingRoom(false)
    }
  }

  const handleUpdateStatus = async (
    newStatus: 'draft' | 'registration_open' | 'live' | 'completed'
  ) => {
    try {
      setError('')
      const res = await fetch(`/api/tournaments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setTourneyStatus(newStatus)
        setSuccessMsg(`Tournament status changed to ${newStatus.replace('_', ' ')}`)
        setTimeout(() => setSuccessMsg(''), 3000)
        loadData()
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Failed to update status')
        setTimeout(() => setError(''), 6000)
      }
    } catch {
      setError('Failed to update status')
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingSettlement(true)
    setError('')
    try {
      const res = await fetch(`/api/tournaments/${id}/settlement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settlementForm),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to submit settlement proof')
      }
      setSuccessMsg('RDK 10% platform settlement submitted! Super Admin has been notified for verification.')
      setTimeout(() => setSuccessMsg(''), 4000)
      setSettlementForm({ utr: '', screenshotUrl: '', notes: '' })
      loadSettlement()
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to submit settlement')
    } finally {
      setIsSubmittingSettlement(false)
    }
  }

  const handleOfficialClosure = async () => {
    if (!window.confirm('Confirm Official Tournament Closure? All records and team statistics will be permanently archived for platform audit history.')) {
      return
    }
    setIsClosingTournament(true)
    setError('')
    try {
      const res = await fetch(`/api/tournaments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to close tournament')
      }
      setTourneyStatus('completed')
      setSuccessMsg('Tournament officially closed and archived! Congratulations on hosting with RDK Technologies.')
      setTimeout(() => setSuccessMsg(''), 5000)
      loadData()
      loadSettlement()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to close tournament')
    } finally {
      setIsClosingTournament(false)
    }
  }

  const handleVerifyPayment = async (paymentId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Verification failed')
      setSuccessMsg(`Payment marked as ${status}! Team status updated.`)
      setTimeout(() => setSuccessMsg(''), 3000)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
    }
  }

  const handleCreateAmbassador = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tournament) return
    setIsSubmittingAmbassador(true)
    setError('')
    try {
      const res = await fetch('/api/creators/ambassadors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ambassadorForm.name,
          email: ambassadorForm.email,
          password: ambassadorForm.password,
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          assignedTeamRange: ambassadorForm.assignedTeamRange,
          phone: ambassadorForm.phone,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to create ambassador')
      }
      setSuccessMsg(`Temp Ambassador "${ambassadorForm.name}" created for ${tournament.name}! Access credentials issued.`)
      setTimeout(() => setSuccessMsg(''), 4000)
      setIsAmbassadorModalOpen(false)
      setAmbassadorForm({
        name: '',
        email: '',
        password: 'password123',
        assignedTeamRange: 'Teams 1 to 16',
        phone: '',
      })
      loadAmbassadors()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to provision ambassador')
    } finally {
      setIsSubmittingAmbassador(false)
    }
  }

  const handleDeleteAmbassador = async (ambId: string, ambName: string) => {
    if (!confirm(`Revoke temporary ambassador access for ${ambName}? Their login will be immediately disabled.`)) return
    try {
      const res = await fetch(`/api/creators/ambassadors/${ambId}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccessMsg(`Ambassador ${ambName} revoked successfully.`)
        setTimeout(() => setSuccessMsg(''), 3000)
        loadAmbassadors()
      } else {
        throw new Error('Failed to revoke ambassador')
      }
    } catch {
      setError('Failed to revoke ambassador')
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GOOGLE SHEET IMPORT & TEAM ALLOTMENT HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const handleImportSheet = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsImporting(true)
    setError('')
    setSuccessMsg('')
    try {
      const selectedAmb = ambassadors.find((a) => a.id === importAmbassadorId)
      const res = await fetch(`/api/tournaments/${id}/import-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl: importSheetUrl,
          mode: importMode,
          playersPerTeam,
          teamNamePrefix,
          ambassadorId: importAmbassadorId || undefined,
          ambassadorName: selectedAmb?.name || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to import sheet')

      setSuccessMsg(data.message || `Successfully imported ${data.count} entries!`)
      setIsImportModalOpen(false)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to import from sheet')
    } finally {
      setIsImporting(false)
    }
  }

  const handleQuickAssignAmbassador = async (teamId: string, ambassadorId: string) => {
    const selectedAmb = ambassadors.find((a) => a.id === ambassadorId)
    const ambName = selectedAmb ? selectedAmb.name : ''

    // Optimistic UI update
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? { ...t, ambassadorId: ambassadorId || undefined, ambassadorName: ambName || undefined }
          : t
      )
    )

    try {
      const res = await fetch(`/api/tournaments/${id}/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ambassadorId: ambassadorId || null,
          ambassadorName: ambName || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to update ambassador')
      setSuccessMsg(selectedAmb ? `Squad allotted to ${selectedAmb.name}!` : 'Ambassador unassigned')
      setTimeout(() => setSuccessMsg(''), 2500)
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to allot ambassador')
      loadData()
    }
  }

  const handleOpenAddTeam = () => {
    setEditingTeam(null)
    setTeamForm({
      name: '',
      captainName: '',
      captainIgn: '',
      captainPhone: '',
      captainEmail: '',
      playersText: '',
      ambassadorId: '',
    })
    setIsAddTeamModalOpen(true)
  }

  const handleOpenEditTeam = (t: Team) => {
    setEditingTeam(t)
    setTeamForm({
      name: t.name,
      captainName: t.captainName,
      captainIgn: t.captainIgn,
      captainPhone: t.captainPhone,
      captainEmail: t.captainEmail,
      playersText: t.players?.map((p) => p.ign).join('\n') || t.captainIgn,
      ambassadorId: t.ambassadorId || '',
    })
    setIsAddTeamModalOpen(true)
  }

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingTeam(true)
    setError('')
    try {
      const selectedAmb = ambassadors.find((a) => a.id === teamForm.ambassadorId)
      const parsedPlayers = teamForm.playersText
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((ign) => ({ ign, gameUid: 'N/A' }))

      const payload = {
        name: teamForm.name,
        captainName: teamForm.captainName,
        captainIgn: teamForm.captainIgn,
        captainPhone: teamForm.captainPhone,
        captainEmail: teamForm.captainEmail,
        players: parsedPlayers.length > 0 ? parsedPlayers : [{ ign: teamForm.captainIgn, gameUid: 'N/A' }],
        ambassadorId: teamForm.ambassadorId || null,
        ambassadorName: selectedAmb ? selectedAmb.name : null,
      }

      const url = editingTeam
        ? `/api/tournaments/${id}/teams/${editingTeam.id}`
        : `/api/tournaments/${id}/teams`
      const method = editingTeam ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to save team')
      }

      setSuccessMsg(editingTeam ? 'Team updated successfully!' : 'Team added successfully!')
      setIsAddTeamModalOpen(false)
      setEditingTeam(null)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to save team')
    } finally {
      setIsSavingTeam(false)
    }
  }

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${teamName}" from the roster?`)) return
    try {
      const res = await fetch(`/api/tournaments/${id}/teams/${teamId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove team')
      setSuccessMsg(`Team "${teamName}" removed`)
      setTeams((prev) => prev.filter((t) => t.id !== teamId))
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to delete team')
    }
  }

  const handleBatchAllot = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsBatchAllotting(true)
    setError('')
    try {
      const selectedAmb = ambassadors.find((a) => a.id === batchAmbassadorId)
      const res = await fetch(`/api/tournaments/${id}/teams/batch-allot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rangeFrom: batchRangeFrom,
          rangeTo: batchRangeTo,
          ambassadorId: batchAmbassadorId || null,
          ambassadorName: selectedAmb ? selectedAmb.name : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to batch allot')

      setSuccessMsg(`Allotted ${data.updatedCount} squads to ${selectedAmb ? selectedAmb.name : 'Unassigned'}!`)
      setIsBatchAllotModalOpen(false)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to batch allot')
    } finally {
      setIsBatchAllotting(false)
    }
  }

  // Roadmap Match Customizer Handlers
  const handleUpdateSelectedMatch = (updated: Partial<BracketMatch>) => {
    if (!roadmap || !selectedMatch) return
    const updatedStages = roadmap.stages.map((st) => {
      const matchIdx = st.matches.findIndex((m) => m.id === selectedMatch.id)
      if (matchIdx !== -1) {
        const newMatches = [...st.matches]
        newMatches[matchIdx] = { ...newMatches[matchIdx], ...updated }
        return { ...st, matches: newMatches }
      }
      return st
    })
    const newRoadmap = { ...roadmap, stages: updatedStages }
    setRoadmap(newRoadmap)
    setSelectedMatch({ ...selectedMatch, ...updated })
  }

  const handleSetWinner = (teamNum: 1 | 2) => {
    if (!selectedMatch) return
    const isTeam1 = teamNum === 1
    const winnerName = isTeam1 ? selectedMatch.team1.name : selectedMatch.team2.name

    handleUpdateSelectedMatch({
      team1: { ...selectedMatch.team1, isWinner: isTeam1 },
      team2: { ...selectedMatch.team2, isWinner: !isTeam1 },
      status: 'completed',
    })
    setSuccessMsg(`Winner recorded: ${winnerName}! Bracket updated.`)
    setTimeout(() => setSuccessMsg(''), 2500)
  }

  const handleDeleteMatch = (matchId: string) => {
    if (!roadmap) return
    const updatedStages = roadmap.stages.map((st) => ({
      ...st,
      matches: st.matches.filter((m) => m.id !== matchId),
    }))
    setRoadmap({ ...roadmap, stages: updatedStages })
    if (selectedMatch?.id === matchId) {
      setSelectedMatch(null)
    }
    setSuccessMsg('Match box removed from bracket')
    setTimeout(() => setSuccessMsg(''), 2500)
  }

  const handleSaveRoadmap = async () => {
    if (!roadmap) return
    setIsSavingRoadmap(true)
    try {
      const res = await fetch(`/api/tournaments/${id}/roadmap`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmap }),
      })
      if (!res.ok) throw new Error('Failed to save roadmap')
      setSuccessMsg('Roadmap & Bracket published successfully to audience portal!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
    } finally {
      setIsSavingRoadmap(false)
    }
  }

  const handleSaveRulebook = async () => {
    setIsSavingRules(true)
    try {
      const res = await fetch(`/api/tournaments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: rulesText }),
      })
      if (!res.ok) throw new Error('Failed to save rulebook')
      setSuccessMsg('Tournament rulebook updated successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
    } finally {
      setIsSavingRules(false)
    }
  }

  const handleInjectRulePreset = (preset: string) => {
    setRulesText((prev) => (prev ? `${prev}\n• ${preset}` : `• ${preset}`))
  }

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!tournament) {
    return <div className="p-8 text-center text-muted-foreground">Tournament not found</div>
  }

  const isAuction = tournament.format === 'Auction Tournament' || tournament.format?.toLowerCase().includes('auction')
  const entryFeeNumber = parseFee(tournament.entryFee)
  const isPaid = entryFeeNumber > 0 && !String(tournament.entryFee || '').toLowerCase().includes('free')
  const pendingPayments = payments.filter((p) => p.status === 'pending')
  const approvedPayments = payments.filter((p) => p.status === 'approved')

  const totalGrossCollected = settlementInfo?.finances?.grossRevenue ?? (entryFeeNumber * approvedPayments.length)
  const totalRdkFeeDue = settlementInfo?.finances?.rdkFee ?? Math.round(totalGrossCollected * 0.10)
  const totalPartnerNet = settlementInfo?.finances?.partnerNet ?? (totalGrossCollected - totalRdkFeeDue)
  const canClose = settlementInfo?.finances?.canClose ?? (
    !isPaid || totalGrossCollected === 0 || tournament.settlementStatus === 'VERIFIED'
  )

  return (
    <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4 space-y-6">
      {/* Header */}
      <PageHeader
        title={tournament.name}
        description={`Tournament Control Room • ${tournament.game} • Hosted by ${tournament.creatorName}`}
        actions={
          <div className="flex items-center gap-2">
            <a
              href={`/api/tournaments/${tournament.id}/export`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-card hover:bg-muted border border-border rounded px-3 py-1.5 transition-colors shadow-sm"
              title="Export registered teams and candidates as CSV"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-400" />
              <span>Export to Google Sheets</span>
            </a>
            <Link
              to={`/tournament/${tournament.id}`}
              target="_blank"
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded px-3 py-1.5 transition-colors"
            >
              <ExternalLink className="size-3.5" />
              <span>Public Page</span>
            </Link>
          </div>
        }
      />

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Status Bar */}
      <div className="p-4 rounded-xl border border-border bg-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Status:
          </span>
          <StatusBadge status={tourneyStatus} />
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-xs font-bold text-muted-foreground uppercase">Format:</span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              isAuction
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-muted text-foreground border border-border'
            }`}
          >
            {tournament.format}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              isPaid
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-muted text-muted-foreground border border-border'
            }`}
          >
            {isPaid ? `Entry Fee: ₹${entryFeeNumber}` : 'Free Entry (₹0)'}
          </span>
        </div>

        {/* Change Status Control */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
          {(['draft', 'registration_open', 'live', 'completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => handleUpdateStatus(st)}
              className={`px-3 py-1 text-[11px] font-bold rounded capitalize transition-all ${
                tourneyStatus === st
                  ? 'bg-primary text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Tabs - Dynamically filtered according to tournament type */}
      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
            activeTab === 'teams'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="size-4" />
          <span>Registered Teams ({teams.length})</span>
        </button>

        {/* AUCTION TOURNAMENT ONLY TABS */}
        {isAuction && (
          <>
            <button
              onClick={() => setActiveTab('auction')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
                activeTab === 'auction'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Gavel className="size-4 text-amber-400" />
              <span>Live Auction Stage</span>
              <span className="rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[9px] font-bold">
                AUCTION
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ambassadors')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
                activeTab === 'ambassadors'
                  ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldAlert className="size-4 text-purple-400" />
              <span>Franchise Ambassadors ({ambassadors.length})</span>
              <span className="rounded bg-purple-500/20 text-purple-300 px-1.5 py-0.5 text-[9px] font-bold">
                STAFF
              </span>
            </button>
          </>
        )}

        {/* PAID ENTRY TOURNAMENT ONLY TAB */}
        {isPaid && (
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'payments'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="size-4" />
            <span>UPI Payment Verification</span>
            {pendingPayments.length > 0 && (
              <span className="size-4 rounded-full bg-primary text-background flex items-center justify-center text-[10px] font-black">
                {pendingPayments.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('room')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
            activeTab === 'room'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <KeyRound className="size-4" />
          <span>Match Room Credentials</span>
          {tournament.roomId && <span className="size-2 rounded-full bg-emerald-400" />}
        </button>

        <button
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
            activeTab === 'live'
              ? 'border-red-500 text-red-400 bg-red-500/10'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="size-4 text-red-500 animate-pulse" />
          <span>Live Stream & Schedule</span>
          {streamStatus === 'live' ? (
            <span className="size-2 rounded-full bg-red-500 animate-ping" />
          ) : streamStatus === 'starting_soon' ? (
            <span className="size-2 rounded-full bg-amber-400" />
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('roadmap')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
            activeTab === 'roadmap'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <GitBranch className="size-4 text-blue-400" />
          <span>Roadmap & Rulebook Studio</span>
          <span className="rounded bg-blue-500/20 text-blue-400 px-1.5 py-0.5 text-[9px] font-bold">
            CUSTOMIZER
          </span>
        </button>

        {/* RDK 10% PLATFORM SETTLEMENT & CLOSURE TAB */}
        <button
          onClick={() => setActiveTab('settlement')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
            activeTab === 'settlement'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="size-4 text-emerald-400" />
          <span>Platform Settlement & Closure</span>
          {tournament.settlementStatus === 'VERIFIED' ? (
            <span className="rounded bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 text-[9px] font-bold">
              VERIFIED
            </span>
          ) : tournament.settlementStatus === 'UNDER_REVIEW' ? (
            <span className="rounded bg-blue-500/20 text-blue-400 px-1.5 py-0.5 text-[9px] font-bold">
              IN REVIEW
            </span>
          ) : isPaid ? (
            <span className="rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[9px] font-bold">
              10% DUE
            </span>
          ) : (
            <span className="rounded bg-muted text-muted-foreground px-1.5 py-0.5 text-[9px] font-bold">
              FREE
            </span>
          )}
        </button>
      </div>

      {/* TAB: LIVE STREAM BROADCAST & MATCH SCHEDULE STUDIO */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-background to-card flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-400">
                <Radio className="size-4 animate-pulse" />
                <span>OFFICIAL LIVE STREAM BROADCAST STUDIO</span>
              </div>
              <h3 className="mt-1 font-heading text-lg font-black uppercase text-foreground">
                Match Live Streaming & Spectator Feed
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste your YouTube Live or Twitch stream link and set the match schedule. Non-registered spectators & audience can watch live directly on the public tournament page!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveStream}
                disabled={isSavingStream}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition disabled:opacity-50 active:scale-95"
              >
                <Save className="size-3.5" />
                {isSavingStream ? 'Publishing Stream…' : 'Save & Broadcast Live Stream'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-5 rounded-xl border border-border bg-card p-5 shadow-lg">
              {/* Stream Status Toggle */}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  Broadcast On-Air Status:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStreamStatus('offline')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      streamStatus === 'offline'
                        ? 'border-muted-foreground bg-muted text-foreground ring-1 ring-border'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span className="size-2 rounded-full bg-muted-foreground" />
                    Offline
                  </button>

                  <button
                    type="button"
                    onClick={() => setStreamStatus('starting_soon')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      streamStatus === 'starting_soon'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                    Starting Soon
                  </button>

                  <button
                    type="button"
                    onClick={() => setStreamStatus('live')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      streamStatus === 'live'
                        ? 'border-red-500 bg-red-600 text-white shadow-lg shadow-red-600/40 ring-1 ring-red-400'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span className="size-2 rounded-full bg-white animate-ping" />
                    Live Now
                  </button>
                </div>
              </div>

              {/* Stream URL */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Live Stream Video URL (YouTube / Twitch / Kick):
                  </label>
                  {streamUrl && (
                    <span className="text-[10px] uppercase font-bold text-primary">
                      {parseStreamEmbed(streamUrl).platform.toUpperCase()} DETECTED
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://twitch.tv/..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-red-500"
                />

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-muted-foreground">Quick Test Links:</span>
                  <button
                    type="button"
                    onClick={() => setStreamUrl('https://www.youtube.com/watch?v=jfKfPfyJRdk')}
                    className="text-[10px] px-2 py-0.5 rounded border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    YouTube Gaming Live
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamUrl('https://www.twitch.tv/eslcs')}
                    className="text-[10px] px-2 py-0.5 rounded border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    Twitch Stream
                  </button>
                  {streamUrl && (
                    <button
                      type="button"
                      onClick={() => setStreamUrl('')}
                      className="text-[10px] px-1.5 py-0.5 text-red-400 hover:underline ml-auto"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Broadcast Headline / Stream Title */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Broadcast Stream Title / Headline:
                </label>
                <input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder="e.g. Official Championship Grand Finale • Tamil Titan Live Stream"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Match Schedule / Fixture Info */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Scheduled Match Timing & Stage Info:
                </label>
                <input
                  type="text"
                  value={scheduledMatchInfo}
                  onChange={(e) => setScheduledMatchInfo(e.target.value)}
                  placeholder="e.g. Quarter-Finals Match 1 • Today 07:00 PM IST"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-red-500 font-mono"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  This schedule banner informs spectators and waiting viewers exactly when the match starts.
                </p>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Stream is publicly accessible without registration.
                </span>
                <button
                  type="button"
                  onClick={handleSaveStream}
                  disabled={isSavingStream}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-bold text-white shadow transition disabled:opacity-50"
                >
                  <Save className="size-3.5" />
                  {isSavingStream ? 'Saving…' : 'Publish Broadcast'}
                </button>
              </div>
            </div>

            {/* Live Preview Screen (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="rounded-xl border border-border bg-card p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Eye className="size-3.5 text-primary" /> Spectator Live Preview
                  </span>
                  {streamStatus === 'live' ? (
                    <span className="rounded bg-red-500 text-white text-[10px] font-black px-2 py-0.5 animate-pulse uppercase">
                      ON AIR
                    </span>
                  ) : streamStatus === 'starting_soon' ? (
                    <span className="rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 uppercase">
                      STARTING SOON
                    </span>
                  ) : (
                    <span className="rounded bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 uppercase">
                      OFFLINE
                    </span>
                  )}
                </div>

                {/* Video Player Box */}
                <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border bg-black flex items-center justify-center shadow-inner">
                  {parseStreamEmbed(streamUrl).isValid ? (
                    <iframe
                      src={parseStreamEmbed(streamUrl).embedUrl}
                      title="Live Stream Preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="size-full border-0"
                    />
                  ) : (
                    <div className="p-6 text-center text-muted-foreground space-y-2">
                      <Tv className="size-10 mx-auto text-muted-foreground opacity-40 animate-pulse" />
                      <p className="text-xs font-bold text-foreground">No Live Feed Link Entered</p>
                      <p className="text-[11px] max-w-[200px] mx-auto text-muted-foreground">
                        Paste a valid YouTube or Twitch link on the left to see the live stream embed preview.
                      </p>
                    </div>
                  )}
                </div>

                {/* Preview Meta */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                  <div className="text-xs font-bold text-foreground truncate">
                    {streamTitle || 'Official Championship Live Stream'}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                    <Clock className="size-3" />
                    <span>{scheduledMatchInfo || 'Schedule: To be announced'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: VISUAL ROADMAP & RULEBOOK STUDIO */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-blue-900/50 bg-blue-950/20">
            <div>
              <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                <GitBranch className="size-4 text-blue-400" />
                Live Bracket Customizer & Rulebook Studio
              </h3>
              <p className="text-xs text-blue-200/70 mt-0.5">
                Click any match card in the tree below to edit team names, enter live scores, or award winner advancements.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveRoadmap}
                disabled={isSavingRoadmap}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-background shadow hover:opacity-90 transition disabled:opacity-50"
              >
                <Save className="size-3.5" />
                {isSavingRoadmap ? 'Broadcasting…' : 'Save & Broadcast Live Roadmap'}
              </button>
            </div>
          </div>

          {/* Interactive Visual Roadmap Bracket Tree */}
          {roadmap && (
            <TournamentRoadmapTree
              roadmap={roadmap}
              isEditable
              selectedMatchId={selectedMatch?.id}
              onSelectMatch={(m) => setSelectedMatch(m)}
              onUpdateRoadmap={(updatedRoadmap) => setRoadmap(updatedRoadmap)}
              onDeleteMatch={handleDeleteMatch}
            />
          )}

          {/* Match Customization Drawer / Panel */}
          {selectedMatch && (
            <div className="rounded-xl border border-primary/40 bg-card p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="size-6 rounded bg-primary text-background flex items-center justify-center font-black text-xs">
                    M{selectedMatch.matchNumber}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      Edit Match Fixture • {selectedMatch.stageId.toUpperCase()}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Type custom team names or pick from enrolled tournament teams
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteMatch(selectedMatch.id)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 transition"
                    title="Delete this match box"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete Box</span>
                  </button>
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team 1 Configuration */}
                <div
                  className={`p-4 rounded-xl border space-y-3 transition ${
                    selectedMatch.team1.isWinner
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-border bg-muted/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Users className="size-3.5 text-blue-400" />
                      Team 1
                    </span>
                    {selectedMatch.team1.isWinner && (
                      <span className="rounded bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                        <Crown className="size-3 text-amber-300" /> WINNER
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Team Name:
                    </label>
                    <input
                      type="text"
                      value={selectedMatch.team1.name}
                      onChange={(e) =>
                        handleUpdateSelectedMatch({
                          team1: { ...selectedMatch.team1, name: e.target.value },
                        })
                      }
                      placeholder="e.g. Monaco, Chelsea, Aura XtremeZ"
                      className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                    />
                    {teams.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">Pick Enrolled:</span>
                        {teams.slice(0, 4).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() =>
                              handleUpdateSelectedMatch({
                                team1: { ...selectedMatch.team1, name: t.name },
                              })
                            }
                            className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/40 hover:bg-muted text-foreground"
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                        Seed / Rank:
                      </label>
                      <input
                        type="text"
                        value={selectedMatch.team1.seed || ''}
                        onChange={(e) =>
                          handleUpdateSelectedMatch({
                            team1: { ...selectedMatch.team1, seed: e.target.value },
                          })
                        }
                        placeholder="e.g. 1"
                        className="w-full bg-background border border-border rounded px-2.5 py-1 text-xs font-mono text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                        Score:
                      </label>
                      <input
                        type="text"
                        value={selectedMatch.team1.score || ''}
                        onChange={(e) =>
                          handleUpdateSelectedMatch({
                            team1: { ...selectedMatch.team1, score: e.target.value },
                          })
                        }
                        placeholder="e.g. 2"
                        className="w-full bg-background border border-border rounded px-2.5 py-1 text-xs font-mono font-bold text-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSetWinner(1)}
                    className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <Crown className="size-3.5 text-amber-300" /> Award Win to Team 1
                  </button>
                </div>

                {/* Team 2 Configuration */}
                <div
                  className={`p-4 rounded-xl border space-y-3 transition ${
                    selectedMatch.team2.isWinner
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-border bg-muted/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Users className="size-3.5 text-blue-400" />
                      Team 2
                    </span>
                    {selectedMatch.team2.isWinner && (
                      <span className="rounded bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                        <Crown className="size-3 text-amber-300" /> WINNER
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Team Name:
                    </label>
                    <input
                      type="text"
                      value={selectedMatch.team2.name}
                      onChange={(e) =>
                        handleUpdateSelectedMatch({
                          team2: { ...selectedMatch.team2, name: e.target.value },
                        })
                      }
                      placeholder="e.g. Paris, Liverpool, Tamil Titans"
                      className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                    />
                    {teams.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">Pick Enrolled:</span>
                        {teams.slice(0, 4).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() =>
                              handleUpdateSelectedMatch({
                                team2: { ...selectedMatch.team2, name: t.name },
                              })
                            }
                            className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/40 hover:bg-muted text-foreground"
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                        Seed / Rank:
                      </label>
                      <input
                        type="text"
                        value={selectedMatch.team2.seed || ''}
                        onChange={(e) =>
                          handleUpdateSelectedMatch({
                            team2: { ...selectedMatch.team2, seed: e.target.value },
                          })
                        }
                        placeholder="e.g. 2"
                        className="w-full bg-background border border-border rounded px-2.5 py-1 text-xs font-mono text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                        Score:
                      </label>
                      <input
                        type="text"
                        value={selectedMatch.team2.score || ''}
                        onChange={(e) =>
                          handleUpdateSelectedMatch({
                            team2: { ...selectedMatch.team2, score: e.target.value },
                          })
                        }
                        placeholder="e.g. 1"
                        className="w-full bg-background border border-border rounded px-2.5 py-1 text-xs font-mono font-bold text-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSetWinner(2)}
                    className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <Crown className="size-3.5 text-amber-300" /> Award Win to Team 2
                  </button>
                </div>
              </div>

              {/* Status and Match Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border text-xs">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Fixture Status:
                  </label>
                  <select
                    value={selectedMatch.status}
                    onChange={(e) =>
                      handleUpdateSelectedMatch({
                        status: e.target.value as 'upcoming' | 'live' | 'completed',
                      })
                    }
                    className="w-full bg-background border border-border rounded p-2 text-foreground font-semibold"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed / Final</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Schedule / Broadcast Time:
                  </label>
                  <input
                    type="text"
                    value={selectedMatch.scheduleTime || ''}
                    onChange={(e) => handleUpdateSelectedMatch({ scheduleTime: e.target.value })}
                    placeholder="e.g. Oct 4, 18:00 IST"
                    className="w-full bg-background border border-border rounded p-2 text-foreground font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tournament Rulebook Customizer Studio */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  Official Rulebook & Tournament Regulations Studio
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customize the rules broadcasted on the audience portal. Click preset tags to append standard esports regulations.
                </p>
              </div>

              <button
                onClick={handleSaveRulebook}
                disabled={isSavingRules}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 text-xs font-bold shadow transition disabled:opacity-50"
              >
                <Save className="size-3.5" />
                {isSavingRules ? 'Saving…' : 'Save & Publish Rulebook'}
              </button>
            </div>

            {/* Quick Rule Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Inject Rule:</span>
              {[
                'Strictly No Emulators or iPad View Allowed',
                'Captain Discord Voice Check Mandatory 15m Prior',
                'Screenshot of Match End Scoreboard Required',
                'Room ID & Password Distributed via In-App Room Tab',
                'Toxic Behaviour or Chat Abuse Leads to Disqualification',
                'Max 100ms Ping Limit for Competitive Integrity',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleInjectRulePreset(preset)}
                  className="text-[11px] px-2 py-0.5 rounded border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  + {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={6}
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              placeholder="Enter official tournament rules, format specifications, tiebreaker procedures, and prize distribution policies..."
              className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono leading-relaxed text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* TAB 1: Payment Verification Queue */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground">
              Manual UPI Verifications ({payments.length} Submissions)
            </h3>
            <span className="text-xs text-muted-foreground">
              Inspect UTR numbers and approve valid transactions.
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="p-12 text-center border border-border rounded-xl bg-card">
              <ShieldCheck className="size-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-xs text-muted-foreground">
                No payments submitted yet for this tournament.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-border bg-card hover:border-border-strong transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm text-foreground">
                        {p.teamName}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          p.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : p.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Captain: <strong className="text-foreground">{p.captainName}</strong> • Amount:{' '}
                      <strong className="text-primary">{p.amount}</strong>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                        UTR: {p.utr}
                      </span>
                      {p.screenshotUrl && (
                        <a
                          href={p.screenshotUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Eye className="size-3" /> View Screenshot
                        </a>
                      )}
                    </div>
                  </div>

                  {p.status === 'pending' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleVerifyPayment(p.id, 'approved')}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1 text-xs font-bold bg-emerald-500 text-black px-3 py-1.5 rounded hover:bg-emerald-400 transition"
                      >
                        <CheckCircle2 className="size-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleVerifyPayment(p.id, 'rejected')}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1 text-xs font-bold border border-red-500/40 text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded transition"
                      >
                        <XCircle className="size-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Match Room Credentials Broadcast */}
      {activeTab === 'room' && (
        <div className="max-w-xl mx-auto p-6 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <KeyRound className="size-5 text-primary" />
            <div>
              <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground">
                Match Room Credentials Broadcast
              </h3>
              <p className="text-xs text-muted-foreground">
                Enter Room ID & Password. Only verified captains will see this on the tournament page.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveRoom} className="space-y-4">
            {/* Publication Toggle */}
            <div className="p-3 rounded-lg border border-border bg-background/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {roomPublished ? (
                    <Unlock className="size-4 text-emerald-400" />
                  ) : (
                    <Lock className="size-4 text-amber-400" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Public Dispatch State
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    roomPublished
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {roomPublished ? 'LIVE & PUBLISHED' : 'HIDDEN DRAFT'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {roomPublished
                  ? 'Credentials are live! Verified captains can claim the room code and password directly from the tournament portal.'
                  : 'Credentials are in draft mode and invisible to players. Check the toggle below when you are ready to open the custom room.'}
              </p>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roomPublished}
                  onChange={(e) => setRoomPublished(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary size-4"
                />
                <span className="text-xs font-semibold text-foreground">
                  Publish credentials to verified tournament players
                </span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Room ID / Custom Code *
              </label>
              <input
                type="text"
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="e.g. ROOM-882910 or FF-CUSTOM-01"
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Room Password *
              </label>
              <input
                type="text"
                required
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                placeholder="e.g. clashers99 or pass#2026"
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingRoom}
              className="w-full py-2.5 rounded bg-primary text-background font-bold text-xs hover:bg-primary/90 transition shadow flex items-center justify-center gap-1.5"
            >
              <Save className="size-4" />
              {isSavingRoom
                ? 'Saving Credentials…'
                : roomPublished
                ? 'Save & Broadcast Live to Players'
                : 'Save as Hidden Draft'}
            </button>
          </form>
        </div>
      )}

      {/* TAB: RDK 10% Platform Settlement & Official Closure */}
      {activeTab === 'settlement' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-6 rounded-xl border border-border bg-gradient-to-r from-card to-primary/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-emerald-400" />
                <h3 className="font-heading font-black text-base uppercase tracking-wider text-foreground">
                  RDK 10% Platform Settlement & Official Closure
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Powered by RDK Technologies platform engine. Verified calculations, escrow settlement, and historical tournament archiving.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">Settlement:</span>
              <span
                className={`text-xs font-black uppercase px-2.5 py-1 rounded border ${
                  tournament.settlementStatus === 'VERIFIED'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : tournament.settlementStatus === 'UNDER_REVIEW'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    : isPaid
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {tournament.settlementStatus || 'PENDING'}
              </span>
            </div>
          </div>

          {/* 4-Stat Financial Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Approved Paid Entries
              </span>
              <div className="text-xl font-heading font-black text-foreground">
                {settlementInfo?.finances?.approvedEntries ?? approvedPayments.length}{' '}
                <span className="text-xs font-normal text-muted-foreground">Squads</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Fee: ₹{entryFeeNumber} per entry
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Gross Entry Collected
              </span>
              <div className="text-xl font-heading font-black text-foreground">
                ₹{totalGrossCollected.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                100% of verified entry payments
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                RDK 10% Platform Fee Due
              </span>
              <div className="text-xl font-heading font-black text-emerald-400">
                ₹{totalRdkFeeDue.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-emerald-500/80 mt-1">
                Strict 10% calculated strictly from approved entries
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Partner Net Earnings (90%)
              </span>
              <div className="text-xl font-heading font-black text-primary">
                ₹{totalPartnerNet.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Retained by Official Partner
              </p>
            </div>
          </div>

          {/* Conditional Guidance Banner */}
          {!isPaid ? (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3">
              <CheckCircle2 className="size-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Free Entry Tournament — Platform Fee Waived
                </h4>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  This is an official Free Entry Tournament. No RDK platform fee settlement is required. You may proceed to conclude the matches and officially close the tournament whenever ready.
                </p>
              </div>
            </div>
          ) : totalGrossCollected === 0 ? (
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 flex items-start gap-3">
              <Clock className="size-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Paid Tournament — 0 Paid Entries Collected Yet
                </h4>
                <p className="text-xs text-cyan-200/80 mt-0.5">
                  Entry fee is <strong>₹{entryFeeNumber} per entry</strong>. RDK 10% platform fee is calculated dynamically on <strong>actual money collected from approved teams</strong> ({settlementInfo?.finances?.approvedEntries ?? approvedPayments.length}/{tournament.maxTeams} approved = ₹0 collected). As teams register and payments are approved, your gross revenue and 10% platform fee will update in real time.
                </p>
              </div>
            </div>
          ) : tournament.settlementStatus === 'VERIFIED' ? (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3">
              <CheckCircle2 className="size-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Platform Settlement Verified
                </h4>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  RDK Technologies Super Admin has verified the 10% platform fee payment. The Closure Gatekeeper has unlocked and this tournament can be officially closed.
                </p>
                {settlementInfo?.settlement?.verifiedAt && (
                  <p className="text-[10px] font-mono text-emerald-400 mt-1">
                    Verified on: {new Date(settlementInfo.settlement.verifiedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ) : tournament.settlementStatus === 'UNDER_REVIEW' ? (
            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-start gap-3">
              <Clock className="size-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                  Settlement Proof Under Review
                </h4>
                <p className="text-xs text-blue-200/80 mt-0.5">
                  Your settlement submission (UTR: <span className="font-mono font-bold text-blue-300">{settlementInfo?.settlement?.utr || 'Submitted'}</span>) is currently being verified by RDK Super Admin. Once approved, the closure button will unlock immediately.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Closure Gatekeeper Active — 10% Platform Settlement Required
                </h4>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  Per RDK Technologies platform terms, Official Partners remit 10% of gross entry fees collected (₹{totalRdkFeeDue.toLocaleString('en-IN')}). Tournaments cannot transition to closed until this settlement is verified.
                </p>
              </div>
            </div>
          )}

          {/* RDK Platform Escrow & Payment Submission Form (Only for paid events not yet verified) */}
          {isPaid && tournament.settlementStatus !== 'VERIFIED' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Official RDK Payment Coordinates */}
              <div className="p-5 rounded-xl border border-border bg-card space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Landmark className="size-4 text-primary" />
                  <h4 className="font-heading font-black text-xs uppercase tracking-wider text-foreground">
                    RDK Official Settlement Account
                  </h4>
                </div>

                <div className="flex items-center gap-4">
                  <div className="size-28 bg-white p-1 rounded-lg border border-border shrink-0 flex items-center justify-center">
                    <img
                      src={
                        settlementInfo?.platformAccount?.qrCodeUrl ||
                        'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=rdktechnologies@upi&pn=RDK%20Technologies&cu=INR'
                      }
                      alt="RDK UPI QR Code"
                      className="size-full object-contain"
                    />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Pay via Any UPI App (GPay / PhonePe / Paytm)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                        {settlementInfo?.platformAccount?.upiId || 'rdktechnologies@upi'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            settlementInfo?.platformAccount?.upiId || 'rdktechnologies@upi'
                          )
                          setSuccessMsg('RDK UPI ID copied to clipboard!')
                          setTimeout(() => setSuccessMsg(''), 2500)
                        }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Copy UPI ID"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Beneficiary: <strong>{settlementInfo?.platformAccount?.accountName || 'RDK Technologies Platform Fee Escrow'}</strong>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Bank: <strong>{settlementInfo?.platformAccount?.bankName || 'HDFC Bank'}</strong> • IFSC: <strong className="font-mono">{settlementInfo?.platformAccount?.ifsc || 'HDFC0000123'}</strong>
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground leading-relaxed">
                  Transfer the exact 10% fee amount: <strong className="text-primary font-bold">₹{totalRdkFeeDue.toLocaleString('en-IN')}</strong>. After completing the payment, note the Bank Reference / UTR Number and submit below.
                </div>
              </div>

              {/* Right Column: Submit Settlement Proof Form */}
              <div className="p-5 rounded-xl border border-border bg-card space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Receipt className="size-4 text-emerald-400" />
                  <h4 className="font-heading font-black text-xs uppercase tracking-wider text-foreground">
                    Submit Settlement Proof
                  </h4>
                </div>

                <form onSubmit={handleSubmitSettlement} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      12-Digit Bank UTR / Ref Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 427819920182"
                      value={settlementForm.utr}
                      onChange={(e) =>
                        setSettlementForm({ ...settlementForm, utr: e.target.value })
                      }
                      className="w-full bg-background border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Payment Screenshot URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={settlementForm.screenshotUrl}
                      onChange={(e) =>
                        setSettlementForm({ ...settlementForm, screenshotUrl: e.target.value })
                      }
                      className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Notes / Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Final match concluded, 10% settlement paid"
                      value={settlementForm.notes}
                      onChange={(e) =>
                        setSettlementForm({ ...settlementForm, notes: e.target.value })
                      }
                      className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingSettlement || !settlementForm.utr}
                    className="w-full py-2.5 rounded bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition shadow disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    <Receipt className="size-4" />
                    {isSubmittingSettlement
                      ? 'Submitting Proof…'
                      : 'Submit Settlement to RDK Technologies'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Official Tournament Closure Card */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Trophy className="size-5 text-primary" />
              <div>
                <h4 className="font-heading font-black text-sm uppercase tracking-wider text-foreground">
                  Official Tournament Closure & Historical Archive
                </h4>
                <p className="text-xs text-muted-foreground">
                  Closure permanently marks the tournament as completed and locks brackets and rosters into the platform audit ledger.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Current Status: <strong className="text-foreground uppercase">{tourneyStatus}</strong>
                </p>
                <p>
                  Closure Gatekeeper:{' '}
                  {canClose ? (
                    <strong className="text-emerald-400">CLEARED (Ready for Closure)</strong>
                  ) : (
                    <strong className="text-amber-400">
                      LOCKED (10% Fee Settlement must be VERIFIED first)
                    </strong>
                  )}
                </p>
              </div>

              {tourneyStatus === 'completed' || tournament.isClosed ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border text-xs font-bold text-foreground">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span>Tournament Officially Closed & Archived</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOfficialClosure}
                  disabled={isClosingTournament || !canClose}
                  className="px-5 py-2.5 rounded-lg bg-primary text-background font-bold text-xs hover:bg-primary/90 transition shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Trophy className="size-4" />
                  {isClosingTournament
                    ? 'Closing Tournament…'
                    : 'Officially Conclude & Archive Tournament'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Enrolled Teams Management */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          {/* Header & Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground">
                  Enrolled Roster ({teams.length}/{tournament.maxTeams} Teams)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verified squads eligible for room ID broadcast, match tracking, and ambassador coordination.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Import from Google Sheet Button */}
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition shadow-sm"
              >
                <FileSpreadsheet className="size-3.5" />
                <span>Import from Google Sheet</span>
              </button>

              {/* Add Squad Manually Button */}
              <button
                type="button"
                onClick={handleOpenAddTeam}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-background text-xs font-bold hover:bg-primary/90 transition shadow-sm"
              >
                <Plus className="size-3.5" />
                <span>Add Squad</span>
              </button>

              {/* Batch Allot Staff Button */}
              {ambassadors.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsBatchAllotModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition shadow-sm"
                >
                  <ShieldCheck className="size-3.5" />
                  <span>Batch Allot Staff</span>
                </button>
              )}

              {/* Export to CSV Button */}
              <a
                href={`/api/tournaments/${tournament.id}/export`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/60 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
              >
                <Download className="size-3.5 text-muted-foreground" />
                <span>Export CSV</span>
              </a>

              {/* Ambassador Filter */}
              {ambassadors.length > 0 && (
                <select
                  value={ambassadorFilter}
                  onChange={(e) => setAmbassadorFilter(e.target.value)}
                  className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-medium"
                >
                  <option value="all">All Staff ({teams.length})</option>
                  <option value="unassigned">Unassigned ({teams.filter((t) => !t.ambassadorId).length})</option>
                  {ambassadors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({teams.filter((t) => t.ambassadorId === a.id).length})
                    </option>
                  ))}
                </select>
              )}

              {/* Group Filter */}
              {teams.some((t) => t.group) && (
                <select
                  value={teamGroupFilter}
                  onChange={(e) => setTeamGroupFilter(e.target.value as 'all' | 'GROUP A' | 'GROUP B' | 'GROUP C')}
                  className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-medium"
                >
                  <option value="all">All Groups ({teams.length})</option>
                  <option value="GROUP A">GROUP A ({teams.filter((t) => t.group === 'GROUP A').length})</option>
                  <option value="GROUP B">GROUP B ({teams.filter((t) => t.group === 'GROUP B').length})</option>
                  <option value="GROUP C">GROUP C ({teams.filter((t) => t.group === 'GROUP C').length})</option>
                </select>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search team or captain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-muted border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary w-44"
                />
              </div>
            </div>
          </div>

          {/* Teams Grid / Empty State */}
          {teams.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/60 space-y-4">
              <div className="size-14 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                <FileSpreadsheet className="size-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-heading font-black text-base uppercase text-foreground">
                  No Registered Squads in Roster Yet
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Import all registered players directly from your Google Form responses spreadsheet (e.g. TNBBL Season 2 responses), or add squads manually to begin match allotment.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-heading font-black text-xs hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
                >
                  <FileSpreadsheet className="size-4" />
                  <span>Import from Google Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddTeam}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-muted transition"
                >
                  <Plus className="size-4" />
                  <span>Add Squad Manually</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams
                .filter((t) => {
                  const matchesSearch =
                    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.captainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.captainIgn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.ambassadorName && t.ambassadorName.toLowerCase().includes(searchQuery.toLowerCase()))

                  if (!matchesSearch) return false

                  if (teamGroupFilter !== 'all' && t.group !== teamGroupFilter) return false

                  if (ambassadorFilter === 'all') return true
                  if (ambassadorFilter === 'unassigned') return !t.ambassadorId
                  return t.ambassadorId === ambassadorFilter
                })
                .map((t, i) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between hover:border-primary/40 transition shadow-sm"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="size-6 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-foreground">
                            #{i + 1}
                          </span>
                          <span className="font-heading font-black text-sm text-foreground truncate max-w-[140px]">
                            {t.name}
                          </span>
                          {t.group && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                              {t.group}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              t.status === 'verified'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {t.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditTeam(t)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Edit Squad"
                          >
                            <Edit3 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeam(t.id, t.name)}
                            className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                            title="Remove Squad"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Captain & Contact */}
                      <div className="text-[11px] text-muted-foreground space-y-1 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                        <p>
                          Captain: <strong className="text-foreground">{t.captainName}</strong> ({t.captainIgn})
                        </p>
                        {t.captainPhone && (
                          <p className="flex items-center gap-1 text-[11px]">
                            <Phone className="size-3 text-muted-foreground" />
                            <a
                              href={`https://wa.me/${t.captainPhone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-foreground hover:text-primary underline font-mono"
                            >
                              {t.captainPhone}
                            </a>
                          </p>
                        )}
                        {t.role && (
                          <p className="text-[10px]">
                            Role: <span className="text-primary font-semibold">{t.role}</span>
                          </p>
                        )}
                      </div>

                      {/* Squad Players */}
                      <div className="pt-2">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">
                          Squad Players ({t.players?.length || 1})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {t.players?.map((p, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-muted/80 text-foreground px-2 py-0.5 rounded font-mono border border-border/60"
                            >
                              {p.ign}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Ambassador Allotment Selector on each card */}
                    <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Shield className="size-3.5 text-purple-400 shrink-0" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Staff:
                        </span>
                      </div>
                      <select
                        value={t.ambassadorId || ''}
                        onChange={(e) => handleQuickAssignAmbassador(t.id, e.target.value)}
                        className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors focus:outline-none focus:border-primary max-w-[170px] truncate ${
                          t.ambassadorId
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        <option value="">Unassigned</option>
                        {ambassadors.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.assignedTeamRange || 'Franchise'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* MODAL 1: IMPORT FROM GOOGLE SHEET */}
          {isImportModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="size-5 text-emerald-400" />
                    <div>
                      <h3 className="font-heading font-black text-base uppercase text-foreground">
                        Import Roster from Google Sheet
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Directly sync player responses from Google Forms / Google Sheets
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <form onSubmit={handleImportSheet} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Google Sheet URL *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={importSheetUrl}
                      onChange={(e) => setImportSheetUrl(e.target.value)}
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Ensure the sheet is public (<strong>"Anyone with the link can view"</strong>).
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Import Format *
                      </label>
                      <select
                        value={importMode}
                        onChange={(e) => setImportMode(e.target.value as any)}
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-bold"
                      >
                        <option value="individual">Individual Slots (1 Player per Slot / 216 Slots)</option>
                        <option value="squads">4-Player Squads (Group into Squads of 4)</option>
                      </select>
                    </div>

                    {importMode === 'squads' ? (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Players per Squad
                        </label>
                        <input
                          type="number"
                          min={2}
                          max={6}
                          value={playersPerTeam}
                          onChange={(e) => setPlayersPerTeam(Number(e.target.value) || 4)}
                          className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Team Name Prefix
                        </label>
                        <input
                          type="text"
                          value={teamNamePrefix}
                          onChange={(e) => setTeamNamePrefix(e.target.value)}
                          placeholder="e.g. Team or Slot"
                          className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Allot to Ambassador (Optional)
                    </label>
                    <select
                      value={importAmbassadorId}
                      onChange={(e) => setImportAmbassadorId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-medium"
                    >
                      <option value="">Leave Unassigned (Allot manually later)</option>
                      {ambassadors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.assignedTeamRange || 'Franchise'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] text-emerald-200/90 leading-relaxed">
                    ✓ Columns detected automatically: <strong>Name, IGN, Phone, Email, Role, Experience, Achievements, and Gameplay clips</strong>.
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(false)}
                      className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isImporting || !importSheetUrl}
                      className="rounded-lg bg-emerald-500 text-black px-5 py-2 text-xs font-heading font-black hover:bg-emerald-400 transition shadow disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="size-4" />
                      {isImporting ? 'Importing Sheet…' : 'Import Roster from Google Sheet'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL 2: ADD / EDIT SQUAD */}
          {isAddTeamModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <h3 className="font-heading font-black text-base uppercase text-foreground">
                    {editingTeam ? 'Edit Squad Roster' : 'Add Squad Manually'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddTeamModalOpen(false)
                      setEditingTeam(null)
                    }}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveTeam} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Team / Clan Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tamil Titans"
                      value={teamForm.name}
                      onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Captain Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Prabhanjan"
                        value={teamForm.captainName}
                        onChange={(e) => setTeamForm({ ...teamForm, captainName: e.target.value })}
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Captain In-Game Name (IGN) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Pr4bhaflick"
                        value={teamForm.captainIgn}
                        onChange={(e) => setTeamForm({ ...teamForm, captainIgn: e.target.value })}
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Captain Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="6369159402"
                        value={teamForm.captainPhone}
                        onChange={(e) => setTeamForm({ ...teamForm, captainPhone: e.target.value })}
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Captain Email
                      </label>
                      <input
                        type="email"
                        placeholder="player@gmail.com"
                        value={teamForm.captainEmail}
                        onChange={(e) => setTeamForm({ ...teamForm, captainEmail: e.target.value })}
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Squad Player IGNs (One per line)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Player1_IGN&#10;Player2_IGN&#10;Player3_IGN&#10;Player4_IGN"
                      value={teamForm.playersText}
                      onChange={(e) => setTeamForm({ ...teamForm, playersText: e.target.value })}
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Allot to Ambassador
                    </label>
                    <select
                      value={teamForm.ambassadorId}
                      onChange={(e) => setTeamForm({ ...teamForm, ambassadorId: e.target.value })}
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-medium"
                    >
                      <option value="">Unassigned</option>
                      {ambassadors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.assignedTeamRange || 'Franchise'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddTeamModalOpen(false)
                        setEditingTeam(null)
                      }}
                      className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingTeam}
                      className="rounded-lg bg-primary text-background px-5 py-2 text-xs font-heading font-black hover:bg-primary/90 transition shadow disabled:opacity-50"
                    >
                      {isSavingTeam ? 'Saving…' : editingTeam ? 'Update Squad' : 'Save Squad'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL 3: BATCH ALLOT TO AMBASSADOR */}
          {isBatchAllotModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-purple-400" />
                    <div>
                      <h3 className="font-heading font-black text-base uppercase text-foreground">
                        Batch Allot Squads to Staff
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Assign a sequential range of squads to an ambassador at once
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBatchAllotModalOpen(false)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <form onSubmit={handleBatchAllot} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Select Franchise Ambassador *
                    </label>
                    <select
                      required
                      value={batchAmbassadorId}
                      onChange={(e) => setBatchAmbassadorId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-bold"
                    >
                      <option value="">-- Choose Ambassador --</option>
                      {ambassadors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.assignedTeamRange || 'Franchise'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Squad Number From
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={teams.length || 100}
                        value={batchRangeFrom}
                        onChange={(e) => setBatchRangeFrom(Number(e.target.value) || 1)}
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Squad Number To
                      </label>
                      <input
                        type="number"
                        min={batchRangeFrom}
                        max={teams.length || 100}
                        value={batchRangeTo}
                        onChange={(e) => setBatchRangeTo(Number(e.target.value) || batchRangeFrom)}
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 text-[11px] text-purple-200/90">
                    This will assign all squads from <strong>#{batchRangeFrom}</strong> to <strong>#{batchRangeTo}</strong> to the selected ambassador.
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsBatchAllotModalOpen(false)}
                      className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isBatchAllotting || !batchAmbassadorId}
                      className="rounded-lg bg-purple-600 text-white px-5 py-2 text-xs font-heading font-black hover:bg-purple-500 transition shadow disabled:opacity-50"
                    >
                      {isBatchAllotting ? 'Allotting…' : 'Confirm Batch Allotment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: LIVE AUCTION ARENA (ONLY FOR AUCTION TOURNAMENTS) */}
      {activeTab === 'auction' && isAuction && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-background to-card shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                  <Gavel className="size-4 animate-bounce" />
                  <span>IPL-STYLE LIVE PLAYER AUCTION DESK</span>
                </div>
                <h3 className="mt-1 font-heading text-xl font-black uppercase text-foreground">
                  {tournament.name} • Live Auction Stage
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Franchise owners bid on registered players using an allocated virtual token purse. Conduct bidding, hammer sync, and squad allocation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/creator/auctions?tournamentId=${tournament.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-heading font-black text-black shadow-lg shadow-amber-500/30 hover:scale-[1.02] transition"
                >
                  <Gavel className="size-4" />
                  Launch Full Screen Auction Stage
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-border">
              <div className="rounded-lg bg-card/60 border border-border p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Format</span>
                <p className="text-sm font-black text-amber-400 mt-1">IPL Player Auction</p>
              </div>
              <div className="rounded-lg bg-card/60 border border-border p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Team Purse</span>
                <p className="text-sm font-black text-foreground mt-1">100,000 Pts / Team</p>
              </div>
              <div className="rounded-lg bg-card/60 border border-border p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Franchise Teams</span>
                <p className="text-sm font-black text-foreground mt-1">{teams.length} Registered</p>
              </div>
              <div className="rounded-lg bg-card/60 border border-border p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Franchise Ambassadors</span>
                <p className="text-sm font-black text-purple-400 mt-1">{ambassadors.length} Active</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <ShieldAlert className="size-4 text-purple-400" />
                Franchise Owner & Ambassador Access
              </h4>
              <p className="text-xs text-muted-foreground">
                Franchise ambassadors have access to their assigned team's bidding screen during the live auction. Only authorized accounts created under this tournament can place bids.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('ambassadors')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                Manage Franchise Ambassadors ({ambassadors.length}) &rarr;
              </button>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Users className="size-4 text-blue-400" />
                Player Draft Pool ({teams.reduce((acc, t) => acc + (t.players?.length || 0), 0)} Players)
              </h4>
              <p className="text-xs text-muted-foreground">
                Registered solo candidates who entered the draft pool for franchise selection.
              </p>
              <Link
                to={`/creator/auctions?tournamentId=${tournament.id}`}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                Inspect Player Cards & Google Sheets Import &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TAB: FRANCHISE AMBASSADORS (ONLY FOR AUCTION TOURNAMENTS) */}
      {activeTab === 'ambassadors' && isAuction && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                <Users className="size-4 text-purple-400" />
                Franchise Ambassadors & Bidders for {tournament.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Temporary ambassador accounts can ONLY access this tournament's auction & squad desk, and will be deleted after tournament completion.
              </p>
            </div>

            <button
              onClick={() => setIsAmbassadorModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-background shadow hover:opacity-90 transition"
            >
              <Plus className="size-4" />
              Provision Ambassador
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-3 font-semibold">Ambassador Name</th>
                    <th className="p-3 font-semibold">Login Email</th>
                    <th className="p-3 font-semibold">Assigned Team / Franchise</th>
                    <th className="p-3 font-semibold">Contact Phone</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ambassadors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No temporary ambassadors created for this tournament yet. Click "Provision Ambassador" to add franchise bidders.
                      </td>
                    </tr>
                  ) : (
                    ambassadors.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/30 transition">
                        <td className="p-3 font-medium text-foreground flex items-center gap-2">
                          <div className="size-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold">
                            {a.name[0]}
                          </div>
                          {a.name}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Mail className="size-3 text-muted-foreground" />
                            {a.email}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-primary font-semibold text-[11px]">
                              {a.assignedTeamRange}
                            </span>
                            {teams.filter((t) => t.ambassadorId === a.id).length > 0 && (
                              <span className="text-[10px] text-emerald-400 font-bold">
                                {teams.filter((t) => t.ambassadorId === a.id).length} squads allotted
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{a.phone || '—'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteAmbassador(a.id, a.name)}
                            className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Revoke Ambassador"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Provision Ambassador Modal */}
          {isAmbassadorModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div>
                    <h3 className="font-bold text-base text-foreground">Provision Franchise Ambassador</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Restricted strictly to {tournament.name}</p>
                  </div>
                  <button onClick={() => setIsAmbassadorModalOpen(false)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateAmbassador} className="space-y-3">
                  <label className="block text-xs font-medium text-foreground">
                    Ambassador / Bidder Full Name *
                    <input
                      type="text"
                      required
                      placeholder="e.g. Praveen Kumar"
                      className="mt-1 w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                      value={ambassadorForm.name}
                      onChange={(e) => setAmbassadorForm({ ...ambassadorForm, name: e.target.value })}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-medium text-foreground">
                      Login Email Address *
                      <input
                        type="email"
                        required
                        placeholder="ambassador@org.com"
                        className="mt-1 w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                        value={ambassadorForm.email}
                        onChange={(e) => setAmbassadorForm({ ...ambassadorForm, email: e.target.value })}
                      />
                    </label>

                    <label className="block text-xs font-medium text-foreground">
                      Temporary Password *
                      <input
                        type="text"
                        required
                        className="mt-1 w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                        value={ambassadorForm.password}
                        onChange={(e) => setAmbassadorForm({ ...ambassadorForm, password: e.target.value })}
                      />
                    </label>
                  </div>

                  <label className="block text-xs font-medium text-foreground">
                    Assigned Tournament (Locked)
                    <input
                      type="text"
                      disabled
                      value={tournament.name}
                      className="mt-1 w-full rounded border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground cursor-not-allowed font-semibold"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-medium text-foreground">
                      Team / Franchise Assigned *
                      <input
                        type="text"
                        required
                        placeholder="e.g. Tamil Titans or Team 1"
                        className="mt-1 w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                        value={ambassadorForm.assignedTeamRange}
                        onChange={(e) => setAmbassadorForm({ ...ambassadorForm, assignedTeamRange: e.target.value })}
                      />
                    </label>

                    <label className="block text-xs font-medium text-foreground">
                      Phone (WhatsApp)
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        className="mt-1 w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                        value={ambassadorForm.phone}
                        onChange={(e) => setAmbassadorForm({ ...ambassadorForm, phone: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="pt-3 flex justify-end gap-2 border-t border-border mt-4">
                    <button
                      type="button"
                      onClick={() => setIsAmbassadorModalOpen(false)}
                      className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingAmbassador}
                      className="rounded bg-primary px-4 py-1.5 text-xs font-bold text-background hover:opacity-90 disabled:opacity-60"
                    >
                      {isSubmittingAmbassador ? 'Creating…' : 'Issue Ambassador Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
