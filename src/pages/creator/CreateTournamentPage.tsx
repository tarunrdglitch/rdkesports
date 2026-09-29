import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Gamepad2,
  Calendar,
  Layers,
  IndianRupee,
  QrCode,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  Copy,
  Info,
  Shield,
  Crosshair,
  Target,
  Zap,
  Users,
  UserCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/stores/authStore'

const GAMES = [
  {
    id: 'Free Fire',
    name: 'Free Fire MAX',
    popularFormat: 'Battle Royale, Clash Squad & IPL Auction',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    color: 'from-amber-600 to-red-600',
  },
]

export interface TournamentFormatOption {
  id: string
  name: string
  shortLabel: string
  category: 'primary' | 'classic'
  badge: string
  badgeColor: string
  icon?: string
  desc: string
  defaultTeamSize: number
  defaultMaxTeams: number
  rulesPreset: string
  highlights?: string[]
}

const FORMATS: TournamentFormatOption[] = [
  {
    id: 'Auction Tournament',
    name: 'IPL-Style Live Player Auction',
    shortLabel: 'Auction Arena',
    category: 'primary',
    badge: 'Solo Draft Pool',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    desc: 'Individual solo players register into the auction candidate pool. Franchise team owners bid with virtual purse tokens.',
    defaultTeamSize: 1,
    defaultMaxTeams: 48,
    rulesPreset:
      '1. Individual Solo Registration: All participants register as solo players (1 player per slot) into the auction candidate pool.\n2. Franchise owners bid on individual players using their allocated virtual token purse.\n3. Each franchise drafts players to form their final tournament squad.\n4. Toxic behaviour during live bidding results in instant purse penalty.',
    highlights: ['1 Player / Slot (Solo)', 'Individual Auction Slots', 'Live Token Purse Draft'],
  },
  {
    id: 'BR Squad',
    name: 'Battle Royale (BR Squad)',
    shortLabel: 'BR Squad',
    category: 'primary',
    badge: '4v4v4 Multi-Squad',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    desc: 'Full 48-player map lobby with 4-player squads. Multi-match placement points + kill points table.',
    defaultTeamSize: 4,
    defaultMaxTeams: 48,
    rulesPreset:
      '1. Standard Battle Royale placement points (1st: 12pts, 2nd: 9pts, 3rd: 8pts, 4th: 7pts...) + 1 pt per kill.\n2. All 4 squad members must screen-record gameplay.\n3. Emulators, iPad view, and GFX tools strictly prohibited.\n4. Room ID & password will be shared 15 minutes before match drop.',
    highlights: ['4-Player Squads', '12/24/48 Teams', 'Official Points Matrix'],
  },
  {
    id: 'BR Solo',
    name: 'Battle Royale (BR Solo)',
    shortLabel: 'BR Solo',
    category: 'primary',
    badge: '1vAll Solo Survival',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    desc: 'Every player for themselves. 48-player solo lobby survival with solo placement and kill points matrix.',
    defaultTeamSize: 1,
    defaultMaxTeams: 48,
    rulesPreset:
      '1. Solo Battle Royale survival: 1 player per registration.\n2. Teaming up or collaboration in solo lobby leads to immediate permanent ban.\n3. 1 point per kill + solo placement points matrix (1st: 12pts, 2nd: 9pts, etc.).\n4. Device gameplay recording is mandatory.',
    highlights: ['1 Player / Team (Solo)', '48 Players / Lobby', 'Anti-Teaming Strict'],
  },
  {
    id: 'CS Squad No Rules',
    name: 'Clash Squad (CS Squad - No Rules)',
    shortLabel: 'CS No Rules',
    category: 'primary',
    badge: '4v4 No Restrictions',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    desc: '4v4 Clash Squad custom room with no weapon or item restrictions. Gun attributes ON, character skills ON, all grenades allowed.',
    defaultTeamSize: 4,
    defaultMaxTeams: 16,
    rulesPreset:
      '1. 4v4 Clash Squad custom room.\n2. Gun Attributes: ON.\n3. Character Skills: ON.\n4. All weapons, throwables & grenades allowed.\n5. Standard round win condition (First to 7 rounds wins).',
    highlights: ['Gun Attributes ON', 'Character Skills ON', 'All Weapons & Grenades'],
  },
  {
    id: 'CS Squad Limited',
    name: 'Clash Squad (CS Squad - Limited)',
    shortLabel: 'CS Limited',
    category: 'primary',
    badge: '4v4 Limited Ammo',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    desc: 'Official competitive 4v4 Clash Squad rules. Gun attributes OFF, Limited Ammo ON, Grenades & Smoke strictly prohibited.',
    defaultTeamSize: 4,
    defaultMaxTeams: 16,
    rulesPreset:
      '1. 4v4 Clash Squad custom room with official competitive rules.\n2. Gun Attributes: OFF (Fair play).\n3. Limited Ammo: ON (Yes).\n4. Grenades, Flashbangs & Smoke: STRICTLY BANNED.\n5. Rooftop camping or zone glitching will result in round forfeiture.',
    highlights: ['Gun Attributes OFF', 'Limited Ammo ON', 'Grenades & Smoke Banned'],
  },
  {
    id: 'CS Squad One Tap',
    name: 'Clash Squad (CS Squad - One Tap)',
    shortLabel: 'CS One Tap',
    category: 'primary',
    badge: '4v4 Headshot Only',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    desc: 'Hardcore 4v4 aim showcase. Desert Eagle, M1887, Woodpecker one-tap headshots only. Body spray and spam prohibited.',
    defaultTeamSize: 4,
    defaultMaxTeams: 16,
    rulesPreset:
      '1. 4v4 Clash Squad - Pure One-Tap / Headshot showmatch.\n2. Allowed weapons: Desert Eagle, M1887, Woodpecker (Single shot only).\n3. Body spray, SMG spray, or spam shooting is strictly forbidden.\n4. Mandatory screen recording by all players with touch gestures enabled.',
    highlights: ['Desert Eagle & M1887 Only', 'Headshot Only', 'No Body Spray Allowed'],
  },
  {
    id: 'Knockout',
    name: 'Single Elimination (Knockout)',
    shortLabel: 'Knockout',
    category: 'classic',
    badge: 'Bracket Knockout',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    desc: 'Loser is eliminated immediately. Best for fast-paced weekend cups.',
    defaultTeamSize: 4,
    defaultMaxTeams: 32,
    rulesPreset:
      '1. Single elimination bracket match.\n2. Loser is eliminated immediately.\n3. Match winner advances to next round.\n4. Screenshots of final scoreboard must be submitted within 10 minutes.',
    highlights: ['Direct Elimination', 'Fast Progression', '1v1 Matchups'],
  },
  {
    id: 'League + Playoffs',
    name: 'League + Playoffs',
    shortLabel: 'League',
    category: 'classic',
    badge: 'Round Robin',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    desc: 'Group stage round-robin followed by top 4/8 championship playoff bracket.',
    defaultTeamSize: 4,
    defaultMaxTeams: 32,
    rulesPreset:
      '1. Group stage round-robin.\n2. Top 2 teams from each group qualify for playoffs.\n3. Tiebreakers decided by head-to-head record followed by round differential.',
    highlights: ['Group Stages', 'Playoff Brackets', 'Grand Finals'],
  },
  {
    id: 'Scrim',
    name: 'Daily Competitive Scrims',
    shortLabel: 'Daily Scrims',
    category: 'classic',
    badge: 'Practice Scrim',
    badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
    desc: 'Tier-1 practice scrims with rotating room slots and automated point tallying.',
    defaultTeamSize: 4,
    defaultMaxTeams: 24,
    rulesPreset:
      '1. Tier-1 practice scrims.\n2. Slot rotation every match.\n3. Point tallying updated after each map.\n4. Slots revoked if squad is absent for 2 consecutive maps.',
    highlights: ['Rotating Slots', 'Daily Practice', 'Live Leaderboard'],
  },
]

