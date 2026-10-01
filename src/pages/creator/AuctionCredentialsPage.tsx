import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Gavel,
  ShieldAlert,
  Sparkles,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
  Coins,
  FileSpreadsheet,
  Download,
  Upload,
  Play,
  Video,
  ExternalLink,
  RefreshCw,
  Trophy,
  ArrowRight,
  Eye,
  Check,
  X,
  Target,
  Zap,
  Crown,
  Shield,
  Crosshair,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'

const getEmbedVideoUrl = (url?: string) => {
  if (!url) return null
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/)
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`
    }
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    if (url.includes('embed')) return url
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0]
      return `https://www.youtube.com/embed/${id}`
    }
    try {
      const v = new URL(url).searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
    } catch {}
  }
  return null
}

interface Bidder {
  id: string
  auctionId: string
  teamName: string
  loginCode: string
  passkey: string
  allocatedPurse: number
  status: 'active' | 'revoked'
  createdAt: string
  group?: string
}

interface AuctionPlayer {
  id: string
  auctionId: string
  tournamentId: string
  name: string
  ign: string
  gameUid: string
  role: 'Rusher' | 'Sniper' | 'IGL' | 'Support' | 'Assaulter' | 'Flanker'
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

interface MiniTournament {
  id: string
  name: string
  game: string
  format: string
}

export default function AuctionCredentialsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tournaments, setTournaments] = useState<MiniTournament[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(
    searchParams.get('tournamentId') || ''
  )
  const [activeTab, setActiveTab] = useState<'stage' | 'sheets' | 'credentials'>('stage')

  useEffect(() => {
    fetch('/api/tournaments')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setTournaments(data)
          const auctionList = data.filter(
            (t: MiniTournament) =>
              t.format === 'Auction Tournament' || t.format?.toLowerCase().includes('auction')
          )
          if (!selectedTournamentId && auctionList.length > 0) {
            setSelectedTournamentId(auctionList[0].id)
          }
        }
      })
      .catch(() => {})
  }, [])

  const auctionTournaments = tournaments.filter(
    (t) => t.format === 'Auction Tournament' || t.format?.toLowerCase().includes('auction')
  )
  const activeAuctionTournament =
    auctionTournaments.find((t) => t.id === selectedTournamentId) || auctionTournaments[0]
  const auctionId = activeAuctionTournament?.id || selectedTournamentId || 't3'

  // Bidder accounts state
  const [bidders, setBidders] = useState<Bidder[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [teamsText, setTeamsText] = useState(
    'Aura XtremeZ, Tamil Titans, Phoenix Esports, Shadow Squad, Night Raiders, Velocity Force, Dragon Slayers, Clashers Elite'
  )
  const [purse, setPurse] = useState(150000)
  const [bidderGroupFilter, setBidderGroupFilter] = useState<'ALL' | 'GROUP A' | 'GROUP B' | 'GROUP C'>('ALL')
  const [isSeedingTnbbl, setIsSeedingTnbbl] = useState(false)

  // Draft player pool & live bidding state
  const [players, setPlayers] = useState<AuctionPlayer[]>([])
  const [activePlayerId, setActivePlayerId] = useState<string>('')
  const [currentBid, setCurrentBid] = useState<number>(0)
  const [selectedBidderTeam, setSelectedBidderTeam] = useState<string>('')
  const [bidHistory, setBidHistory] = useState<{ team: string; amount: number; time: string }[]>([])
  const [previewClipUrl, setPreviewClipUrl] = useState<string | null>(null)
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(null)

  // Reversal State (Audit-Logged Purse Restoration)
  const [reversalTarget, setReversalTarget] = useState<{
    id: string
    ign: string
    soldToTeam: string
    soldPrice: number
  } | null>(null)
  const [reversalReason, setReversalReason] = useState('')
  const [isReversing, setIsReversing] = useState(false)

  // Google Sheets import state
  const [csvInput, setCsvInput] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const handleSeedTnbbl = async () => {
    setIsSeedingTnbbl(true)
    setErr('')
    setMsg('')
    try {
      const res = await fetch(`/api/tournaments/${auctionId}/seed-tnbbl`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to seed TNBBL data')
      setMsg(data.message || 'TNBBL Season 2 seeded successfully with 36 franchise teams and ₹1,50,000 purse!')
      await Promise.all([loadCredentials(), loadPlayers()])
    } catch (e: unknown) {
      if (e instanceof Error) setErr(e.message)
      else setErr('Failed to seed TNBBL data')
    } finally {
      setIsSeedingTnbbl(false)
    }
  }

  useEffect(() => {
    if (auctionId) {
      loadCredentials()
      loadPlayers()
    }
  }, [auctionId])

  const loadCredentials = async () => {
    try {
      const res = await fetch(`/api/auctions/${auctionId}/credentials`)
      if (res.ok) {
        const data = await res.json()
        setBidders(data.bidders || [])
        if (data.bidders?.length > 0 && !selectedBidderTeam) {
          setSelectedBidderTeam(data.bidders[0].teamName)
        }
      }
    } catch {
      // Fallback
    }
  }

  const loadPlayers = async () => {
    try {
      const res = await fetch(`/api/auctions/${auctionId}/players`)
      if (res.ok) {
        const data = await res.json()
        const fetchedPlayers: AuctionPlayer[] = data.players || []
        setPlayers(fetchedPlayers)
        if (fetchedPlayers.length > 0 && !activePlayerId) {
          const first = fetchedPlayers[0]
          setActivePlayerId(first.id)
          setCurrentBid(first.basePrice)
        }
      }
    } catch {
      // Fallback
    }
  }

  const activePlayer = players.find((p) => p.id === activePlayerId) || players[0]

  const handleSelectPlayer = (player: AuctionPlayer) => {
    setActivePlayerId(player.id)
    setCurrentBid(player.soldPrice || player.basePrice)
    setBidHistory([])
  }

  const handlePlaceBid = (increment: number) => {
    if (!selectedBidderTeam) {
      setErr('Please select a franchise bidder team to place a bid')
      return
    }
    const newBid = currentBid + increment
    setCurrentBid(newBid)
    setBidHistory((prev) => [
      { team: selectedBidderTeam, amount: newBid, time: new Date().toLocaleTimeString() },
      ...prev,
    ])
    setMsg(`Bid placed: ${selectedBidderTeam} bid ₹${newBid.toLocaleString()} for ${activePlayer?.ign}!`)
  }

  const handleMarkSold = async () => {
    if (!activePlayer) return
    if (!selectedBidderTeam) {
      setErr('Please select the winning franchise bidder team')
      return
    }

    try {
      const res = await fetch(`/api/auctions/${auctionId}/players/${activePlayer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'sold',
          soldPrice: currentBid,
          soldToTeam: selectedBidderTeam,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update player')

      setMsg(`SOLD! ${activePlayer.ign} sold to ${selectedBidderTeam} for ₹${currentBid.toLocaleString()}!`)
      loadPlayers()
      loadCredentials()
    } catch (e: unknown) {
      if (e instanceof Error) setErr(e.message)
    }
  }

  const handleMarkUnsold = async () => {
    if (!activePlayer) return
    try {
      const res = await fetch(`/api/auctions/${auctionId}/players/${activePlayer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'unsold',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update player')

      setMsg(`${activePlayer.ign} marked as UNSOLD for this round.`)
      loadPlayers()
    } catch (e: unknown) {
      if (e instanceof Error) setErr(e.message)
    }
  }

  const handleExecuteReverseSold = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reversalTarget) return
    setIsReversing(true)
    setErr('')
    try {
      const res = await fetch(`/api/auctions/${auctionId}/players/${reversalTarget.id}/reverse-sold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reversalReason.trim() || 'Organizer reversed sale per dispute resolution.',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reverse player sale')

      setMsg(data.message || `Sale reversed! ₹${reversalTarget.soldPrice.toLocaleString()} refunded to ${reversalTarget.soldToTeam}.`)
      setReversalTarget(null)
      setReversalReason('')
      loadPlayers()
      loadCredentials()
    } catch (e: unknown) {
      if (e instanceof Error) setErr(e.message)
      else setErr('Failed to reverse sale')
    } finally {
      setIsReversing(false)
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setErr('')
    setMsg('')
    try {
      const teams = teamsText.split(',').map((t) => t.trim()).filter(Boolean)
      const res = await fetch(`/api/auctions/${auctionId}/credentials/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams, purseAmount: purse }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate credentials')

      setBidders(data.bidders)
      setMsg(`Generated ${data.bidders.length} unique ephemeral bidder credentials!`)
    } catch (e: unknown) {
      if (e instanceof Error) setErr(e.message)
      else setErr('Error generating credentials')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFinalizeAndWipe = async () => {
    if (
      !confirm(
        'CRITICAL: Finalize Auction?\n\nThis will permanently DELETE all generated team bidder accounts and revoke all active session tokens immediately as per platform security policy.'
      )
    ) {
      return
    }

    setIsFinalizing(true)
    setErr('')
    setMsg('')
    try {
      const res = await fetch(`/api/auctions/${auctionId}/finalize`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to finalize auction')

      setBidders([])
      setMsg(data.message || 'Auction finalized. All temporary credentials permanently deleted.')
    } catch (e: unknown) {
      if (e instanceof Error) setErr(e.message)
      else setErr('Failed to finalize auction')
    } finally {
      setIsFinalizing(false)
    }
  }

  // Google Sheets / CSV Import Handler
  const handleImportCsv = async () => {
    if (!csvInput.trim()) {
      setErr('Please paste CSV data or Google Sheets content')
      return
    }
    setIsImporting(true)
    setErr('')
    setMsg('')

    try {
      const lines = csvInput.trim().split('\n')
      const rows = lines.slice(lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('ign') ? 1 : 0)

      const parsedPlayers = rows
        .map((line) => {
          const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''))
          if (cols.length < 2) return null
          return {
            name: cols[0] || 'Player',
            ign: cols[1] || cols[0],
            gameUid: cols[2] || `UID-${Math.floor(100000 + Math.random() * 900000)}`,
            role: cols[3] || 'Rusher',
            basePrice: Number(cols[4]) || 5000,
            tier: Number(cols[4]) >= 10000 ? 'Tier 1 (Marquee)' : 'Tier 2 (Pro)',
            clipUrl: cols[5] || '',
            photoUrl: cols[6] || '',
            kd: cols[7] || '4.00',
          }
        })
        .filter(Boolean)

      if (parsedPlayers.length === 0) {
        throw new Error('Could not parse any valid player rows from the input CSV')
      }

      const res = await fetch(`/api/auctions/${auctionId}/sheets/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: parsedPlayers }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to import from Google Sheets')

      setMsg(data.message || `Imported ${parsedPlayers.length} draft players successfully!`)
      setCsvInput('')
      loadPlayers()
    } catch (e: unknown) {
      if (e instanceof Error) setErr(e.message)
      else setErr('Failed to import CSV')
    } finally {
      setIsImporting(false)
    }
  }

  const loadSampleCsv = () => {
    setCsvInput(
      `Name,IGN,GameUID,Role,BasePrice,ClipURL,PhotoURL,KD
Rahul Sharma,RAHUL_HEADSHOT,771920311,Sniper,12000,https://www.youtube.com/watch?v=dQw4w9WgXcQ,https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80,5.60
Vikas Kumar,BLAZE_RUSHER_OP,882910322,Rusher,9000,https://www.youtube.com/watch?v=dQw4w9WgXcQ,https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80,4.75
Deepak Raj,TITAN_IGL_CHAMP,991827364,IGL,15000,https://www.youtube.com/watch?v=dQw4w9WgXcQ,https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80,4.20
Arun Kumar,VIPER_ASSAULT,661928374,Assaulter,7500,https://www.youtube.com/watch?v=dQw4w9WgXcQ,https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80,3.90`
    )
  }

  const copyCreds = (b: Bidder) => {
    const text = `RDK Esports - Auction Credentials\nTournament: Phoenix Grand Auction League\nTeam: ${b.teamName}\nLogin: ${b.loginCode}\nPasskey: ${b.passkey}\nPurse: ₹${b.allocatedPurse.toLocaleString()}\nPortal: http://127.0.0.1:5173/login`
    navigator.clipboard.writeText(text)
    setCopiedId(b.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const copyAll = () => {
    const all = bidders
      .map(
        (b) =>
          `Team: ${b.teamName} | Login: ${b.loginCode} | Passkey: ${b.passkey} | Purse: ₹${b.allocatedPurse.toLocaleString()}`
      )
      .join('\n')
    navigator.clipboard.writeText(all)
    alert('All team credentials copied to clipboard!')
  }

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'Sniper':
        return <Crosshair className="size-3.5 text-blue-400" />
      case 'Rusher':
        return <Zap className="size-3.5 text-amber-400" />
      case 'IGL':
        return <Crown className="size-3.5 text-yellow-400" />
      case 'Assaulter':
        return <Target className="size-3.5 text-red-400" />
      default:
        return <Shield className="size-3.5 text-emerald-400" />
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Auction Conductor Studio & Draft Engine"
        description="Official Creator Desk: Conduct live player auctions with video gameplay clips, manage Google Sheets draft candidate sync, and control franchise accounts."
        actions={
          auctionTournaments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {auctionTournaments.length > 1 && (
                <div className="flex items-center gap-1.5 bg-muted/60 border border-border rounded-lg px-2.5 py-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Auction:</span>
                  <select
                    value={auctionId}
                    onChange={(e) => {
                      setSelectedTournamentId(e.target.value)
                      setSearchParams({ tournamentId: e.target.value })
                    }}
                    className="bg-transparent text-xs font-bold text-foreground focus:outline-none"
                  >
                    {auctionTournaments.map((t) => (
                      <option key={t.id} value={t.id} className="bg-card text-foreground">
                        {t.name} ({t.game})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <a
                href={`/api/auctions/${auctionId}/sheets/export`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <FileSpreadsheet className="size-4 text-emerald-400" />
                Export to Google Sheets
              </a>
              {bidders.length > 0 && (
                <button
                  onClick={handleFinalizeAndWipe}
                  disabled={isFinalizing}
                  className="inline-flex items-center gap-1.5 rounded bg-danger px-3.5 py-2 text-xs font-bold text-white shadow hover:opacity-90 transition disabled:opacity-60"
                >
                  <Trash2 className="size-4" />
                  {isFinalizing ? 'Purging Accounts…' : 'Finalize & Wipe Credentials'}
                </button>
              )}
            </div>
          )
        }
      />

      {msg && (
        <div className="flex items-center gap-2 rounded border border-success/30 bg-success/10 p-3 text-xs text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {err && (
        <div className="flex items-center gap-2 rounded border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          <AlertCircle className="size-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* When no auction tournaments exist */}
      {auctionTournaments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Gavel className="size-12 text-amber-500/60 mx-auto mb-3" />
          <h3 className="font-heading font-black text-base text-foreground uppercase tracking-wide">
            No Auction Tournaments Created
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-5">
            The Live Auction Arena and Franchise Bidder desk are only available for IPL-Style Auction tournaments. You currently do not have any auction-based tournaments created.
          </p>
          <Link
            to="/creator/tournaments/create"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-background shadow hover:opacity-90 transition"
          >
            <Plus className="size-4" />
            Create Auction Tournament
          </Link>
        </div>
      ) : (
        <>
          {/* Primary Navigation Tabs */}
          <div className="flex border-b border-border text-xs font-semibold">
            <button
              onClick={() => setActiveTab('stage')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 transition ${
                activeTab === 'stage'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Gavel className="size-4" />
              Live Auction Stage & Video Spotlight
              <span className="rounded bg-primary/20 text-primary px-1.5 py-0.5 text-[10px] font-bold">
                LIVE
              </span>
            </button>

        <button
          onClick={() => setActiveTab('sheets')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition ${
            activeTab === 'sheets'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileSpreadsheet className="size-4 text-emerald-400" />
          Google Sheets & Draft Candidate Pool
          <span className="rounded bg-muted text-muted-foreground px-1.5 py-0.5 text-[10px]">
            {players.length} Players
          </span>
        </button>

        <button
          onClick={() => setActiveTab('credentials')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition ${
            activeTab === 'credentials'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="size-4" />
          Franchise Bidder Accounts
          <span className="rounded bg-muted text-muted-foreground px-1.5 py-0.5 text-[10px]">
            {bidders.length} Teams
          </span>
        </button>
      </div>

      {/* ── TAB 1: LIVE AUCTION STAGE & VIDEO SPOTLIGHT ── */}
      {activeTab === 'stage' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Player Draft Pool Queue */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  Draft Pool ({players.length})
                </h3>
                <button
                  onClick={loadPlayers}
                  className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  <RefreshCw className="size-3" /> Refresh
                </button>
              </div>

              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {players.map((p) => {
                  const isSelected = p.id === activePlayer?.id
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPlayer(p)}
                      className={`p-3 rounded border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow'
                          : 'border-border bg-muted/40 hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.photoUrl || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=150&q=80'}
                          alt={p.ign}
                          className="size-9 rounded-full object-cover border border-border"
                        />
                        <div>
                          <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            {p.ign}
                            <span className="text-[10px] font-semibold text-muted-foreground">({p.role})</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Base: <span className="font-semibold text-foreground">₹{p.basePrice.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {p.status === 'sold' ? (
                          <span className="rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] px-2 py-0.5 uppercase">
                            SOLD ₹{p.soldPrice?.toLocaleString()}
                          </span>
                        ) : p.status === 'unsold' ? (
                          <span className="rounded bg-red-500/20 text-red-400 font-bold text-[10px] px-2 py-0.5 uppercase">
                            UNSOLD
                          </span>
                        ) : (
                          <span className="rounded bg-primary/20 text-primary font-bold text-[10px] px-2 py-0.5 uppercase">
                            AVAILABLE
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Franchise Team Purse Quick Snapshot */}
            <div className="rounded border border-border bg-card p-4 space-y-3">
              <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Coins className="size-4 text-warning" />
                Live Franchise Remaining Purses
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                {bidders.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                    <span className="font-semibold text-foreground">{b.teamName}</span>
                    <span className="font-bold text-emerald-400">₹{b.allocatedPurse.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Player Spotlight Card, Gameplay Clip & Conductor Hammer */}
          <div className="lg:col-span-8 space-y-5">
            {activePlayer ? (
              <div className="rounded border border-border bg-card overflow-hidden shadow-xl">
                {/* Spotlight Card Header */}
                <div className="bg-gradient-to-r from-primary/20 via-primary/5 to-transparent p-5 border-b border-border flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded bg-primary text-background p-2">
                      <Gavel className="size-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                        CURRENTLY ON THE HAMMER
                      </span>
                      <h2 className="text-xl font-extrabold text-foreground">{activePlayer.ign}</h2>
                      <p className="text-xs text-muted-foreground">{activePlayer.name} • UID: {activePlayer.gameUid}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded bg-card border border-border px-3 py-1 text-xs font-bold text-foreground flex items-center gap-1.5">
                      {getRoleIcon(activePlayer.role)}
                      {activePlayer.role}
                    </span>
                    <span className="rounded bg-primary/20 text-primary border border-primary/30 px-3 py-1 text-xs font-bold">
                      {activePlayer.tier}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Spotlight Card Body: Photo + Combat Stats + Live Gameplay Clip Video Screen */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Player Portrait & Stats */}
                    <div className="md:col-span-5 space-y-4">
                      <div className="relative aspect-[3/4] max-h-72 rounded-lg overflow-hidden border border-border/80 bg-muted shadow-md group">
                        <img
                          src={activePlayer.photoUrl || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80'}
                          alt={activePlayer.ign}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 text-xs">
                          <p className="font-extrabold text-foreground text-sm">{activePlayer.ign}</p>
                          <p className="text-muted-foreground text-[11px] line-clamp-1">
                            {activePlayer.stats?.achievements || 'State Tier-1 Tournament Contender'}
                          </p>
                        </div>
                      </div>

                      {/* Stat Tiles */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2.5 rounded bg-muted/60 border border-border/60">
                          <p className="text-[10px] text-muted-foreground">K/D</p>
                          <p className="font-extrabold text-primary text-sm">{activePlayer.stats?.kd || '4.50'}</p>
                        </div>
                        <div className="p-2.5 rounded bg-muted/60 border border-border/60">
                          <p className="text-[10px] text-muted-foreground">Headshot</p>
                          <p className="font-extrabold text-foreground text-sm">{activePlayer.stats?.headshotRate || '65%'}</p>
                        </div>
                        <div className="p-2.5 rounded bg-muted/60 border border-border/60">
                          <p className="text-[10px] text-muted-foreground">Base Price</p>
                          <p className="font-extrabold text-emerald-400 text-sm">₹{activePlayer.basePrice.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Gameplay Video Clip Preview Section */}
                    <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                            <Video className="size-4 text-primary" />
                            Registered Gameplay Highlights / Clip
                          </h4>
                          {activePlayer.clipUrl && (
                            <a
                              href={activePlayer.clipUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="size-3" /> External Link
                            </a>
                          )}
                        </div>

                        {/* Video Clipping Container (Supports YouTube & Google Drive) */}
                        <div className="rounded-lg border border-border bg-black/60 overflow-hidden aspect-video relative flex items-center justify-center shadow-inner group">
                          {activePlayer.clipUrl ? (
                            getEmbedVideoUrl(activePlayer.clipUrl) ? (
                              <iframe
                                src={getEmbedVideoUrl(activePlayer.clipUrl)!}
                                title={`${activePlayer.ign} Gameplay Clip`}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <div className="text-center p-6 space-y-3">
                                <div className="size-12 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center">
                                  <Play className="size-6 ml-0.5" />
                                </div>
                                <div>
                                  <p className="font-bold text-xs text-foreground">Drive / Stream Highlight Clip</p>
                                  <p className="text-[11px] text-muted-foreground truncate max-w-xs mx-auto">
                                    {activePlayer.clipUrl}
                                  </p>
                                </div>
                                <a
                                  href={activePlayer.clipUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-bold text-background"
                                >
                                  Watch Gameplay Montage <ExternalLink className="size-3" />
                                </a>
                              </div>
                            )
                          ) : (
                            <div className="text-center p-6 text-muted-foreground text-xs space-y-2">
                              <Video className="size-8 mx-auto opacity-40" />
                              <p>No gameplay clip submitted during registration</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Live Bidding Box */}
                      <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">CURRENT HIGHEST BID</span>
                            <div className="text-2xl font-black text-emerald-400">
                              ₹{currentBid.toLocaleString()}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">FRANCHISE ON BID</span>
                            <div className="text-sm font-extrabold text-foreground">
                              {selectedBidderTeam || 'Select Franchise'}
                            </div>
                          </div>
                        </div>

                        {/* Franchise Selector */}
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                            Current Bidding Franchise Team:
                          </label>
                          <select
                            value={selectedBidderTeam}
                            onChange={(e) => setSelectedBidderTeam(e.target.value)}
                            className="w-full rounded border border-border bg-card p-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                          >
                            <option value="">-- Choose Franchise Team --</option>
                            {bidders.map((b) => (
                              <option key={b.id} value={b.teamName}>
                                {b.teamName} (Purse: ₹{b.allocatedPurse.toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Increment Buttons */}
                        <div className="grid grid-cols-4 gap-2">
                          {[500, 1000, 2500, 5000].map((inc) => (
                            <button
                              key={inc}
                              onClick={() => handlePlaceBid(inc)}
                              className="rounded border border-border bg-card py-2 text-xs font-extrabold text-foreground hover:border-primary hover:text-primary transition shadow-sm"
                            >
                              +₹{inc.toLocaleString()}
                            </button>
                          ))}
                        </div>

                        {/* Conductor Decision Buttons */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            onClick={handleMarkSold}
                            className="inline-flex items-center justify-center gap-1.5 rounded bg-emerald-500 py-2.5 text-xs font-black text-black hover:bg-emerald-400 transition shadow"
                          >
                            <Gavel className="size-4" />
                            SOLD TO {selectedBidderTeam ? selectedBidderTeam.split(' ')[0] : 'TEAM'}
                          </button>
                          <button
                            onClick={handleMarkUnsold}
                            className="inline-flex items-center justify-center gap-1.5 rounded border border-danger/40 bg-danger/10 py-2.5 text-xs font-bold text-danger hover:bg-danger/20 transition"
                          >
                            <X className="size-4" />
                            MARK UNSOLD
                          </button>
                        </div>

                        {/* REVERSE SOLD ACTION (When Player was sold) */}
                        {activePlayer.status === 'sold' && (
                          <div className="pt-2">
                            <button
                              onClick={() => {
                                setReversalTarget({
                                  id: activePlayer.id,
                                  ign: activePlayer.ign,
                                  soldToTeam: activePlayer.soldToTeam || selectedBidderTeam || 'Franchise Team',
                                  soldPrice: activePlayer.soldPrice || currentBid,
                                })
                                setReversalReason('')
                              }}
                              className="w-full inline-flex items-center justify-center gap-1.5 rounded border border-amber-500/50 bg-amber-500/10 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition"
                            >
                              <RotateCcw className="size-3.5" />
                              REVERSE SOLD TRANSACTION (RESTORE PURSE)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bid History Ticker */}
                  {bidHistory.length > 0 && (
                    <div className="rounded border border-border bg-muted/20 p-3 space-y-1.5">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Live Hammer Activity
                      </h5>
                      <div className="space-y-1 max-h-24 overflow-y-auto text-xs">
                        {bidHistory.map((b, idx) => (
                          <div key={idx} className="flex items-center justify-between text-muted-foreground">
                            <span>
                              <strong className="text-foreground">{b.team}</strong> placed bid of{' '}
                              <strong className="text-emerald-400">₹{b.amount.toLocaleString()}</strong>
                            </span>
                            <span className="text-[10px]">{b.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded border border-border bg-card p-12 text-center text-muted-foreground text-xs">
                No draft candidate selected. Pick a player from the left draft pool queue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: GOOGLE SHEETS & DRAFT CANDIDATE POOL ── */}
      {activeTab === 'sheets' && (
        <div className="space-y-6">
          {/* Google Sheets Sync & Import Tool */}
          <div className="rounded border border-border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="size-4 text-emerald-400" />
                  Google Sheets / Form Submissions Sync
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Paste rows directly from your Google Sheet or Google Form responses to batch-import draft players, stats, and gameplay video clipping URLs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadSampleCsv}
                  className="rounded border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  Load Example Template
                </button>
                <a
                  href={`/api/auctions/${auctionId}/sheets/export`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-black hover:bg-emerald-400 transition"
                >
                  <Download className="size-3.5" />
                  Download Complete CSV
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-foreground">
                Paste Google Sheets Data (Comma-Separated: Name, IGN, UID, Role, BasePrice, ClipURL, PhotoURL, K/D):
              </label>
              <textarea
                rows={4}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder="Name,IGN,GameUID,Role,BasePrice,ClipURL,PhotoURL,KD&#10;Rahul Sharma,RAHUL_HEADSHOT,771920311,Sniper,12000,https://youtube.com/watch?v=...,https://...,5.60"
                className="w-full rounded border border-border bg-muted p-3 text-foreground font-mono text-xs focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleImportCsv}
                disabled={isImporting}
                className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-xs font-bold text-background shadow hover:opacity-90 transition disabled:opacity-60"
              >
                <Upload className="size-3.5" />
                {isImporting ? 'Importing Rows…' : 'Sync & Import to Live Auction Pool'}
              </button>
            </div>
          </div>

          {/* Full Draft Candidate Table */}
          <div className="rounded border border-border bg-card overflow-hidden">
            <div className="border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Registered Auction Candidates</h3>
                <span className="rounded bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5">
                  {players.length} Total Registered
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-3 font-semibold">Candidate</th>
                    <th className="p-3 font-semibold">Role</th>
                    <th className="p-3 font-semibold">Game UID</th>
                    <th className="p-3 font-semibold">Base Price</th>
                    <th className="p-3 font-semibold">Gameplay Clip</th>
                    <th className="p-3 font-semibold">Payment Proof</th>
                    <th className="p-3 font-semibold">Status / Sold To</th>
                    <th className="p-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {players.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={p.photoUrl || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=150&q=80'}
                            alt={p.ign}
                            className="size-8 rounded-full object-cover border border-border"
                          />
                          <div>
                            <div className="font-bold text-foreground">{p.ign}</div>
                            <div className="text-[11px] text-muted-foreground">{p.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                          {getRoleIcon(p.role)}
                          {p.role}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">{p.gameUid}</td>
                      <td className="p-3 font-bold text-emerald-400">₹{p.basePrice.toLocaleString()}</td>
                      <td className="p-3">
                        {p.clipUrl ? (
                          <button
                            onClick={() => setPreviewClipUrl(p.clipUrl || null)}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                          >
                            <Play className="size-3" />
                            Watch Clip
                          </button>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">No clip</span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.paymentProofUrl ? (
                          <button
                            onClick={() => setPreviewScreenshotUrl(p.paymentProofUrl || null)}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-semibold"
                          >
                            <Eye className="size-3" />
                            View Screenshot
                          </button>
                        ) : (
                          <span className="rounded bg-muted text-muted-foreground text-[10px] px-2 py-0.5 font-mono">
                            Auto / UTR
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.status === 'sold' ? (
                          <div>
                            <span className="rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] px-2 py-0.5 uppercase">
                              SOLD ₹{p.soldPrice?.toLocaleString()}
                            </span>
                            <div className="text-[11px] text-foreground font-semibold mt-0.5">
                              {p.soldToTeam}
                            </div>
                          </div>
                        ) : p.status === 'unsold' ? (
                          <span className="rounded bg-red-500/20 text-red-400 font-bold text-[10px] px-2 py-0.5 uppercase">
                            UNSOLD
                          </span>
                        ) : (
                          <span className="rounded bg-primary/20 text-primary font-bold text-[10px] px-2 py-0.5 uppercase">
                            AVAILABLE
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === 'sold' && (
                            <button
                              onClick={() => {
                                setReversalTarget({
                                  id: p.id,
                                  ign: p.ign,
                                  soldToTeam: p.soldToTeam || 'Team',
                                  soldPrice: p.soldPrice || 0,
                                })
                                setReversalReason('')
                              }}
                              className="inline-flex items-center gap-1 rounded border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 px-2 py-1 text-[11px] font-bold transition"
                              title="Reverse sold transaction and restore team purse"
                            >
                              <RotateCcw className="size-3" /> Reverse
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handleSelectPlayer(p)
                              setActiveTab('stage')
                            }}
                            className="inline-flex items-center gap-1 rounded bg-primary/10 hover:bg-primary text-primary hover:text-background px-2.5 py-1 text-[11px] font-bold transition"
                          >
                            Spotlight On Stage <ArrowRight className="size-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: EPHEMERAL BIDDER CREDENTIALS ── */}
      {activeTab === 'credentials' && (
        <div className="space-y-6">
          {/* Security Lifecycle Notice Banner */}
          <div className="rounded border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
            <ShieldAlert className="size-5 text-warning shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-foreground">
                Ephemeral Credentials Lifecycle (Creator Security Policy):
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Unique credentials generated below give each participating team captain scoped access to the live bidding room with their pre-loaded purse.
                Once you click <strong className="text-danger">"Finalize & Wipe Credentials"</strong>, every temporary bidder account and active session token is <strong>permanently wiped from the database</strong>.
              </p>
            </div>
          </div>

          {/* Configuration Card */}
          <div className="rounded border border-border bg-card p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Gavel className="size-4 text-primary" />
              Auction Parameters (Phoenix Grand Auction League)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-medium text-foreground mb-1">
                  Participating Teams (comma-separated):
                </label>
                <textarea
                  rows={2}
                  value={teamsText}
                  onChange={(e) => setTeamsText(e.target.value)}
                  className="w-full rounded border border-border bg-muted p-2 text-foreground font-mono text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">
                  Starting Purse per Team (₹):
                </label>
                <input
                  type="number"
                  value={purse}
                  onChange={(e) => setPurse(Number(e.target.value))}
                  className="w-full rounded border border-border bg-muted p-2 text-foreground font-semibold text-xs focus:border-primary focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Default starting purse for player bids</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleSeedTnbbl}
                disabled={isSeedingTnbbl}
                className="inline-flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-60 shadow-sm"
              >
                <Trophy className="size-4 text-amber-400" />
                {isSeedingTnbbl ? 'Seeding TNBBL Season 2…' : 'Seed TNBBL Season 2 (36 Franchises & ₹1.5L Purse)'}
              </button>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-xs font-bold text-background shadow hover:opacity-90 transition disabled:opacity-60"
              >
                <Sparkles className="size-4" />
                {isGenerating ? 'Generating…' : 'Generate Unique Credentials'}
              </button>
            </div>
          </div>

          {/* Active Bidders Credentials Table */}
          <div className="rounded border border-border bg-card overflow-hidden">
            <div className="border-b border-border p-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Live Bidder Credentials</h2>
                <span className="rounded bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5">
                  {bidders.length} Teams Ready
                </span>
              </div>

              {bidders.length > 0 && (
                <button
                  onClick={copyAll}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                >
                  <Copy className="size-3.5" />
                  Copy All for WhatsApp / Discord
                </button>
              )}
            </div>

            {/* Group Filter Chips */}
            {bidders.some((b) => b.group) && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-4 py-2.5 text-xs">
                <span className="font-semibold text-muted-foreground mr-1 text-[11px]">Filter by Group:</span>
                {(['ALL', 'GROUP A', 'GROUP B', 'GROUP C'] as const).map((grp) => {
                  const count = grp === 'ALL' ? bidders.length : bidders.filter((b) => b.group === grp).length
                  return (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setBidderGroupFilter(grp)}
                      className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                        bidderGroupFilter === grp
                          ? 'bg-primary text-background'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>{grp}</span>
                      <span className="opacity-75 text-[10px]">({count})</span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-3 font-semibold">Team Name</th>
                    <th className="p-3 font-semibold">Unique Login Identifier</th>
                    <th className="p-3 font-semibold">Passkey</th>
                    <th className="p-3 font-semibold">Purse Budget</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bidders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No active auction credentials generated. Click "Generate Unique Credentials" or "Seed TNBBL Season 2" to create scoped accounts for this auction.
                      </td>
                    </tr>
                  ) : (
                    bidders
                      .filter((b) => bidderGroupFilter === 'ALL' || b.group === bidderGroupFilter)
                      .map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30 transition">
                        <td className="p-3 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{b.teamName}</span>
                            {b.group && (
                              <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black px-1.5 py-0.5">
                                {b.group}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-primary font-semibold select-all">
                          {b.loginCode}
                        </td>
                        <td className="p-3 font-mono text-foreground font-bold select-all bg-muted/40 rounded">
                          {b.passkey}
                        </td>
                        <td className="p-3 font-bold text-success tabular-nums">
                          <span className="flex items-center gap-1">
                            <Coins className="size-3" />
                            ₹{b.allocatedPurse.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="rounded bg-success/20 text-success text-[10px] font-bold px-2 py-0.5 uppercase">
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => copyCreds(b)}
                            className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition"
                          >
                            {copiedId === b.id ? (
                              <>
                                <CheckCircle2 className="size-3 text-success" />
                                <span className="text-success">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Video Clip Modal Preview */}
      {previewClipUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Video className="size-4 text-primary" />
                Player Gameplay Montage Preview
              </h3>
              <button
                onClick={() => setPreviewClipUrl(null)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
              {getEmbedVideoUrl(previewClipUrl) ? (
                <iframe
                  src={getEmbedVideoUrl(previewClipUrl)!}
                  title="Gameplay Video"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <Play className="size-10 text-primary mx-auto" />
                  <p className="text-xs text-foreground font-medium truncate max-w-sm">{previewClipUrl}</p>
                  <a
                    href={previewClipUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-xs font-bold text-background"
                  >
                    Open Clip in Browser <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REVERSE SOLD TRANSACTION MODAL */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="size-5 text-amber-400" />
                <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground">
                  Reverse Sold Player Transaction
                </h3>
              </div>
              <button
                onClick={() => setReversalTarget(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
              <p>
                Candidate: <strong className="text-white">{reversalTarget.ign}</strong>
              </p>
              <p>
                Purchasing Team: <strong className="text-white">{reversalTarget.soldToTeam}</strong>
              </p>
              <p>
                Sold Price to Refund: <strong className="text-emerald-400 font-bold">₹{reversalTarget.soldPrice.toLocaleString()}</strong>
              </p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Reversing this sale will set candidate status back to <span className="text-primary font-bold">AVAILABLE</span>, credit <strong className="text-foreground">₹{reversalTarget.soldPrice.toLocaleString()}</strong> back to {reversalTarget.soldToTeam}&apos;s purse, and log an immutable audit event.
            </p>

            <form onSubmit={handleExecuteReverseSold} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Reversal Reason (Audit Log Required) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Bidder entered bid by mistake, franchise dispute, or rule violation."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversalTarget(null)}
                  className="px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReversing}
                  className="px-4 py-1.5 rounded bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition disabled:opacity-60 flex items-center gap-1.5"
                >
                  <RotateCcw className="size-3.5" />
                  {isReversing ? 'Reversing Sale…' : 'Confirm Reversal & Refund Purse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Screenshot Modal Preview */}
      {previewScreenshotUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Eye className="size-4 text-emerald-400" />
                Uploaded UPI Payment Screenshot
              </h3>
              <button
                onClick={() => setPreviewScreenshotUrl(null)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center max-h-[70vh]">
              <img
                src={previewScreenshotUrl}
                alt="Payment Screenshot"
                className="w-full h-auto object-contain max-h-[65vh]"
              />
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}
