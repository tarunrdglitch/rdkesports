import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  ShieldCheck,
  Users,
  QrCode,
  Gavel,
  ArrowRight,
  Flame,
  CheckCircle2,
  Calendar,
  Gamepad2,
  Youtube,
  Instagram,
  MessageSquare,
  Star,
  Target,
  Swords,
  Crown,
  ChevronRight,
  TrendingUp,
  Award,
} from 'lucide-react'
import { tournamentService } from '@/services/api/tournamentService'
import { creatorService } from '@/services/api/creatorService'
import { useAuth } from '@/stores/authStore'
import { useAuthModal, setAuthModalNavigate } from '@/stores/authModalStore'
import { AuthModal } from '@/components/auth/AuthModal'
import { homeFor } from '@/app/config/roles'
import type { Tournament, PlatformStats } from '@/types'

// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// OFFICIAL CREATORS — Default & Dynamic Partners
// ═══════════════════════════════════════════════════════════════
const DEFAULT_CREATORS = [
  {
    id: 'rdk_head',
    name: 'RDK Esports',
    handle: '@rdkesports',
    title: 'Platform Head & Tournament Director',
    photo: '/creator-rdk.png',
    subscribers: '12K+ Community',
    bio: 'The architect behind RDK Esports — running high-stakes tournaments, IPL-style player auctions, and building the next generation of South Indian competitive gaming.',
    games: ['Free Fire', 'BGMI', 'Valorant'],
    activeTournaments: 3,
    totalTournaments: 36,
    verified: true,
    rank: 1,
    accentColor: '#FF4D2D',
    socials: {
      youtube: 'https://youtube.com/@rdkesports',
      instagram: 'https://instagram.com/rdkesports',
      discord: 'https://discord.gg/rdkesports',
    },
  },
]
const OFFICIAL_CREATORS = DEFAULT_CREATORS

// ═══════════════════════════════════════════════════════════════
// Animation variants
// ═══════════════════════════════════════════════════════════════
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay } },
})
const cardVariant = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function SectionLabel({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="badge-primary inline-flex mb-4 text-xs">
      <Icon className="size-3.5" />
      {text}
    </div>
  )
}

function AnimatedSection({ children, className = '', id = '' }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.section
      id={id}
      ref={ref}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      className={className}
    >
      {children}
    </motion.section>
  )
}