export default function CreateTournamentPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role === 'ambassador') {
      navigate('/ambassador/dashboard', { replace: true })
    }
  }, [user, navigate])

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [game, setGame] = useState('Free Fire')
  const [name, setName] = useState('')
  const [formatCategory, setFormatCategory] = useState<'primary' | 'classic'>('primary')
  const [format, setFormat] = useState('Auction Tournament')
  const [maxTeams, setMaxTeams] = useState<number | string>(48)
  const [teamSize, setTeamSize] = useState<number | string>(1)
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  )
  const [prizePool, setPrizePool] = useState('50000')
  const [prizeBreakdown, setPrizeBreakdown] = useState('1st: ₹25,000 | 2nd: ₹15,000 | 3rd: ₹7,000 | MVP: ₹3,000')
  const [isPaid, setIsPaid] = useState(true)
  const [entryFee, setEntryFee] = useState('150')
  const [upiId, setUpiId] = useState('clasherslive@okaxis')
  const [upiName, setUpiName] = useState(user?.organizationName || 'RDK Esports Partner')
  const [rules, setRules] = useState(
    '1. Franchise owners will bid on registered players using an allocated virtual purse.\n2. Each franchise team drafts a full squad from the registered candidate pool.\n3. Live hammer sequence & purse deductions managed by RDK Auction Arena.\n4. Toxic behaviour during live bidding results in instant purse penalty.'
  )
  const [communityLink, setCommunityLink] = useState('https://discord.gg/rdkesports')

  const selectedFormatData = FORMATS.find((f) => f.id === format) || FORMATS[0]

  const handleSelectFormat = (f: TournamentFormatOption) => {
    setFormat(f.id)
    setTeamSize(f.defaultTeamSize)
    setMaxTeams(f.defaultMaxTeams)
    setRules(f.rulesPreset)
  }

  // Auto-computed preview QR URL
  const qrCodeUrl = upiId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(
        upiId
      )}&pn=${encodeURIComponent(upiName)}&am=${entryFee}&cu=INR`
    : ''

  const selectedGameData = GAMES.find((g) => g.id === game) || GAMES[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please provide a tournament name')
      setStep(1)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const payload = {
        name: name.trim(),
        game,
        format,
        maxTeams: Number(maxTeams) || 48,
        teamSize: format === 'Auction Tournament' || Number(teamSize) === 1 ? 'Solo' : Number(teamSize) === 2 ? 'Duo' : Number(teamSize) === 4 ? 'Squad' : `${teamSize} Players`,
        playersPerTeam: format === 'Auction Tournament' ? 1 : (Number(teamSize) || 4),
        prizePool: prizePool ? `₹${prizePool}` : '₹0',
        entryFee: isPaid
          ? format === 'Auction Tournament' || Number(teamSize) === 1
            ? `₹${entryFee} / Player`
            : `₹${entryFee} / Team`
          : 'Free',
        startDate,
        banner: selectedGameData.banner,
        upiId: isPaid ? upiId : undefined,
        upiName: isPaid ? upiName : undefined,
        upiQrUrl: isPaid ? qrCodeUrl : undefined,
        rules,
        creatorId: user?.organizationId || 'cr_clashers',
        creatorName: user?.name || 'Official Creator',
        creatorHandle: user?.creatorProfile?.handle || '@official',
      }

      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create tournament')
      }

      // Redirect to newly created tournament management room
      navigate(`/creator/tournaments/${data.tournament.id}/manage`)
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to create tournament')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-4 px-2 sm:px-4">
      <PageHeader
        title="Create Tournament"
        description="Launch a high-stakes esports championship with automated brackets and manual UPI payment verification."
        actions={
          <Link
            to="/creator/dashboard"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded px-3 py-1.5"
          >
            Back to Dashboard
          </Link>
        }
      />

      {/* Progress Steps Header */}
      <div className="mb-8 mt-4 grid grid-cols-4 gap-2 border-b border-border pb-4">
        {[
          { stepNum: 1, label: 'Game & Title', icon: Gamepad2 },
          { stepNum: 2, label: 'Format & Size', icon: Layers },
          { stepNum: 3, label: 'Prize & UPI QR', icon: IndianRupee },
          { stepNum: 4, label: 'Rules & Launch', icon: ShieldCheck },
        ].map((item) => {
          const Icon = item.icon
          const isActive = step === item.stepNum
          const isDone = step > item.stepNum
          return (
            <button
              key={item.stepNum}
              type="button"
              onClick={() => setStep(item.stepNum)}
              className={`flex flex-col sm:flex-row items-center gap-2 p-2 rounded text-left transition-all ${
                isActive
                  ? 'bg-primary/10 border-l-2 border-primary text-primary font-bold'
                  : isDone
                  ? 'text-foreground hover:bg-muted/50'
                  : 'text-muted-foreground opacity-60'
              }`}
            >
              <div
                className={`size-6 rounded-full flex items-center justify-center text-xs ${
                  isDone
                    ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                    : isActive
                    ? 'bg-primary text-background font-bold'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? <CheckCircle2 className="size-3.5" /> : item.stepNum}
              </div>
              <div className="text-[11px] sm:text-xs">
                <span className="hidden sm:inline font-medium">{item.label}</span>
              </div>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* STEP 1: Game & Title */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                1. Select Game Title
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 max-w-md gap-3">
                {GAMES.map((g) => {
                  const isSelected = game === g.id
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGame(g.id)}
                      className={`relative p-3.5 rounded-lg border text-left transition-all overflow-hidden ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary'
                          : 'border-border bg-card hover:border-border-strong hover:bg-muted/30'
                      }`}
                    >
                      <Gamepad2 className="size-6 mb-1.5 text-primary" />
                      <div className="font-heading font-bold text-sm text-foreground">{g.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{g.popularFormat}</div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Tournament Championship Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tamil Titans Cup Season 5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Will appear prominently on the public tournament hub and creator portfolio.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Tournament Start Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                  <Calendar className="absolute right-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Banner Preview */}
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="h-32 w-full relative">
                <img
                  src={selectedGameData.banner}
                  alt={selectedGameData.name}
                  className="w-full h-full object-cover brightness-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary text-background">
                    {game} Official Tournament
                  </span>
                  <h4 className="font-heading font-black text-lg text-white mt-1">
                    {name || 'Your Tournament Championship'}
                  </h4>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Format & Structure */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Tournament Format & Progression
                </label>
                <div className="flex items-center gap-1.5 p-1 bg-muted/50 border border-border rounded-lg text-xs self-start">
                  <button
                    type="button"
                    onClick={() => setFormatCategory('primary')}
                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                      formatCategory === 'primary'
                        ? 'bg-primary text-background shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Esports Formats (6)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormatCategory('classic')}
                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                      formatCategory === 'classic'
                        ? 'bg-primary text-background shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Classic Brackets (3)
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {FORMATS.filter((f) => f.category === formatCategory).map((f) => {
                  const isSelected = format === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleSelectFormat(f)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between overflow-hidden ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-md'
                          : 'border-border bg-card hover:border-border-strong hover:bg-muted/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-end gap-2 mb-2">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${f.badgeColor}`}
                          >
                            {f.badge}
                          </span>
                        </div>
                        <h4 className="font-heading font-bold text-sm text-foreground leading-snug">
                          {f.name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">
                          {f.desc}
                        </p>
                      </div>

                      {f.highlights && (
                        <div className="flex flex-wrap gap-1 mt-3 pt-2.5 border-t border-border/50">
                          {f.highlights.map((h, i) => (
                            <span
                              key={i}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/70 text-muted-foreground"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quick format details & rules sync banner */}
            {selectedFormatData && (
              <div className="p-3 bg-card border border-border rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="font-bold text-foreground">{selectedFormatData.name}</span>
                    <span className="text-muted-foreground ml-2">
                      {format === 'Auction Tournament'
                        ? `(Individual Solo Draft, ${maxTeams} Slots)`
                        : `(Recommended: ${selectedFormatData.defaultTeamSize === 1 ? 'Solo' : 'Squad'}, ${selectedFormatData.defaultMaxTeams} Teams)`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRules(selectedFormatData.rulesPreset)}
                  className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-semibold text-foreground border border-border transition-colors"
                >
                  Re-apply Format Rules Preset
                </button>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {format === 'Auction Tournament'
                      ? 'Total Auction Slots (Individual Players)'
                      : format === 'BR Solo'
                      ? 'Maximum Solo Players'
                      : 'Maximum Registered Teams'}
                  </label>
                  <span className="text-[11px] font-mono font-bold text-primary">
                    {maxTeams || 0} {format === 'Auction Tournament' ? 'Individual Slots' : format === 'BR Solo' ? 'Solo Slots' : 'Teams'}
                  </span>
                </div>
                <input
                  type="number"
                  min="2"
                  max="1000"
                  value={maxTeams}
                  onChange={(e) => setMaxTeams(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                  placeholder={
                    format === 'Auction Tournament'
                      ? 'Enter number of individual player slots (e.g. 24, 48, 60, 80...)'
                      : 'Enter custom number of teams (e.g. 12, 16, 24, 32...)'
                  }
                  className="w-full bg-card border border-border rounded px-3 py-2 text-sm text-foreground font-semibold focus:outline-none focus:border-primary"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Quick Presets:</span>
                  {(format === 'Auction Tournament'
                    ? [24, 48, 60, 80, 100, 120]
                    : format === 'BR Squad' || format === 'BR Solo'
                    ? [12, 24, 48, 96]
                    : [8, 12, 16, 24, 32, 64]
                  ).map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxTeams(num)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition ${
                        Number(maxTeams) === num
                          ? 'bg-primary text-background border-primary font-bold'
                          : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {num} {format === 'Auction Tournament' ? 'Slots' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {format === 'Auction Tournament'
                      ? 'Auction Entry Type (Individual Solo Draft)'
                      : 'Team Composition (Players per Team)'}
                  </label>
                  <span className="text-[11px] font-mono font-bold text-primary">
                    {format === 'Auction Tournament'
                      ? 'Solo Player (Individual Slot)'
                      : Number(teamSize) === 1
                      ? 'Solo (1 Player)'
                      : Number(teamSize) === 2
                      ? 'Duo (2 Players)'
                      : Number(teamSize) === 3
                      ? 'Trio (3 Players)'
                      : Number(teamSize) === 4
                      ? 'Squad (4 Players)'
                      : Number(teamSize) === 5
                      ? '5v5 Competitive'
                      : `${teamSize || 0} Players / Team`}
                  </span>
                </div>
                {format === 'Auction Tournament' ? (
                  <div className="rounded border border-primary/30 bg-primary/10 p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <UserCheck className="size-4" /> Individual Solo Registrations
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        All participants register as solo players into the draft candidate pool. Slots are individual.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold bg-primary text-background px-2.5 py-1 rounded font-mono shrink-0">
                      1 Player / Slot
                    </span>
                  </div>
                ) : (
                  <>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                      placeholder="Enter custom number of players (e.g. 1, 2, 4, 5...)"
                      className="w-full bg-card border border-border rounded px-3 py-2 text-sm text-foreground font-semibold focus:outline-none focus:border-primary"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Quick Presets:</span>
                      {[
                        { count: 1, label: '1 (Solo)' },
                        { count: 2, label: '2 (Duo)' },
                        { count: 3, label: '3 (Trio)' },
                        { count: 4, label: '4 (Squad)' },
                        { count: 5, label: '5 (5v5)' },
                      ].map((p) => (
                        <button
                          key={p.count}
                          type="button"
                          onClick={() => setTeamSize(p.count)}
                          className={`text-[11px] px-2 py-0.5 rounded border transition ${
                            Number(teamSize) === p.count
                              ? 'bg-primary text-background border-primary font-bold'
                              : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mode-Specific Guidelines Alert */}
            {format === 'Auction Tournament' && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                <Sparkles className="size-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200">
                  <p className="font-bold text-amber-300">IPL-Style Auction Arena: Individual Solo Player Draft</p>
                  <p className="mt-0.5 text-muted-foreground leading-relaxed">
                    All participants register as <strong>individual solo players</strong> with their own slot, IGN, Game UID, and role into the candidate pool. Franchise owners bid on registered candidates using purse tokens in the Live Auction Room.
                  </p>
                </div>
              </div>
            )}

            {format === 'BR Squad' && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-3">
                <Users className="size-5 shrink-0 text-emerald-400 mt-0.5" />
                <div className="text-xs text-emerald-200">
                  <p className="font-bold text-emerald-300">Battle Royale (Squad) Points Matrix</p>
                  <p className="mt-0.5 text-muted-foreground leading-relaxed">
                    Multi-match 48-player map lobbies with 4-player squads. Teams accumulate placement points and +1 kill point per elimination. Scores are calculated automatically per round.
                  </p>
                </div>
              </div>
            )}

            {format === 'BR Solo' && (
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-start gap-3">
                <Target className="size-5 shrink-0 text-cyan-400 mt-0.5" />
                <div className="text-xs text-cyan-200">
                  <p className="font-bold text-cyan-300">Battle Royale (Solo) Survival</p>
                  <p className="mt-0.5 text-muted-foreground leading-relaxed">
                    Solo format with exactly 1 player per registration. Registrations do not require squad teammates. Teaming up in solo lobbies triggers immediate disqualification and ban.
                  </p>
                </div>
              </div>
            )}

            {format === 'CS Squad No Rules' && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-3">
                <Crosshair className="size-5 shrink-0 text-orange-400 mt-0.5" />
                <div className="text-xs text-orange-200">
                  <p className="font-bold text-orange-300">Clash Squad (CS Squad - No Rules) Room Rules</p>
                  <p className="mt-0.5 text-muted-foreground leading-relaxed">
                    Standard custom room with Gun Attributes ON, Character Skills ON, and throwables allowed. 4v4 round-based elimination with standard first-to-7 round win condition.
                  </p>
                </div>
              </div>
            )}

            {format === 'CS Squad Limited' && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-start gap-3">
                <Shield className="size-5 shrink-0 text-purple-400 mt-0.5" />
                <div className="text-xs text-purple-200">
                  <p className="font-bold text-purple-300">Clash Squad (CS Squad - Limited) Competitive Rules</p>
                  <p className="mt-0.5 text-muted-foreground leading-relaxed">
                    Official fair-play setting: Gun Attributes OFF, Limited Ammo ON, Grenades & Smoke Banned. Pure tactical gunplay with no pay-to-win attribute advantages.
                  </p>
                </div>
              </div>
            )}

            {format === 'CS Squad One Tap' && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-3">
                <Zap className="size-5 shrink-0 text-rose-400 mt-0.5" />
                <div className="text-xs text-rose-200">
                  <p className="font-bold text-rose-300">Clash Squad (CS Squad - One Tap) Aim Masters</p>
                  <p className="mt-0.5 text-muted-foreground leading-relaxed">
                    Strict Headshot Only showmatch with Desert Eagle, M1887, and Woodpecker. Body spray, spray weapons, or spam shooting results in immediate round forfeiture. Screen recording mandatory.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 3: Prize Pool & UPI QR Configuration */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Total Prize Pool (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-muted-foreground font-bold">₹</span>
                  <input
                    type="number"
                    value={prizePool}
                    onChange={(e) => setPrizePool(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-card border border-border rounded pl-8 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Prize Distribution Breakdown
                </label>
                <input
                  type="text"
                  value={prizeBreakdown}
                  onChange={(e) => setPrizeBreakdown(e.target.value)}
                  placeholder="1st: ₹25K | 2nd: ₹15K | 3rd: ₹7K | MVP: ₹3K"
                  className="w-full bg-card border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Entry Fee & UPI Setup */}
            <div className="p-4 border border-border rounded-lg bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-bold text-sm text-foreground">Registration Entry Fee</h4>
                  <p className="text-xs text-muted-foreground">
                    Choose whether this event is free or requires paid UPI verification.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPaid(false)}
                    className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${
                      !isPaid ? 'bg-primary text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    Free Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPaid(true)}
                    className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${
                      isPaid ? 'bg-primary text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    Paid (Manual UPI QR)
                  </button>
                </div>
              </div>

              {isPaid && (
                <div className="pt-4 border-t border-border grid sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Entry Fee Per Team (₹ INR)
                      </label>
                      <input
                        type="number"
                        value={entryFee}
                        onChange={(e) => setEntryFee(e.target.value)}
                        placeholder="150"
                        className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Organizer UPI ID *
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. yourname@okaxis or business@paytm"
                        className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Account / Business Name
                      </label>
                      <input
                        type="text"
                        value={upiName}
                        onChange={(e) => setUpiName(e.target.value)}
                        placeholder="e.g. Clashers Esports Org"
                        className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Live UPI QR Preview */}
                  <div className="flex flex-col items-center justify-center p-4 border border-border rounded-lg bg-background">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Live UPI QR Preview
                    </p>
                    <div className="p-2 bg-white rounded-lg shadow-md">
                      <img src={qrCodeUrl} alt="UPI QR" className="size-36 object-contain" />
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-xs font-bold text-foreground">{upiName}</p>
                      <p className="text-[11px] font-mono text-primary">{upiId}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">₹{entryFee} per registration</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 4: Rules & Final Review */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Official Rules & Fair Play Regulations
                </label>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">Load Rule Preset:</span>
                  {FORMATS.filter((f) => f.category === 'primary').map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setRules(f.rulesPreset)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition ${
                        format === f.id
                          ? 'bg-primary/20 text-primary border-primary/40 font-bold'
                          : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {f.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={6}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs leading-relaxed text-foreground font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Captain Discord / WhatsApp Group Link
              </label>
              <input
                type="url"
                value={communityLink}
                onChange={(e) => setCommunityLink(e.target.value)}
                placeholder="https://discord.gg/..."
                className="w-full bg-card border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* Final Launch Summary Card */}
            <div className="p-5 border border-primary/30 rounded-lg bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Sparkles className="size-4" />
                <span>Ready to Launch Championship</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Game</span>
                  <span className="font-semibold text-foreground">{game}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Format</span>
                  <span className="font-semibold text-foreground">{format}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Prize Pool</span>
                  <span className="font-semibold text-primary font-heading text-sm">₹{prizePool}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Entry Fee</span>
                  <span className="font-semibold text-foreground">{isPaid ? `₹${entryFee}` : 'Free'}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground border border-border rounded px-4 py-2 transition-colors"
            >
              <ChevronLeft className="size-4" />
              Previous
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !name.trim()) {
                  setError('Please provide a tournament title before proceeding')
                  return
                }
                setError('')
                setStep(step + 1)
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-background bg-primary hover:bg-primary/90 rounded px-5 py-2.5 transition-colors shadow-[0_0_15px_rgba(255,46,0,0.3)]"
            >
              Next Step
              <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 text-xs font-bold text-background bg-primary hover:bg-primary/90 disabled:opacity-50 rounded px-6 py-2.5 transition-all shadow-[0_0_20px_rgba(255,46,0,0.4)]"
            >
              {isSubmitting ? (
                <>
                  <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  Publishing Tournament...
                </>
              ) : (
                <>
                  <Trophy className="size-4" />
                  Publish Tournament Now
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
