import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gavel,
  Trophy,
  Coins,
  Users,
  Video,
  Shield,
  Zap,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Radio,
  Eye,
  TrendingUp,
  Sparkles,
  Play,
  Flame,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Crown,
  Search,
  Check,
  X,
  Target,
} from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { parseStreamEmbed } from '@/utils/stream'

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
}

interface BidHistoryItem {
  team: string
  amount: number
  time: string
}

interface TournamentData {
  id: string
  name: string
  game: string
  format: string
  prizePool?: string
  startDate?: string
  streamUrl?: string
  streamStatus?: 'live' | 'upcoming' | 'ended'
  streamTitle?: string
  creatorName?: string
}

interface AmbassadorBidderPortalProps {
  initialTab?: 'auction' | 'squad' | 'live'
}

export default function AmbassadorBidderPortal({ initialTab = 'auction' }: AmbassadorBidderPortalProps) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const queryTab = searchParams.get('tab') as 'auction' | 'squad' | 'live' | null
  const [activeTab, setActiveTab] = useState<'auction' | 'squad' | 'live'>(
    queryTab || initialTab || 'auction'
  )

  // Identify assigned tournament & team identity
  const tournamentId = user?.auctionId || user?.tournamentId || 't3'
  const myTeamName = user?.teamName || user?.organizationName || 'Aura XtremeZ'

  // Data State
  const [tournament, setTournament] = useState<TournamentData | null>(null)
  const [players, setPlayers] = useState<AuctionPlayer[]>([])
  const [activePlayerId, setActivePlayerId] = useState<string>('')
  const [currentBid, setCurrentBid] = useState<number>(10000)
  const [highestBidderTeam, setHighestBidderTeam] = useState<string>('')
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>([])
  const [allocatedPurse, setAllocatedPurse] = useState<number>(user?.allocatedPurse || 100000)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)
  const [customBidAmount, setCustomBidAmount] = useState<string>('')
  const [feedbackMsg, setFeedbackMsg] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Filters for pool
  const [searchFilter, setSearchFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Video preview modal
  const [previewClipUrl, setPreviewClipUrl] = useState<string | null>(null)

  // Keep tab in sync with URL
  useEffect(() => {
    if (queryTab && ['auction', 'squad', 'live'].includes(queryTab)) {
      setActiveTab(queryTab)
    }
  }, [queryTab])

  const handleTabChange = (tab: 'auction' | 'squad' | 'live') => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  // Load tournament info & auction pool
  useEffect(() => {
    loadAllData()
    // Poll every 5s for live auction sync
    const interval = setInterval(loadAuctionState, 5000)
    return () => clearInterval(interval)
  }, [tournamentId])

  const loadAllData = async () => {
    setIsLoading(true)
    await Promise.all([loadTournament(), loadPlayers(), loadAuctionState(), loadPurse()])
    setIsLoading(false)
  }

  const loadTournament = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`)
      if (res.ok) {
        const data = await res.json()
        setTournament(data.tournament || data)
      }
    } catch {
      // Fallback fallback
    }
  }

  const loadPlayers = async () => {
    try {
      const res = await fetch(`/api/auctions/${tournamentId}/players`)
      if (res.ok) {
        const data = await res.json()
        const fetchedPlayers: AuctionPlayer[] = data.players || []
        setPlayers(fetchedPlayers)
        if (fetchedPlayers.length > 0 && !activePlayerId) {
          const first = fetchedPlayers.find((p) => p.status === 'on_auction') || fetchedPlayers[0]
          setActivePlayerId(first.id)
          setCurrentBid(first.soldPrice || first.basePrice)
          if (first.soldToTeam) setHighestBidderTeam(first.soldToTeam)
        }
      }
    } catch {
      // Fallback
    }
  }

  const loadAuctionState = async () => {
    try {
      const res = await fetch(`/api/auctions/${tournamentId}/state`)
      if (res.ok) {
        const state = await res.json()
        if (state.activePlayerId) setActivePlayerId(state.activePlayerId)
        if (state.currentBid) setCurrentBid(state.currentBid)
        if (state.highestBidderTeam !== undefined) setHighestBidderTeam(state.highestBidderTeam)
        if (state.bidHistory) setBidHistory(state.bidHistory)
      }
    } catch {
      // Silently ignore polling network glitch
    }
  }

  const loadPurse = async () => {
    try {
      const res = await fetch(`/api/auctions/${tournamentId}/credentials`)
      if (res.ok) {
        const data = await res.json()
        const myBidder = data.bidders?.find(
          (b: { teamName: string; allocatedPurse: number }) =>
            b.teamName.toLowerCase() === myTeamName.toLowerCase()
        )
        if (myBidder) {
          setAllocatedPurse(myBidder.allocatedPurse)
        }
      }
    } catch {
      // Fallback
    }
  }

  // Active player on hammer
  const activePlayer = players.find((p) => p.id === activePlayerId) || players[0]
  const basePrice = activePlayer?.basePrice || (tournament as any)?.basePrice || 5000
  const maxSquadSize = (tournament as any)?.maxSquadSize || 6

  // Acquired Squad for this franchise
  const mySquad = players.filter(
    (p) => p.status === 'sold' && p.soldToTeam?.toLowerCase() === myTeamName.toLowerCase()
  )

  const squadCount = mySquad.length
  const isSquadFull = squadCount >= maxSquadSize
  const remainingSlotsAfter = Math.max(0, maxSquadSize - (squadCount + 1))
  const requiredReserve = remainingSlotsAfter * basePrice

  const totalSpent = mySquad.reduce((sum, p) => sum + (p.soldPrice || p.basePrice), 0)
  const remainingPurse = Math.max(0, allocatedPurse - totalSpent)
  const maxAllowedBid = Math.max(0, remainingPurse - requiredReserve)
  const isWinningCurrentBid = highestBidderTeam.toLowerCase() === myTeamName.toLowerCase()

  // Handle Placing Bid
  const handlePlaceBid = async (amount: number) => {
    setErrorMsg('')
    setFeedbackMsg('')

    if (isSquadFull) {
      setErrorMsg(`Squad Roster Full! Your franchise already has ${squadCount}/${maxSquadSize} players and cannot place further bids.`)
      return
    }

    if (amount <= currentBid) {
      setErrorMsg(`Bid must be greater than current bid (₹${currentBid.toLocaleString()})`)
      return
    }

    if (amount > maxAllowedBid) {
      setErrorMsg(
        `Purse Reserve Violation: You must maintain at least ₹${requiredReserve.toLocaleString()} (₹${basePrice.toLocaleString()} base bid × ${remainingSlotsAfter} slots) for remaining squad slots. Maximum bid allowed is ₹${maxAllowedBid.toLocaleString()}.`
      )
      return
    }

    setIsSubmittingBid(true)
    try {
      const res = await fetch(`/api/auctions/${tournamentId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: myTeamName,
          amount,
          playerId: activePlayer?.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to place bid')

      setCurrentBid(amount)
      setHighestBidderTeam(myTeamName)
      setBidHistory((prev) => [
        { team: myTeamName, amount, time: new Date().toLocaleTimeString() },
        ...prev,
      ])
      setFeedbackMsg(`Bid of ₹${amount.toLocaleString()} placed successfully for ${activePlayer?.ign}!`)
      setCustomBidAmount('')
    } catch (e: unknown) {
      if (e instanceof Error) setErrorMsg(e.message)
      else setErrorMsg('Error placing bid')
    } finally {
      setIsSubmittingBid(false)
    }
  }

  // Handle Taking / Acquiring player
  const handleAcquirePlayer = async () => {
    if (!activePlayer) return
    if (!confirm(`Confirm drafting ${activePlayer.ign} to ${myTeamName} for ₹${currentBid.toLocaleString()}?`)) {
      return
    }

    try {
      const res = await fetch(`/api/auctions/${tournamentId}/players/${activePlayer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'sold',
          soldPrice: currentBid,
          soldToTeam: myTeamName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to finalize player draft')

      setFeedbackMsg(`CONGRATULATIONS! ${activePlayer.ign} drafted into ${myTeamName} roster!`)
      loadPlayers()
      loadPurse()
    } catch (e: unknown) {
      if (e instanceof Error) setErrorMsg(e.message)
    }
  }

  // Stream Info for Live Tab
  const streamInfo = parseStreamEmbed(
    tournament?.streamUrl || 'https://www.youtube.com/watch?v=jfKfPfyJRdk'
  )

  // Filtered Candidate Pool
  const filteredPlayers = players.filter((p) => {
    const matchesSearch =
      p.ign.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.role.toLowerCase().includes(searchFilter.toLowerCase())

    const matchesRole = roleFilter === 'all' || p.role.toLowerCase() === roleFilter.toLowerCase()

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'available' && p.status === 'available') ||
      (statusFilter === 'sold' && p.status === 'sold') ||
      (statusFilter === 'unsold' && p.status === 'unsold')

    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. TOP AMBASSADOR & FRANCHISE CREDENTIAL HEADER */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-card via-card to-primary/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary mb-3">
              <Shield className="size-3.5" />
              <span>Official Ambassador & Franchise Bidder Station</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-foreground flex items-center gap-3">
              <span>{myTeamName}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest font-mono">
                Franchise Bidder
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <span>Credentialed for:</span>
              <strong className="text-foreground flex items-center gap-1.5">
                <Trophy className="size-4 text-warning" />
                {tournament?.name || user?.tournamentName || 'Phoenix Grand Auction League'}
              </strong>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-primary font-medium">Free Fire Auction Arena</span>
            </p>
          </div>

          {/* PURSE & BUDGET STATS WIDGET */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-background/60 backdrop-blur border border-border rounded-xl p-3.5 sm:p-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total Purse
              </span>
              <span className="text-base sm:text-lg font-black font-heading text-foreground">
                ₹{allocatedPurse.toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Spent on Squad
              </span>
              <span className="text-base sm:text-lg font-black font-heading text-amber-400">
                ₹{totalSpent.toLocaleString()}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-border pt-2 sm:pt-0 sm:pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Purse Remaining
              </span>
              <span className="text-base sm:text-lg font-black font-heading text-emerald-400">
                ₹{remainingPurse.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS (Strictly: Live Auction, Squad Roster, Watch Live) */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <button
            onClick={() => handleTabChange('auction')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'auction'
                ? 'bg-primary text-background shadow-lg shadow-primary/25'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Gavel className="size-4" />
            <span>Live Auction Bidding Stage</span>
          </button>

          <button
            onClick={() => handleTabChange('squad')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'squad'
                ? 'bg-primary text-background shadow-lg shadow-primary/25'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Users className="size-4" />
            <span>My Franchise Squad Roster ({mySquad.length})</span>
          </button>

          <button
            onClick={() => handleTabChange('live')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'live'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 animate-pulse'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Radio className="size-4" />
            <span>Watch Tournament Live</span>
          </button>

          <div className="ml-auto">
            <Link
              to={`/tournaments/${tournamentId}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition"
            >
              <span>Public Tournament Page</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* FEEDBACK & ALERTS */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg('')}>
            <X className="size-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')}>
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* 2. TAB 1: LIVE AUCTION BIDDING STAGE */}
      {activeTab === 'auction' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: CANDIDATE ON HAMMER & BIDDING CONSOLE (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {activePlayer ? (
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl relative overflow-hidden">
                {/* Status Bar */}
                <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-red-400">
                      ON THE HAMMER NOW
                    </span>
                  </div>

                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    UID: {activePlayer.gameUid}
                  </span>
                </div>

                {/* Candidate Spotlight Card */}
                <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                  <div className="relative shrink-0 mx-auto sm:mx-0">
                    <img
                      src={
                        activePlayer.photoUrl ||
                        'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80'
                      }
                      alt={activePlayer.ign}
                      className="size-28 sm:size-32 rounded-2xl object-cover border-2 border-primary/40 shadow-xl"
                    />
                    <span className="absolute -bottom-2 -right-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary text-background shadow">
                      {activePlayer.role}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {activePlayer.tier || 'Marquee Draft'}
                    </div>

                    <h2 className="text-2xl font-black font-heading text-foreground">
                      {activePlayer.ign}
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium">
                      Real Name: <strong className="text-foreground">{activePlayer.name}</strong>
                    </p>

                    {/* Stats pills */}
                    {activePlayer.stats && (
                      <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                        {activePlayer.stats.kd && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                            K/D: <strong>{activePlayer.stats.kd}</strong>
                          </span>
                        )}
                        {activePlayer.stats.headshotRate && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                            HS Rate: <strong>{activePlayer.stats.headshotRate}</strong>
                          </span>
                        )}
                        {activePlayer.stats.matchesPlayed && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                            Matches: <strong>{activePlayer.stats.matchesPlayed}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {activePlayer.clipUrl && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setPreviewClipUrl(activePlayer.clipUrl || null)}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                        >
                          <Play className="size-3.5 fill-current" />
                          <span>Watch Gameplay Montage Clip</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* CURRENT BID & HAMMER PRICE DISPLAY */}
                <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Base Reserve Price
                      </span>
                      <span className="text-sm sm:text-base font-bold text-muted-foreground font-mono">
                        ₹{activePlayer.basePrice.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                        Current Hammer Bid
                      </span>
                      <span className="text-2xl sm:text-3xl font-black font-heading text-primary font-mono">
                        ₹{currentBid.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* HIGHEST BIDDER NOTIFICATION */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Leading Bidder:</span>
                    {highestBidderTeam ? (
                      <span
                        className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                          isWinningCurrentBid
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isWinningCurrentBid ? (
                          <>
                            <Check className="size-3.5" />
                            <span>Your Team ({highestBidderTeam}) is Leading!</span>
                          </>
                        ) : (
                          <>
                            <Flame className="size-3.5" />
                            <span>{highestBidderTeam}</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No bids placed yet</span>
                    )}
                  </div>
                </div>

                {/* AMBASSADOR BIDDING CONTROLS */}
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Place Official Bid as {myTeamName}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                      Squad: {squadCount} / {maxSquadSize}
                    </span>
                  </div>

                  {isSquadFull ? (
                    <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center gap-3">
                      <CheckCircle2 className="size-6 text-emerald-400 shrink-0" />
                      <div>
                        <h5 className="font-bold text-emerald-400 text-xs uppercase tracking-wide">
                          Squad Complete ({squadCount}/{maxSquadSize} Players Acquired)
                        </h5>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          Your franchise team has successfully drafted all {maxSquadSize} players! Bidding is concluded for your squad. You can review your squad lineup in the Roster tab.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Purse Reserve Gatekeeper Notice */}
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] flex items-start gap-2.5">
                        <Shield className="size-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-400 uppercase tracking-wide text-[10px]">
                              Purse Gatekeeper Constraint
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {remainingSlotsAfter} slots remaining
                            </span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed text-[11px]">
                            You must reserve at least <strong className="text-foreground">₹{requiredReserve.toLocaleString()}</strong> (₹{basePrice.toLocaleString()} base bid × {remainingSlotsAfter} slots) for remaining squad athletes. Maximum permitted bid on this hammer: <strong className="text-amber-400 font-bold font-mono">₹{maxAllowedBid.toLocaleString()}</strong>.
                          </p>
                        </div>
                      </div>

                      {/* Quick Bid Increment Buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[1000, 2500, 5000, 10000].map((inc) => {
                          const targetBid = currentBid + inc
                          const canAfford = targetBid <= maxAllowedBid && !isSquadFull
                          return (
                            <button
                              key={inc}
                              type="button"
                              disabled={!canAfford || isSubmittingBid}
                              onClick={() => handlePlaceBid(targetBid)}
                              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition disabled:opacity-40 disabled:pointer-events-none"
                            >
                              <span className="text-xs font-black text-foreground">+₹{inc.toLocaleString()}</span>
                              <span className="text-[10px] text-muted-foreground">
                                (₹{targetBid.toLocaleString()})
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Custom Bid Input & Submit */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">
                            ₹
                          </span>
                          <input
                            type="number"
                            placeholder={`Max safe bid: ₹${maxAllowedBid.toLocaleString()}`}
                            value={customBidAmount}
                            onChange={(e) => setCustomBidAmount(e.target.value)}
                            className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-border bg-muted text-foreground focus:border-primary focus:outline-none font-mono"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={
                            !customBidAmount ||
                            Number(customBidAmount) <= currentBid ||
                            Number(customBidAmount) > maxAllowedBid ||
                            isSquadFull ||
                            isSubmittingBid
                          }
                          onClick={() => handlePlaceBid(Number(customBidAmount))}
                          className="px-5 py-2 rounded-lg bg-primary font-bold text-xs text-background hover:bg-primary/90 transition disabled:opacity-40"
                        >
                          {isSubmittingBid ? 'Bidding...' : 'Place Bid'}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Take / Finalize Player CTA (When winning) */}
                  {isWinningCurrentBid && activePlayer.status !== 'sold' && (
                    <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-emerald-400">
                          You are currently the highest bidder for {activePlayer.ign}!
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Take player now or await auctioneer hammer drop.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAcquirePlayer}
                        className="px-4 py-2 rounded-lg bg-emerald-500 text-background font-black text-xs hover:bg-emerald-400 transition shadow"
                      >
                        Draft to Squad (Take Player)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl border border-border bg-card text-muted-foreground">
                <Gavel className="size-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">No active candidate on hammer</p>
                <p className="text-xs">Select a player from the pool below to begin bidding.</p>
              </div>
            )}

            {/* LIVE BID HISTORY FEED */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  Live Bid Activity Log
                </h3>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {bidHistory.length} bids recorded
                </span>
              </div>

              <div className="divide-y divide-border max-h-48 overflow-y-auto space-y-1">
                {bidHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No bids recorded for this candidate yet. Place your opening bid above!
                  </p>
                ) : (
                  bidHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="py-2 flex items-center justify-between text-xs hover:bg-muted/30 px-2 rounded transition"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${
                            item.team.toLowerCase() === myTeamName.toLowerCase()
                              ? 'bg-emerald-400'
                              : 'bg-primary'
                          }`}
                        />
                        <span
                          className={`font-semibold ${
                            item.team.toLowerCase() === myTeamName.toLowerCase()
                              ? 'text-emerald-400'
                              : 'text-foreground'
                          }`}
                        >
                          {item.team}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-foreground">
                          ₹{item.amount.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{item.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: REGISTERED DRAFT POOL (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  Auction Candidate Pool ({players.length})
                </h3>
                <button
                  type="button"
                  onClick={loadPlayers}
                  className="text-xs text-muted-foreground hover:text-primary transition flex items-center gap-1"
                >
                  <RefreshCw className="size-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Filters */}
              <div className="space-y-2 mb-4">
                <div className="relative">
                  <Search className="size-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search candidate IGN or role..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-border bg-muted text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="flex-1 py-1 px-2 rounded border border-border bg-muted text-xs text-foreground"
                  >
                    <option value="all">All Roles</option>
                    <option value="Rusher">Rusher</option>
                    <option value="Sniper">Sniper</option>
                    <option value="IGL">IGL</option>
                    <option value="Support">Support</option>
                    <option value="Assaulter">Assaulter</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 py-1 px-2 rounded border border-border bg-muted text-xs text-foreground"
                  >
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="sold">Sold</option>
                    <option value="unsold">Unsold</option>
                  </select>
                </div>
              </div>

              {/* Candidate List */}
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {filteredPlayers.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">
                    No candidates match the filter criteria.
                  </p>
                ) : (
                  filteredPlayers.map((player) => {
                    const isSelected = player.id === activePlayer?.id
                    const isSoldToMe =
                      player.status === 'sold' &&
                      player.soldToTeam?.toLowerCase() === myTeamName.toLowerCase()

                    return (
                      <div
                        key={player.id}
                        onClick={() => {
                          setActivePlayerId(player.id)
                          setCurrentBid(player.soldPrice || player.basePrice)
                          setHighestBidderTeam(player.soldToTeam || '')
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow'
                            : 'border-border bg-muted/30 hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={
                              player.photoUrl ||
                              'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80'
                            }
                            alt={player.ign}
                            className="size-10 rounded-lg object-cover border border-border shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-foreground truncate">
                                {player.ign}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                                {player.role}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground block truncate">
                              Reserve: ₹{player.basePrice.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {player.status === 'sold' ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isSoldToMe
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {isSoldToMe ? 'In Your Squad' : `Sold (${player.soldToTeam})`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                              Available
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: MY FRANCHISE SQUAD ROSTER */}
      {activeTab === 'squad' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 mb-6">
              <div>
                <h2 className="text-xl font-black font-heading text-foreground flex items-center gap-2">
                  <Crown className="size-5 text-warning" />
                  <span>{myTeamName} Squad Roster</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Players successfully acquired during the live player auction for {tournament?.name || 'Championship'}.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Squad Status
                  </span>
                  <span className="text-sm font-black text-foreground">
                    {mySquad.length} / 4 Core Players Drafted
                  </span>
                </div>
              </div>
            </div>

            {mySquad.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-dashed border-border bg-muted/20">
                <Users className="size-12 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="text-base font-bold text-foreground">No Players Acquired Yet</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Go to the <strong>Live Auction Bidding Stage</strong> tab to place bids on registered candidates and draft players into your franchise squad!
                </p>
                <button
                  type="button"
                  onClick={() => handleTabChange('auction')}
                  className="mt-4 px-4 py-2 rounded-lg bg-primary text-background font-bold text-xs shadow hover:bg-primary/90 transition"
                >
                  Go to Auction Bidding Stage
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mySquad.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-xl border border-emerald-500/30 bg-card p-4 shadow relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={
                          player.photoUrl ||
                          'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80'
                        }
                        alt={player.ign}
                        className="size-14 rounded-xl object-cover border border-emerald-500/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {player.role}
                        </span>
                        <h4 className="text-base font-black font-heading text-foreground truncate mt-1">
                          {player.ign}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">{player.name}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Winning Bid</span>
                        <span className="font-mono font-bold text-emerald-400">
                          ₹{(player.soldPrice || player.basePrice).toLocaleString()}
                        </span>
                      </div>

                      {player.clipUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewClipUrl(player.clipUrl || null)}
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                        >
                          <Play className="size-3 fill-current" />
                          <span>View Clip</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 3: WATCH TOURNAMENT LIVE */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 mb-5">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold text-red-500 mb-1">
                  <Radio className="size-4 animate-pulse" />
                  <span>OFFICIAL TOURNAMENT BROADCAST</span>
                </div>
                <h2 className="text-xl font-black font-heading text-foreground">
                  {tournament?.name || 'Championship Live Arena'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Official creator live stream & match broadcast station.
                </p>
              </div>

              <Link
                to={`/tournaments/${tournamentId}?tab=live`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-background font-bold text-xs hover:bg-primary/90 transition shadow"
              >
                <span>Open Tournament Theater</span>
                <ExternalLink className="size-3.5" />
              </Link>
            </div>

            {/* Video Player */}
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-border shadow-2xl relative">
              {streamInfo.isValid && streamInfo.embedUrl ? (
                <iframe
                  src={streamInfo.embedUrl}
                  title="Official Tournament Live Stream"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <Radio className="size-12 mb-3 text-red-500 opacity-60" />
                  <p className="text-base font-bold text-foreground">Live Stream Scheduled</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    The tournament creator will broadcast live matches here once room matches begin.
                  </p>
                </div>
              )}
            </div>

            {/* Broadcast Details */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Broadcast Host
                </span>
                <span className="font-semibold text-foreground">
                  {tournament?.creatorName || 'Clashers Esports Org'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Format & Game
                </span>
                <span className="font-semibold text-foreground">
                  {tournament?.game || 'Free Fire'} • {tournament?.format || 'Auction Tournament'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Stream Status
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  Broadcast Online
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO PREVIEW MODAL */}
      <AnimatePresence>
        {previewClipUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl rounded-2xl border border-border bg-card p-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Play className="size-4 text-primary fill-current" />
                  Candidate Gameplay Montage Preview
                </span>
                <button
                  onClick={() => setPreviewClipUrl(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-border">
                {(() => {
                  const clipEmbed = parseStreamEmbed(previewClipUrl)
                  return clipEmbed.isValid && clipEmbed.embedUrl ? (
                    <iframe
                      src={clipEmbed.embedUrl}
                      title="Player Montage"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      Direct video URL: <a href={previewClipUrl} target="_blank" rel="noreferrer" className="text-primary underline ml-1">{previewClipUrl}</a>
                    </div>
                  )
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