// ═══════════════════════════════════════════════════════════════
// Creator Card Component
// ═══════════════════════════════════════════════════════════════
function CreatorCard({ creator, index }: { creator: typeof OFFICIAL_CREATORS[0]; index: number }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      variants={cardVariant}
      custom={index}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="creator-card relative rounded-xl border border-border bg-card overflow-hidden flex flex-col group cursor-default"
      style={{
        boxShadow: hovered ? `0 0 30px ${creator.accentColor}22, 0 4px 24px rgba(0,0,0,0.4)` : '0 2px 12px rgba(0,0,0,0.25)',
        borderColor: hovered ? `${creator.accentColor}55` : undefined,
        transition: 'box-shadow 0.35s ease, border-color 0.35s ease',
      }}
    >
      {/* Rank badge */}
      <div
        className="absolute top-4 right-4 z-20 flex size-8 items-center justify-center rounded-full text-xs font-black"
        style={{ background: `${creator.accentColor}22`, border: `1.5px solid ${creator.accentColor}60`, color: creator.accentColor }}
      >
        #{creator.rank}
      </div>

      {/* Photo area — tall portrait format */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '3/4', maxHeight: '340px' }}>
        <motion.img
          src={creator.photo}
          alt={creator.name}
          className="w-full h-full object-cover object-center"
          animate={{ scale: hovered ? 1.05 : 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Bottom gradient fade */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, hsl(220 18% 8%) 0%, hsl(220 18% 8% / 0.5) 40%, transparent 75%)',
          }}
        />

        {/* Game tags floating on photo */}
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5 z-10">
          {creator.games.map((g: string) => (
            <span
              key={g}
              className="rounded-md border border-white/10 bg-background/70 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white/90"
            >
              {g}
            </span>
          ))}
        </div>

        {/* Verified badge */}
        {creator.verified && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-primary/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-white">
            <ShieldCheck className="size-3" />
            VERIFIED PARTNER
          </div>
        )}

        {/* Accent glow overlay on hover */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.35 }}
          style={{
            background: `radial-gradient(ellipse at 50% 100%, ${creator.accentColor}18 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col p-5">
        {/* Name & handle */}
        <div className="mb-3">
          <h3 className="font-display text-xl text-foreground leading-tight">
            {creator.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground font-mono">{creator.handle}</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${creator.accentColor}18`, color: creator.accentColor }}
            >
              {creator.subscribers}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{creator.title}</p>
        </div>

        {/* Bio */}
        <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-3">
          {creator.bio}
        </p>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div className="text-center">
            <p className="font-display text-2xl font-bold" style={{ color: creator.accentColor }}>
              {creator.activeTournaments}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Active Now</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-foreground">{creator.totalTournaments}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total Hosted</p>
          </div>
        </div>

        {/* Social buttons */}
        <div className="mt-4 flex items-center gap-2">
          {creator.socials.youtube && (
            <a
              href={creator.socials.youtube}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/60 py-2 text-[11px] font-semibold text-muted-foreground hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all duration-200"
            >
              <Youtube className="size-3.5" />
              YouTube
            </a>
          )}
          {creator.socials.instagram && (
            <a
              href={creator.socials.instagram}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/60 py-2 text-[11px] font-semibold text-muted-foreground hover:text-purple-400 hover:border-purple-500/40 hover:bg-purple-500/10 transition-all duration-200"
            >
              <Instagram className="size-3.5" />
              Instagram
            </a>
          )}
          {creator.socials.discord && (
            <a
              href={creator.socials.discord}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/60 py-2 text-[11px] font-semibold text-muted-foreground hover:text-indigo-400 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all duration-200"
            >
              <MessageSquare className="size-3.5" />
              Discord
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function getFormatBadge(fmt: string) {
  if (fmt === 'Auction Tournament' || fmt.toLowerCase().includes('auction')) {
    return { label: 'Auction', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
  }
  if (fmt === 'BR Squad') {
    return { label: 'BR Squad', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
  }
  if (fmt === 'BR Solo') {
    return { label: 'BR Solo', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' }
  }
  if (fmt === 'CS Squad No Rules') {
    return { label: 'CS No Rules', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' }
  }
  if (fmt === 'CS Squad Limited') {
    return { label: 'CS Limited', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' }
  }
  if (fmt === 'CS Squad One Tap') {
    return { label: 'CS One Tap', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' }
  }
  return { label: fmt, color: 'bg-primary/10 text-primary border-primary/20' }
}

function formatOverallPrizePool(prizePool: string | undefined): string {
  if (!prizePool) return '₹0'
  const trimmed = prizePool.trim()
  if (!trimmed.includes(':') && !trimmed.includes('|')) {
    const rawNum = parseInt(trimmed.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(rawNum)) return `₹${rawNum.toLocaleString('en-IN')}`
    return trimmed.startsWith('₹') ? trimmed : `₹${trimmed}`
  }
  const matches = trimmed.match(/(?:₹|INR|Rs\.?)\s*([0-9,]+)/gi)
  if (matches && matches.length > 0) {
    let total = 0
    for (const m of matches) {
      const numStr = m.replace(/[^0-9]/g, '')
      const val = parseInt(numStr, 10)
      if (!isNaN(val)) total += val
    }
    if (total > 0) {
      return `₹${total.toLocaleString('en-IN')}`
    }
  }
  return trimmed
}

// ═══════════════════════════════════════════════════════════════
// Tournament Card
// ═══════════════════════════════════════════════════════════════
function TournamentCard({ t, user, index }: { t: Tournament; user: any; index: number }) {
  const statusConfig: Record<string, { label: string; color: string; dot: boolean }> = {
    live: { label: '● LIVE', color: 'text-red-400 bg-red-500/15 border-red-500/30', dot: true },
    registration_open: { label: 'OPEN', color: 'text-green-400 bg-green-500/15 border-green-500/30', dot: false },
    draft: { label: 'SOON', color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30', dot: false },
    completed: { label: 'ENDED', color: 'text-muted-foreground bg-muted border-border', dot: false },
  }
  const st = statusConfig[t.status] ?? statusConfig.completed
  const fill = Math.min(100, (t.teams / t.maxTeams) * 100)
  const fb = getFormatBadge(t.format)

  const stLower = String(t.status || '').toLowerCase()
  const isEnded =
    stLower === 'completed' ||
    stLower === 'finished' ||
    stLower === 'ended' ||
    stLower === 'closed' ||
    Boolean((t as any).isClosed)

  return (
    <motion.div
      variants={cardVariant}
      className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all duration-300 flex flex-col"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
      whileHover={{ y: -3 }}
    >
      {/* Banner */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={t.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'}
          alt={t.name}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${st.color}`}>
            {st.label}
          </span>
        </div>
        <div className="absolute top-3 right-3 rounded-md border border-white/10 bg-background/70 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-white/90">
          {t.game}
        </div>

        {/* Creator byline */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="size-6 rounded-full border border-primary/50 bg-muted overflow-hidden">
            <img src={t.creatorAvatar} alt={t.creatorName} className="w-full h-full object-cover" />
          </div>
          <span className="text-[11px] font-semibold text-white/90">{t.creatorName}</span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-display text-base text-foreground leading-snug line-clamp-2">{t.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${fb.color}`}>
            {fb.label}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1"><Calendar className="size-3" /> {t.startDate}</span>
        </div>

        {/* Fill bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-muted-foreground">Teams</span>
            <span className="font-bold text-foreground">{t.teams}/{t.maxTeams}</span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${fill}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Prize Pool</p>
            <p className="font-display text-lg font-bold text-primary">{formatOverallPrizePool(t.prizePool)}</p>
          </div>
          <Link
            to={`/tournaments/${t.id}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-bold transition-all duration-200 ${
              isEnded
                ? 'border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-background'
            }`}
          >
            {t.status === 'live' ? 'Live Lobby' : isEnded ? 'View Results' : 'Register'}
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Main Landing Page
// ═══════════════════════════════════════════════════════════════
export default function LandingPage() {
  const { user } = useAuth()
  const { openLogin, openRegister } = useAuthModal()
  const nav = useNavigate()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [creators, setCreators] = useState<any[]>(DEFAULT_CREATORS)
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all')
  const [formatFilter, setFormatFilter] = useState<'all' | 'auction' | 'br_squad' | 'br_solo' | 'cs_norules' | 'cs_limited' | 'cs_onetap'>('all')
  const [navScrolled, setNavScrolled] = useState(false)

  // Register navigate so authModalStore redirects use SPA routing
  useEffect(() => {
    setAuthModalNavigate(nav)
  }, [nav])

  useEffect(() => {
    tournamentService.list().then(setTournaments)
    creatorService.getPlatformStats().then(setStats)
    creatorService.list().then((dbList) => {
      const activeList = (dbList || []).filter((c: any) => (!c.status || c.status === 'active') && !c.isDeleted)
      if (activeList.length > 0) {
        const mapped = activeList.map((c, i) => ({
          id: c.id,
          name: c.name,
          handle: c.handle,
          title: 'Official Partner Creator',
          photo:
            c.avatar ||
            'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80',
          subscribers: c.subscribers || 'Official Partner',
          bio: c.bio,
          games: Array.isArray(c.games) ? c.games : ['Free Fire', 'BGMI'],
          activeTournaments: c.activeTournaments || 0,
          totalTournaments: c.totalTournaments || 0,
          verified: true,
          rank: i + 1,
          accentColor: i === 0 ? '#FF4D2D' : i === 1 ? '#8B5CF6' : '#F59E0B',
          socials: c.socials || {},
        }))
        setCreators(mapped)
      } else {
        setCreators(DEFAULT_CREATORS)
      }
    })
    const onScroll = () => setNavScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)

    // Auto-open modal if URL has ?auth=login, ?auth=register, or hashes
    const params = new URLSearchParams(window.location.search)
    const authQuery = params.get('auth')
    if (authQuery === 'login' || window.location.hash === '#login') {
      openLogin()
    } else if (authQuery === 'register' || window.location.hash === '#register') {
      openRegister()
    }

    return () => window.removeEventListener('scroll', onScroll)
  }, [openLogin, openRegister])

  const filteredTournaments = tournaments.filter((t) => {
    const stLower = String(t.status || '').toLowerCase()
    const isEnded =
      stLower === 'completed' ||
      stLower === 'finished' ||
      stLower === 'ended' ||
      stLower === 'closed' ||
      Boolean((t as any).isClosed)

    if (activeTab === 'live') {
      if (t.status !== 'live') return false
    } else if (activeTab === 'upcoming') {
      if (isEnded || !(t.status === 'registration_open' || t.status === 'draft')) return false
    } else if (activeTab === 'completed') {
      if (!isEnded) return false
    } else if (activeTab === 'all') {
      // Default All Active view: Exclude ended tournaments from Live & Upcoming
      if (isEnded) return false
    }

    if (formatFilter === 'auction') return t.format === 'Auction Tournament' || t.format.toLowerCase().includes('auction')
    if (formatFilter === 'br_squad') return t.format === 'BR Squad' || t.format === 'Battle Royale'
    if (formatFilter === 'br_solo') return t.format === 'BR Solo'
    if (formatFilter === 'cs_norules') return t.format === 'CS Squad No Rules'
    if (formatFilter === 'cs_limited') return t.format === 'CS Squad Limited'
    if (formatFilter === 'cs_onetap') return t.format === 'CS Squad One Tap'

    return true
  })

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* ── NAV ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: navScrolled ? 'rgba(10,10,10,0.97)' : 'transparent',
          backdropFilter: navScrolled ? 'blur(20px) saturate(1.5)' : 'none',
          borderBottom: navScrolled ? '1px solid #1A1A1A' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="RDK Esports Logo"
              className="h-10 w-auto logo-glow group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg tracking-[0.15em] text-foreground">RDK ESPORTS</span>
              <span className="text-[9px] tracking-[0.1em] text-muted-foreground font-body uppercase">Powered by RDK Technologies</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-body font-medium text-muted-foreground">
            {['What We Do', 'Tournaments', 'Creators', 'Features'].map((label, i) => {
              const href = ['#what-we-do', '#tournaments', '#creators', '#features'][i]
              return (
                <a key={label} href={href} className="nav-link-underline hover:text-foreground transition-colors">{label}</a>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to={homeFor(user.role)}
                className="btn-primary cursor-pointer"
              >
                <Crown className="size-3.5" />
                Dashboard
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openLogin}
                  className="btn-ghost text-sm cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={openRegister}
                  className="btn-accent hidden sm:inline-flex cursor-pointer"
                >
                  Register <ArrowRight className="size-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-grid-pattern animate-grid-pulse pointer-events-none" />
        {/* Primary glow orb top-left */}
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(229,57,53,0.12) 0%, transparent 70%)' }}
        />
        {/* Accent orb bottom-right */}
        <div className="absolute -bottom-60 -right-40 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(229,57,53,0.06) 0%, transparent 70%)' }}
        />
        {/* Secondary ambient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(229,57,53,0.08) 0%, transparent 70%)' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: Text */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.12 } } }}
            >


              <motion.h1
                variants={stagger(0.1)}
                className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-wide text-foreground"
              >
                Run Every
                <br />
                <span className="gradient-text">Tournament.</span>
                <br />
                <span className="text-foreground/60">From Reg to Final.</span>
              </motion.h1>

              <motion.p variants={stagger(0.2)} className="mt-6 text-base text-muted-foreground leading-relaxed max-w-xl font-body">
                RDK Technologies powers creator-led competitive gaming — UPI payments, IPL-style player auctions,
                automated brackets, and real-time public leaderboards in one unified control center.
              </motion.p>

              <motion.div variants={stagger(0.3)} className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#tournaments"
                  className="btn-primary cursor-pointer"
                >
                  <Trophy className="size-4" />
                  Explore Tournaments
                </a>
                <button
                  type="button"
                  onClick={openRegister}
                  className="btn-ghost cursor-pointer"
                >
                  <Users className="size-4" />
                  Join as Gamer
                </button>
              </motion.div>

              {/* Stats bar */}
              <motion.div
                variants={stagger(0.4)}
                className="mt-14 pt-8 border-t border-border/30 grid grid-cols-2 sm:grid-cols-4 gap-6"
              >
                {[
                  { label: 'Tournaments', value: stats?.totalTournamentsHosted ?? '36+', color: 'gradient-text' },
                  { label: 'Prize Given', value: stats?.totalPrizeDistributed ?? '₹8.75L+', color: 'text-primary' },
                  { label: 'Gamers', value: stats?.registeredGamers ?? '12K+', color: 'gradient-text' },
                  { label: 'Partners', value: `${creators.length}`, color: 'gradient-text-gold' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className={`stat-number text-3xl ${s.color}`}>{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-body tracking-wide">{s.label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: Hero creator card — the primary photo */}
            <motion.div
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              className="hidden lg:flex justify-center"
            >
              <div className="relative">
                {/* Corner decoration */}
                <div className="bracket relative rounded-2xl overflow-hidden"
                  style={{
                    width: '360px',
                    boxShadow: '0 0 40px hsl(263 82% 58% / 0.25), 0 20px 60px rgba(0,0,0,0.5)',
                    border: '1px solid hsl(263 82% 58% / 0.3)',
                  }}
                >
                  <img
                    src="/creator-rdk.png"
                    alt="RDK Esports Head"
                    className="w-full object-cover"
                    style={{ aspectRatio: '3/4' }}
                  />
                  {/* Bottom overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                  {/* Info bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="badge-primary inline-flex mb-2 text-[9px]">
                      <Crown className="size-3" />
                      Platform Head
                    </div>
                    <p className="font-display text-xl text-white">RDK Esports</p>
                    <p className="text-xs text-white/50 font-body font-mono">@rdkesports</p>
                  </div>
                </div>

                {/* Floating stat pills */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-5 -right-8 rounded-xl border border-border bg-card/90 backdrop-blur-md px-4 py-2.5 shadow-lg"
                >
                  <p className="font-display text-xl font-bold text-primary">36+</p>
                  <p className="text-[10px] text-muted-foreground">Tournaments</p>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute -bottom-5 -left-8 rounded-xl border border-border bg-card/90 backdrop-blur-md px-4 py-2.5 shadow-lg"
                >
                  <p className="font-display text-xl font-bold text-yellow-400">12K+</p>
                  <p className="text-[10px] text-muted-foreground">Gamers</p>
                </motion.div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── WHAT WE DO ── */}
      <AnimatedSection id="what-we-do" className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-16">
            <SectionLabel icon={Target} text="What We Do" />
            <h2 className="font-display text-4xl text-foreground tracking-wide">
              Everything for Professional Esports
            </h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed font-body">
              We eliminated the chaos of WhatsApp groups, lost Google Forms, and unverified UPI payments.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Gamepad2, color: 'text-primary bg-primary/10 border-primary/20',
                title: 'Multi-Format Engine',
                desc: 'Free Fire BR, BGMI Custom Rooms, Valorant Knockout, and daily scrims all supported.',
                features: ['Auto-bracket generation', 'Room ID & pass dispatch'],
              },
              {
                icon: QrCode, color: 'text-green-400 bg-green-500/10 border-green-500/20',
                title: 'Manual UPI Payments',
                desc: 'Zero gateway cuts. Organizers display their UPI QR. Teams upload UTR + screenshots directly.',
                features: ['Ambassador audit desk', 'One-click Approve/Reject'],
              },
              {
                icon: Gavel, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
                title: 'Live Player Auctions',
                desc: 'IPL-style live bidding, real-time purse meters, and Sheets sync for the full player pool.',
                features: ['Real-time bid sync', 'Instant budget deduction'],
              },
              {
                icon: Users, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                title: 'Verified Creator Hub',
                desc: 'Official partners get white-labeled control rooms, social showcases, and ambassador networks.',
                features: ['Dedicated creator portfolio', 'Multi-tier RBAC authority'],
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                variants={stagger(i * 0.08)}
                className="rounded-xl border border-border bg-card p-6 flex flex-col hover:border-primary/30 transition-all duration-300 group"
                whileHover={{ y: -4 }}
              >
                <div className={`size-12 rounded-xl border flex items-center justify-center mb-5 ${card.color}`}>
                  <card.icon className="size-5" />
                </div>
                <h3 className="font-heading font-black text-base text-foreground mb-2">{card.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">{card.desc}</p>
                <ul className="mt-5 space-y-2">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-foreground/80">
                      <CheckCircle2 className="size-3.5 text-green-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ── TOURNAMENTS ── */}
      <AnimatedSection id="tournaments" className="py-24 border-t border-border bg-card/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>

              <h2 className="font-heading font-black text-4xl text-foreground tracking-tight">
                Live & Upcoming Tournaments
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Championships conducted by verified creators. Powered by RDK Technologies.
              </p>
            </div>

            <div className="flex items-center bg-muted/60 border border-border rounded-xl p-1 gap-1 self-start sm:self-auto">
              {[
                { id: 'all', label: 'All Active' },
                { id: 'live', label: 'Live' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'completed', label: 'Completed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Format Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 mb-8 border-b border-border/40 pb-4">
            <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mr-1">
              Mode:
            </span>
            {[
              { id: 'all', label: 'All Formats' },
              { id: 'auction', label: 'Auction' },
              { id: 'br_squad', label: 'BR Squad' },
              { id: 'br_solo', label: 'BR Solo' },
              { id: 'cs_norules', label: 'CS No Rules' },
              { id: 'cs_limited', label: 'CS Limited' },
              { id: 'cs_onetap', label: 'CS One Tap' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFormatFilter(f.id as any)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  formatFilter === f.id
                    ? 'bg-primary text-background border-primary font-bold shadow-xs'
                    : 'border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${formatFilter}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredTournaments.map((t, i) => (
                <TournamentCard key={t.id} t={t} user={user} index={i} />
              ))}
              {filteredTournaments.length === 0 && (
                <div className="col-span-3 py-20 text-center text-muted-foreground">
                  <Trophy className="size-12 mx-auto mb-4 opacity-30" />
                  <p className="font-heading font-bold text-lg">No tournaments in this category right now</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    {activeTab === 'completed'
                      ? 'No completed tournaments recorded yet.'
                      : 'Check back soon for new live & upcoming championships, or switch to the Completed tab to view past tournament recaps.'}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </AnimatedSection>

      {/* ── OFFICIAL CREATORS ── */}
      <AnimatedSection id="creators" className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-16">

            <h2 className="font-heading font-black text-4xl text-foreground tracking-tight">
              Our Official Creators & Organizers
            </h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Official Creators are personally vetted and authorized by RDK Technologies.
              They organize championships, scrims, and player auctions with full platform backing.
            </p>
          </motion.div>

          <motion.div
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {creators.map((c, i) => (
              <CreatorCard key={c.id} creator={c} index={i} />
            ))}
          </motion.div>

          {/* CTA to become partner */}
          <motion.div
            variants={fadeUp}
            className="mt-12 relative rounded-xl overflow-hidden border border-primary/20"
            style={{ background: 'linear-gradient(135deg, hsl(8 95% 58% / 0.08) 0%, hsl(270 80% 65% / 0.05) 100%)' }}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at left center, hsl(8 95% 58% / 0.1) 0%, transparent 60%)' }}
            />
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 p-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="size-5 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-primary">Become a Partner</span>
                </div>
                <h4 className="font-heading font-black text-2xl text-foreground">
                  Gaming Creator, Clan Owner, or College Host?
                </h4>
                <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                  Apply for Official Creator status. Get verified, your own branded tournament control center,
                  ambassador delegation, and live auction capabilities.
                </p>
              </div>
              <button
                type="button"
                onClick={openLogin}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-black text-white hover:opacity-90 transition glow-red shrink-0 cursor-pointer"
              >
                Access Creator Portal
                <ArrowRight className="size-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ── PLATFORM FEATURES ── */}
      <AnimatedSection id="features" className="py-24 border-t border-border bg-card/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-16">

            <h2 className="font-heading font-black text-4xl text-foreground tracking-tight">
              Built for Serious Tournament Ops
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Trophy, title: 'Auto Points & Leaderboards',
                desc: 'Configure custom kill multipliers, placement points, and tiebreaker logic for Free Fire, BGMI, and CODM. Auto-computed instantly after each match.',
              },
              {
                icon: Users, title: 'Ambassador Delegation Desk',
                desc: 'Assign campus ambassadors to batches of teams. Ambassadors collect payment proofs, confirm eligibility, and relay credentials securely.',
              },
              {
                icon: TrendingUp, title: 'Google Sheets Two-Way Sync',
                desc: 'Import thousands of auction players from Sheets. Export final rosters, bid logs, and match results with a single click.',
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                variants={stagger(i * 0.1)}
                className="rounded-xl border border-border bg-card p-7 hover:border-primary/25 transition-all duration-300 group"
                whileHover={{ y: -3 }}
              >
                <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 text-primary group-hover:glow-red-sm transition">
                  <card.icon className="size-5" />
                </div>
                <h3 className="font-heading font-black text-lg text-foreground mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ── FOOTER ── */}
      <footer className="mt-auto border-t border-border bg-card/60 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img
                  src="/logo.png"
                  alt="RDK Esports Logo"
                  className="h-9 w-auto drop-shadow-[0_0_6px_rgba(255,180,0,0.3)]"
                />
                <span className="font-heading font-black text-base tracking-widest text-foreground">RDK ESPORTS</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                The Tournament Operating System. Powered by{' '}
                <span className="text-foreground font-semibold">RDK Technologies</span>.
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-muted-foreground">
              {[['What We Do', '#what-we-do'], ['Tournaments', '#tournaments'], ['Official Creators', '#creators'], ['Platform Features', '#features']].map(([label, href]) => (
                <a key={label} href={href} className="hover:text-foreground transition nav-link-underline">{label}</a>
              ))}
              <button type="button" onClick={openLogin} className="hover:text-foreground transition nav-link-underline cursor-pointer">Portal Login</button>
              <button type="button" onClick={openRegister} className="hover:text-foreground transition nav-link-underline cursor-pointer">Register</button>
            </nav>
          </div>

          <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} RDK Technologies. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal />
    </div>
  )
}
