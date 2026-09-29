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
  upiId?: string
  upiName?: string
  rules?: string
  streamUrl?: string
  streamTitle?: string
  streamStatus?: 'offline' | 'starting_soon' | 'live'
  scheduledMatchInfo?: string
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

export default function TournamentManagePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role === 'ambassador') {
      navigate('/ambassador/dashboard', { replace: true })
    }
  }, [user, navigate])

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [activeTab, setActiveTab] = useState<'payments' | 'live' | 'roadmap' | 'room' | 'teams'>('payments')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Live Stream Broadcast Studio State
  const [streamUrl, setStreamUrl] = useState('')
  const [streamTitle, setStreamTitle] = useState('')
  const [streamStatus, setStreamStatus] = useState<'offline' | 'starting_soon' | 'live'>('offline')
  const [scheduledMatchInfo, setScheduledMatchInfo] = useState('')
  const [isSavingStream, setIsSavingStream] = useState(false)

  // Room Credentials State
  const [roomId, setRoomId] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [isSavingRoom, setIsSavingRoom] = useState(false)

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

  useEffect(() => {
    loadData()
  }, [id])

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
      setTournament(tData.tournament)
      setTeams(tData.teams || [])
      setRoomId(tData.tournament.roomId || '')
      setRoomPassword(tData.tournament.roomPassword || '')
      setTourneyStatus(tData.tournament.status)
      setRulesText(tData.tournament.rules || '')
      setStreamUrl(tData.tournament.streamUrl || '')
      setStreamTitle(tData.tournament.streamTitle || '')
      setStreamStatus(tData.tournament.streamStatus || 'offline')
      setScheduledMatchInfo(tData.tournament.scheduledMatchInfo || '')

      if (pRes.ok) {
        const pData = await pRes.json()
        setPayments(pData)
      }

      if (rRes.ok) {
        const rData = await rRes.json()
        setRoadmap(rData.roadmap)
      }
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

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingRoom(true)
    setSuccessMsg('')
    try {
      const res = await fetch(`/api/tournaments/${id}/room`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, roomPassword }),
      })
      if (!res.ok) throw new Error('Failed to update room credentials')
      setSuccessMsg('Match Room ID & Password broadcasted successfully!')
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
      const res = await fetch(`/api/tournaments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setTourneyStatus(newStatus)
        setSuccessMsg(`Tournament status changed to ${newStatus}`)
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    } catch {
      setError('Failed to update status')
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

  const pendingPayments = payments.filter((p) => p.status === 'pending')

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
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Current Status:
          </span>
          <StatusBadge status={tourneyStatus} />
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto">
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
              {isSavingRoom ? 'Broadcasting Credentials…' : 'Broadcast to Verified Captains'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Enrolled Teams Management */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground">
                Enrolled Roster ({teams.length}/{tournament.maxTeams} Teams)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verified squads eligible for room ID broadcast and bracket placement.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/tournaments/${tournament.id}/export`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
              >
                <FileSpreadsheet className="size-3.5 text-emerald-400" />
                <span>Export to Google Sheets (CSV)</span>
              </a>
              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search team or captain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-muted border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary w-48"
                />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teams
              .filter(
                (t) =>
                  t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.captainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.captainIgn.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((t, i) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-border bg-card space-y-2 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="size-6 rounded bg-muted flex items-center justify-center text-[10px] font-bold">
                        #{i + 1}
                      </span>
                      <span className="font-heading font-black text-sm text-foreground">{t.name}</span>
                    </div>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        t.status === 'verified'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-muted-foreground space-y-1">
                    <p>
                      Captain: <strong className="text-foreground">{t.captainName}</strong> ({t.captainIgn})
                    </p>
                    <p>
                      Phone: <strong className="text-foreground">{t.captainPhone}</strong>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">
                      Squad Players
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {t.players?.map((p, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-muted/60 text-foreground px-2 py-0.5 rounded font-mono"
                        >
                          {p.ign}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
