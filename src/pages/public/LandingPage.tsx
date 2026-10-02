import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useInView, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  Trophy,
  ShieldCheck,
  Users,
  QrCode,
  Gavel,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Gamepad2,
  Youtube,
  Instagram,
  MessageSquare,
  Target,
  Crown,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
  Star,
  ChevronDown,
  Globe,
  Shield,
  Swords,
  Menu,
  X,
} from 'lucide-react'
import { tournamentService } from '@/services/api/tournamentService'
import { creatorService } from '@/services/api/creatorService'
import { useAuth } from '@/stores/authStore'
import { useAuthModal, setAuthModalNavigate } from '@/stores/authModalStore'
import { AuthModal } from '@/components/auth/AuthModal'
import { homeFor } from '@/app/config/roles'
import type { Tournament, PlatformStats } from '@/types'

// ═══════════════════════════════════════════════════════════════
// Animation variants
// ═══════════════════════════════════════════════════════════════
const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}
const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.5 } },
}
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay } },
})
const cardVariant = {
  hidden: { opacity: 0, y: 48, scale: 0.96 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
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
      const val = parseInt(m.replace(/[^0-9]/g, ''), 10)
      if (!isNaN(val)) total += val
    }
    if (total > 0) return `₹${total.toLocaleString('en-IN')}`
  }
  return trimmed
}

function getFormatBadge(fmt: string) {
  if (fmt === 'Auction Tournament' || fmt.toLowerCase().includes('auction'))
    return { label: 'Auction', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
  if (fmt === 'BR Squad' || fmt === 'Battle Royale')
    return { label: 'BR Squad', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
  if (fmt === 'BR Solo')
    return { label: 'BR Solo', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' }
  if (fmt === 'CS Squad No Rules')
    return { label: 'CS No Rules', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' }
  if (fmt === 'CS Squad Limited')
    return { label: 'CS Limited', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' }
  if (fmt === 'CS Squad One Tap')
    return { label: 'CS One Tap', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' }
  return { label: fmt, color: 'bg-primary/10 text-primary border-primary/20' }
}

// ═══════════════════════════════════════════════════════════════
// AnimatedSection wrapper
// ═══════════════════════════════════════════════════════════════
function AnimatedSection({ children, className = '', id = '' }: {
  children: React.ReactNode; className?: string; id?: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
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

interface LandingCreator {
  id: string
  name: string
  handle: string
  title: string
  photo: string
  subscribers: string
  bio?: string
  games: string[]
  activeTournaments: number
  totalTournaments: number
  verified: boolean
  rank: number
  accentColor: string
  socials: {
    youtube?: string
    instagram?: string
    discord?: string
  }
}

// ═══════════════════════════════════════════════════════════════
// Creator Card
// ═══════════════════════════════════════════════════════════════
function CreatorCard({ creator, index }: { creator: LandingCreator; index: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      variants={cardVariant}
      custom={index}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="creator-card border border-border bg-card flex flex-col cursor-default"
      style={{
        boxShadow: hovered
          ? `0 0 40px ${creator.accentColor}25, 0 8px 40px rgba(0,0,0,0.5)`
          : '0 4px 20px rgba(0,0,0,0.3)',
        borderColor: hovered ? `${creator.accentColor}60` : undefined,
        transition: 'box-shadow 0.35s ease, border-color 0.35s ease',
      }}
    >
      {/* Rank badge */}
      <div
        className="absolute top-4 right-4 z-20 flex size-9 items-center justify-center rounded-full text-xs font-black font-display"
        style={{
          background: `${creator.accentColor}18`,
          border: `1.5px solid ${creator.accentColor}55`,
          color: creator.accentColor,
        }}
      >
        #{creator.rank}
      </div>

      {/* Photo — tall portrait */}
      <div className="relative w-full overflow-hidden bg-black/60" style={{ aspectRatio: '3/4', maxHeight: '320px' }}>
        <motion.img
          src={creator.photo || '/logo.png'}
          alt={creator.name}
          className="w-full h-full object-cover object-top"
          animate={{ scale: hovered ? 1.06 : 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = '/logo.png'
          }}
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, hsl(240 6% 9%) 0%, hsl(240 6% 9% / 0.55) 40%, transparent 75%)',
          }}
        />
        {/* Game tags */}
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5 z-10">
          {creator.games.map((g: string) => (
            <span
              key={g}
              className="rounded-md border border-white/12 bg-black/60 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-semibold text-white/90 font-body"
            >
              {g}
            </span>
          ))}
        </div>
        {/* Verified */}
        {creator.verified && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-primary/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-white font-body">
            <ShieldCheck className="size-3" />
            VERIFIED
          </div>
        )}
        {/* Accent glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.35 }}
          style={{
            background: `radial-gradient(ellipse at 50% 100%, ${creator.accentColor}20 0%, transparent 65%)`,
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-5">
        <div className="mb-3">
          <h3 className="font-heading text-xl font-bold text-foreground leading-tight">
            {creator.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground font-mono">{creator.handle}</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full font-body"
              style={{ background: `${creator.accentColor}16`, color: creator.accentColor }}
            >
              {creator.subscribers}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 font-medium font-body">{creator.title}</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-3 font-body">
          {creator.bio}
        </p>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div className="text-center">
            <p className="font-display text-2xl font-bold" style={{ color: creator.accentColor }}>
              {creator.activeTournaments}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-body">Active Now</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-foreground">{creator.totalTournaments}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-body">Total Hosted</p>
          </div>
        </div>

        {/* Social buttons */}
        <div className="mt-4 flex items-center gap-2">
          {creator.socials.youtube && (
            <a
              href={creator.socials.youtube}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface/60 py-2 text-[11px] font-semibold text-muted-foreground hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/08 transition-all duration-200"
            >
              <Youtube className="size-3.5" />YouTube
            </a>
          )}
          {creator.socials.instagram && (
            <a
              href={creator.socials.instagram}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface/60 py-2 text-[11px] font-semibold text-muted-foreground hover:text-purple-400 hover:border-purple-500/40 hover:bg-purple-500/08 transition-all duration-200"
            >
              <Instagram className="size-3.5" />Instagram
            </a>
          )}
          {creator.socials.discord && (
            <a
              href={creator.socials.discord}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface/60 py-2 text-[11px] font-semibold text-muted-foreground hover:text-indigo-400 hover:border-indigo-500/40 hover:bg-indigo-500/08 transition-all duration-200"
            >
              <MessageSquare className="size-3.5" />Discord
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Tournament Card
// ═══════════════════════════════════════════════════════════════
function TournamentCard({ t, index }: { t: Tournament; index: number }) {
  const statusConfig: Record<string, { label: string; color: string; pulse: boolean }> = {
    live:              { label: 'LIVE', color: 'text-red-400 bg-red-500/14 border-red-500/35', pulse: true },
    registration_open: { label: 'OPEN', color: 'text-emerald-400 bg-emerald-500/14 border-emerald-500/35', pulse: false },
    slots_full:        { label: 'FULL', color: 'text-amber-400 bg-amber-500/14 border-amber-500/35', pulse: false },
    draft:             { label: 'SOON', color: 'text-amber-400 bg-amber-500/14 border-amber-500/35', pulse: false },
    completed:         { label: 'ENDED', color: 'text-muted-foreground bg-muted/60 border-border', pulse: false },
  }
  const stLower = String(t.status || '').toLowerCase()
  const isEnded =
    stLower === 'completed' ||
    stLower === 'finished' ||
    stLower === 'ended' ||
    stLower === 'closed' ||
    Boolean((t as any).isClosed) ||
    Boolean((t as any).closedAt) ||
    (t.endDate ? new Date(t.endDate).getTime() < Date.now() : false) ||
    (t.registrationClosing ? new Date(t.registrationClosing).getTime() < Date.now() : false)

  const isAuction = t.format === 'Auction Tournament' || String(t.format || '').toLowerCase().includes('auction')
  const actualTeams = Math.max(t.teams || 0, t.registeredTeamsCount || 0)
  const isSlotsFull = t.maxTeams > 0 && actualTeams >= t.maxTeams

  const st = isEnded
    ? statusConfig.completed
    : isSlotsFull
    ? statusConfig.slots_full
    : (statusConfig[stLower] ?? statusConfig.completed)

  const fill = Math.min(100, t.maxTeams > 0 ? (actualTeams / t.maxTeams) * 100 : 0)
  const fb = getFormatBadge(t.format)

  return (
    <motion.div
      variants={cardVariant}
      className="tournament-card flex flex-col group"
      whileHover={{ y: -4 }}
    >
      {/* Banner image */}
      <div className="relative h-48 overflow-hidden" style={{ borderRadius: '16px 16px 0 0' }}>
        <img
          src={t.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'}
          alt={t.name}
          className="h-full w-full object-cover group-hover:scale-108 transition-transform duration-600"
          style={{ transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#13131D] via-[#13131D]/25 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${st.color}`}>
            {st.pulse && (
              <span className="size-1.5 rounded-full bg-current animate-pulse" />
            )}
            {st.label}
          </span>
        </div>

        {/* Game badge */}
        <div className="absolute top-3 right-3 rounded-lg border border-white/12 bg-black/60 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-white/90 font-body">
          {t.game}
        </div>

        {/* Creator byline */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="size-6 rounded-full border border-primary/50 bg-surface overflow-hidden">
            <img src={t.creatorAvatar} alt={t.creatorName} className="w-full h-full object-cover" />
          </div>
          <span className="text-[11px] font-semibold text-white/90 font-body">{t.creatorName}</span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-heading text-lg font-bold text-foreground leading-snug line-clamp-2">
          {t.name}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${fb.color}`}>
            {fb.label}
          </span>
          <span className="text-border-strong">·</span>
          <span className="flex items-center gap-1 font-body">
            <Calendar className="size-3" />
            {t.startDate}
          </span>
        </div>

        {/* Teams / Candidates fill bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] mb-2">
            <span className="text-muted-foreground font-body">
              {isAuction ? 'Draft Candidates Pool' : 'Teams Registered'}
            </span>
            <span className="font-bold text-foreground font-body">{actualTeams}/{t.maxTeams}</span>
          </div>
          <div className="tournament-fill-bar">
            <motion.div
              className="tournament-fill-bar-inner"
              initial={{ width: 0 }}
              animate={{ width: `${fill}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-border/60 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-body">
              Prize Pool
            </p>
            <p className="font-display text-xl font-bold" style={{
              background: 'linear-gradient(135deg, #FFB800, #FF8C00)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {formatOverallPrizePool(t.prizePool)}
            </p>
          </div>
          <Link
            to={`/tournaments/${t.id}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-bold transition-all duration-200 font-body ${
              isEnded
                ? 'border-border bg-surface/60 text-muted-foreground hover:bg-surface hover:text-foreground'
                : isSlotsFull
                ? 'border-amber-500/40 bg-amber-500/12 text-amber-300 hover:bg-amber-500 hover:text-black'
                : t.status === 'live'
                ? 'border-red-500/40 bg-red-500/12 text-red-400 hover:bg-red-500 hover:text-white'
                : 'border-primary/35 bg-primary/10 text-primary-light hover:bg-primary hover:text-white'
            }`}
          >
            {isEnded
              ? 'View Results'
              : isSlotsFull
              ? 'Slots Full'
              : t.status === 'live'
              ? 'Live Lobby'
              : 'Register'}
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
  const [creators, setCreators] = useState<LandingCreator[]>([])
  const [isLoadingCreators, setIsLoadingCreators] = useState(true)
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all')
  const [formatFilter, setFormatFilter] = useState<'all' | 'auction' | 'br_squad' | 'br_solo' | 'cs_norules' | 'cs_limited' | 'cs_onetap'>('all')
  const [navScrolled, setNavScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setAuthModalNavigate(nav)
  }, [nav])

  useEffect(() => {
    tournamentService.list().then(async (list) => {
      setTournaments(list)
      try {
        const needsCheck = list.some((t) => (t.teams || 0) === 0)
        if (needsCheck) {
          const enriched = await Promise.all(
            list.map(async (t) => {
              if ((t.teams || 0) === 0) {
                try {
                  const res = await fetch(`/api/tournaments/${t.id}`)
                  if (res.ok) {
                    const detail = await res.json()
                    const count = Math.max(
                      detail.tournament?.teams || 0,
                      detail.tournament?.registeredTeamsCount || 0,
                      Array.isArray(detail.teams) ? detail.teams.length : 0
                    )
                    if (count > 0) {
                      return {
                        ...t,
                        teams: count,
                        registeredTeamsCount: count,
                        status: detail.tournament?.status || t.status,
                      }
                    }
                  }
                } catch {}
              }
              return t
            })
          )
          setTournaments(enriched)
        }
      } catch {}
    })
    creatorService.getPlatformStats().then(setStats)
    creatorService.list().then((dbList) => {
      const activeList = (dbList || []).filter((c: any) => (!c.status || c.status === 'active') && !c.isDeleted)
      if (activeList.length > 0) {
        const mapped: LandingCreator[] = activeList.map((c: any, i: number) => ({
          id: c.id,
          name: c.name,
          handle: c.handle,
          title: c.organizationName ? `${c.organizationName} Partner` : 'Official Partner Creator',
          photo: c.avatar || '/logo.png',
          subscribers: c.subscribers || 'Official Partner',
          bio: c.bio || 'Official verified gaming partner on RDK Esports.',
          games: Array.isArray(c.games) ? c.games : ['Free Fire', 'BGMI'],
          activeTournaments: c.activeTournaments || 0,
          totalTournaments: c.totalTournaments || 0,
          verified: true,
          rank: i + 1,
          accentColor: i === 0 ? '#FF3B3B' : i === 1 ? '#8B5CF6' : '#FFB800',
          socials: c.socials || {},
        }))
        setCreators(mapped)
      } else {
        setCreators([])
      }
      setIsLoadingCreators(false)
    }).catch(() => {
      setCreators([])
      setIsLoadingCreators(false)
    })

    const onScroll = () => setNavScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)

    const params = new URLSearchParams(window.location.search)
    const authQuery = params.get('auth')
    if (authQuery === 'login' || window.location.hash === '#login') openLogin()
    else if (authQuery === 'register' || window.location.hash === '#register') openRegister()

    return () => window.removeEventListener('scroll', onScroll)
  }, [openLogin, openRegister])

  const filteredTournaments = tournaments.filter((t) => {
    const stLower = String(t.status || '').toLowerCase()
    const isEnded =
      stLower === 'completed' ||
      stLower === 'finished' ||
      stLower === 'ended' ||
      stLower === 'closed' ||
      Boolean((t as any).isClosed) ||
      Boolean((t as any).closedAt) ||
      (t.endDate ? new Date(t.endDate).getTime() < Date.now() : false) ||
      (t.registrationClosing ? new Date(t.registrationClosing).getTime() < Date.now() : false)

    if (activeTab === 'live') {
      if (stLower !== 'live' || isEnded) return false
    } else if (activeTab === 'upcoming') {
      if (isEnded || !(stLower === 'registration_open' || stLower === 'draft' || stLower === 'upcoming')) return false
    } else if (activeTab === 'completed') {
      if (!isEnded) return false
    } else if (activeTab === 'all') {
      if (isEnded) return false
    }

    if (formatFilter === 'auction')   return t.format === 'Auction Tournament' || t.format.toLowerCase().includes('auction')
    if (formatFilter === 'br_squad')  return t.format === 'BR Squad' || t.format === 'Battle Royale'
    if (formatFilter === 'br_solo')   return t.format === 'BR Solo'
    if (formatFilter === 'cs_norules') return t.format === 'CS Squad No Rules'
    if (formatFilter === 'cs_limited') return t.format === 'CS Squad Limited'
    if (formatFilter === 'cs_onetap') return t.format === 'CS Squad One Tap'
    return true
  })

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">

      {/* ══════════════════════════════════
          NAV
      ══════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-400 pt-safe"
        style={{
          background: navScrolled || mobileMenuOpen ? 'rgba(8,7,10,0.95)' : 'transparent',
          backdropFilter: navScrolled || mobileMenuOpen ? 'blur(28px) saturate(1.8)' : 'none',
          borderBottom: navScrolled || mobileMenuOpen ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <img
              src="/logo.png"
              alt="RDK Esports Logo"
              className="h-8 sm:h-9 w-auto logo-glow group-hover:scale-105 transition-transform duration-300"
            />
            <div className="flex flex-col leading-none">
              <span className="font-display text-sm sm:text-base tracking-[0.18em] text-foreground">RDK ESPORTS</span>
              <span className="text-[8px] sm:text-[9px] tracking-[0.12em] text-muted-foreground font-body uppercase">Powered by RDK Technologies</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-body font-medium text-muted-foreground">
            {[
              ['What We Do', '#what-we-do'],
              ['Tournaments', '#tournaments'],
              ['Creators', '#creators'],
              ['Features', '#features'],
            ].map(([label, href]) => (
              <a key={label} href={href} className="nav-link-underline hover:text-foreground transition-colors duration-200">
                {label}
              </a>
            ))}
          </nav>

          {/* Desktop Auth buttons */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {user ? (
              <Link to={homeFor(user.role)} className="btn-primary">
                Dashboard
              </Link>
            ) : (
              <>
                <button type="button" onClick={openLogin} className="btn-ghost text-sm cursor-pointer">
                  Sign In
                </button>
                <button type="button" onClick={openRegister} className="btn-primary cursor-pointer">
                  Register <ArrowRight className="size-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Right Controls: Quick Auth / Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            {!user && (
              <button
                type="button"
                onClick={openLogin}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-foreground hover:bg-white/5 transition border border-white/10"
              >
                Sign In
              </button>
            )}
            {user && (
              <Link
                to={homeFor(user.role)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-background"
              >
                Dashboard
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
              className="p-2 rounded-lg border border-white/10 bg-white/5 text-foreground hover:bg-white/10 transition cursor-pointer"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden border-t border-white/10 bg-[#0A090D]/95 backdrop-blur-2xl px-5 py-5 space-y-4 overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                {[
                  ['What We Do', '#what-we-do'],
                  ['Tournaments', '#tournaments'],
                  ['Creators', '#creators'],
                  ['Features', '#features'],
                ].map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition flex items-center justify-between"
                  >
                    <span>{label}</span>
                    <ChevronRight className="size-3.5 text-primary opacity-60" />
                  </a>
                ))}
              </div>

              {!user && (
                <div className="pt-2 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      openRegister()
                    }}
                    className="w-full py-3 rounded-xl bg-primary text-background font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer"
                  >
                    <span>Create Player Account</span>
                    <ArrowRight className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      openLogin()
                    }}
                    className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Sign In to Existing Account</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ══════════════════════════════════
          HERO
      ══════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-grid-pattern animate-grid-pulse pointer-events-none opacity-60" />

        {/* Ambient glow orbs */}
        <div
          className="hero-glow-sphere w-[900px] h-[900px] -top-60 -left-60 opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(245,26,26,0.15) 0%, transparent 65%)' }}
        />
        <div
          className="hero-glow-sphere w-[700px] h-[700px] -bottom-80 -right-40 opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(255,170,0,0.08) 0%, transparent 65%)' }}
        />
        <div
          className="hero-glow-sphere w-[500px] h-[200px] top-1/3 left-1/2 -translate-x-1/2 opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(245,26,26,0.12) 0%, transparent 70%)' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: Hero text */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            >
              {/* Eyebrow label */}
              <motion.div variants={stagger(0)} className="mb-6">
                <span className="section-eyebrow">
                  South India's #1 Esports Platform
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={stagger(0.08)}
                className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.0] tracking-wide"
              >
                <span className="text-foreground">Run Every</span>
                <br />
                <span className="gradient-text-hero">Tournament.</span>
                <br />
                <span className="text-foreground/50" style={{ fontSize: '0.75em' }}>From Reg to Final.</span>
              </motion.h1>

              <motion.p
                variants={stagger(0.18)}
                className="mt-6 text-base text-muted-foreground leading-relaxed max-w-lg font-body"
              >
                RDK Technologies powers creator-led competitive gaming — UPI payments, IPL-style player auctions,
                automated brackets, and real-time public leaderboards in one unified control center.
              </motion.p>

              {/* CTA buttons */}
              <motion.div variants={stagger(0.28)} className="mt-8 flex flex-wrap gap-4">
                <a href="#tournaments" className="btn-primary">
                  Explore Tournaments
                </a>
                <button type="button" onClick={openRegister} className="btn-outline-white cursor-pointer">
                  Join as Gamer
                </button>
              </motion.div>

              {/* Stats bar */}
              <motion.div
                variants={stagger(0.38)}
                className="mt-14 pt-8 border-t border-border/40"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {[
                    { label: 'Tournaments', value: stats?.totalTournamentsHosted ?? '36+', accent: 'gradient-text' },
                    { label: 'Prize Given', value: stats?.totalPrizeDistributed ?? '₹8.75L+', accent: 'gradient-text-gold' },
                    { label: 'Gamers', value: stats?.registeredGamers ?? '12K+', accent: 'gradient-text' },
                    { label: 'Partners', value: `${creators.length}`, accent: 'gradient-text-gold' },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className={`stat-number text-3xl font-bold ${s.accent}`}>{s.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 font-body tracking-wide uppercase">{s.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Right: Hero card */}
            <motion.div
              initial={{ opacity: 0, x: 60, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
              className="hidden lg:flex justify-center"
            >
              <div className="relative">
                {/* Tournament Hub Command Card */}
                <div
                  className="bracket relative rounded-3xl overflow-hidden p-6 flex flex-col justify-between"
                  style={{
                    width: '360px',
                    minHeight: '440px',
                    background: 'linear-gradient(165deg, #141414 0%, #0A0A0A 100%)',
                    boxShadow: '0 0 60px rgba(245,26,26,0.18), 0 30px 80px rgba(0,0,0,0.8)',
                    border: '1px solid rgba(245,26,26,0.3)',
                  }}
                >
                  {/* Subtle top ambient glow */}
                  <div
                    className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-48 rounded-full pointer-events-none"
                    style={{
                      background: 'radial-gradient(ellipse, rgba(229,57,53,0.25) 0%, transparent 70%)',
                      filter: 'blur(30px)',
                    }}
                  />

                  {/* Header: Brand Crest & Live Engine Badge */}
                  <div className="relative z-10 flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-black/60 border border-primary/40 flex items-center justify-center p-1.5 shadow-lg shadow-primary/20">
                        <img src="/logo.png" alt="RDK Esports" className="w-full h-full object-contain logo-glow" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-sm tracking-wider text-white font-bold">RDK ESPORTS</span>
                          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <span className="text-[10px] text-white/40 font-mono tracking-widest uppercase">PRO LEAGUE OS</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 flex items-center gap-1 font-body">
                      <Zap className="size-2.5" />
                      LIVE
                    </span>
                  </div>

                  {/* Center: Featured Championship Showcase */}
                  <div className="relative z-10 my-4 space-y-3.5">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
                      <div className="flex items-center justify-between text-[10px] font-mono text-white/50 mb-2">
                        <span className="flex items-center gap-1 text-primary font-bold">
                          <Swords className="size-3" />
                          GRAND FINALS
                        </span>
                        <span>BEST OF 5</span>
                      </div>
                      <h4 className="font-heading text-lg font-bold text-white tracking-wide">
                        Free Fire Clash Invitational
                      </h4>
                      <div className="mt-3 flex items-center justify-between bg-black/40 rounded-xl p-2.5 border border-white/5 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                            A
                          </div>
                          <span className="font-bold text-white text-[11px]">Team Alpha</span>
                        </div>
                        <span className="font-display font-black text-primary px-2">14 : 12</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-[11px]">Team Omega</span>
                          <div className="size-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                            Ω
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
                        <p className="text-[9px] text-white/40 uppercase tracking-wider font-mono">PRIZE POOL</p>
                        <p className="font-display text-sm font-bold text-amber-400 mt-0.5">₹50,000</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
                        <p className="text-[9px] text-white/40 uppercase tracking-wider font-mono">ALLOTTED SLOTS</p>
                        <p className="font-display text-sm font-bold text-emerald-400 mt-0.5">48 / 48 FILLED</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer / Specs */}
                  <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50 font-body">
                    <span className="flex items-center gap-1.5 text-white/70">
                      <ShieldCheck className="size-3.5 text-primary" />
                      UPI Direct Settlement
                    </span>
                    <span className="font-mono text-white/30">ID: RDK-PRO-2026</span>
                  </div>
                </div>

                {/* Floating stat pills */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-6 -right-10 rounded-xl border border-border bg-card/95 backdrop-blur-md px-4 py-3 shadow-card-deep"
                >
                  <p className="font-display text-xl font-bold" style={{
                    background: 'linear-gradient(135deg, #FFB800, #FF8C00)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>36+</p>
                  <p className="text-[10px] text-muted-foreground font-body">Tournaments</p>
                </motion.div>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                  className="absolute -bottom-6 -left-10 rounded-xl border border-border bg-card/95 backdrop-blur-md px-4 py-3 shadow-card-deep"
                >
                  <p className="font-display text-xl font-bold gradient-text">12K+</p>
                  <p className="text-[10px] text-muted-foreground font-body">Gamers</p>
                </motion.div>
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
                  className="absolute top-1/3 -right-14 rounded-xl border border-border bg-card/95 backdrop-blur-md px-3 py-2 shadow-card-deep"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-[10px] text-emerald-400 font-bold font-body">LIVE NOW</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-body mt-0.5">3 Active Tournaments</p>
                </motion.div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          <span className="text-[10px] text-muted-foreground font-body uppercase tracking-widest">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="size-4 text-muted-foreground" />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════
          WHAT WE DO
      ══════════════════════════════════ */}
      <AnimatedSection id="what-we-do" className="py-28 border-t border-border/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-20">
            <div className="flex justify-center mb-4">
              <span className="section-eyebrow">
                <Target className="size-3" />
                What We Do
              </span>
            </div>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-foreground">
              Everything for Professional Esports
            </h2>
            <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-gold mx-auto mt-5 mb-5 rounded-full" />
            <p className="text-sm text-muted-foreground leading-relaxed font-body">
              We eliminated the chaos of WhatsApp groups, lost Google Forms, and unverified UPI payments.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Gamepad2,
                iconColor: 'text-primary bg-primary/10 border-primary/20',
                accentBar: 'from-primary to-primary-light',
                title: 'Multi-Format Engine',
                desc: 'Free Fire BR, BGMI Custom Rooms, Valorant Knockout, and daily scrims all supported.',
                features: ['Auto-bracket generation', 'Room ID & pass dispatch'],
              },
              {
                icon: QrCode,
                iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                accentBar: 'from-emerald-500 to-emerald-400',
                title: 'Manual UPI Payments',
                desc: 'Zero gateway cuts. Organizers display their UPI QR. Teams upload UTR + screenshots directly.',
                features: ['Ambassador audit desk', 'One-click Approve/Reject'],
              },
              {
                icon: Gavel,
                iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                accentBar: 'from-amber-500 to-gold',
                title: 'Live Player Auctions',
                desc: 'IPL-style live bidding, real-time purse meters, and Sheets sync for the full player pool.',
                features: ['Real-time bid sync', 'Instant budget deduction'],
              },
              {
                icon: Users,
                iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                accentBar: 'from-purple-500 to-purple-400',
                title: 'Verified Creator Hub',
                desc: 'Official partners get white-labeled control rooms, social showcases, and ambassador networks.',
                features: ['Dedicated creator portfolio', 'Multi-tier RBAC authority'],
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                variants={stagger(i * 0.09)}
                className="feature-card flex flex-col group cursor-default"
                whileHover={{ y: -5 }}
              >
                {/* Accent top border */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.accentBar} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl`} />

                <h3 className="font-heading text-lg font-bold text-foreground mb-2 mt-1">{card.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1 font-body">{card.desc}</p>
                <ul className="mt-5 space-y-2">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-foreground/80 font-body">
                      <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ══════════════════════════════════
          TOURNAMENTS
      ══════════════════════════════════ */}
      <AnimatedSection
        id="tournaments"
        className="py-28 border-t border-border/60 relative bg-card/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="section-eyebrow-gold">
                  <Trophy className="size-3" />
                  Championships
                </span>
              </div>
              <h2 className="font-heading text-4xl sm:text-5xl font-bold text-foreground">
                Live & Upcoming Tournaments
              </h2>
              <p className="text-sm text-muted-foreground mt-2 font-body">
                Championships conducted by verified creators. Powered by RDK Technologies.
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex items-center bg-surface/60 border border-border rounded-xl p-1 gap-1 self-start sm:self-auto shrink-0">
              {[
                { id: 'all', label: 'All Active' },
                { id: 'live', label: '● Live' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'completed', label: 'Completed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 font-body ${
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

          {/* Format pills */}
          <div className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b border-border/40">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mr-1 font-body">Mode:</span>
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
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 font-body ${
                  formatFilter === f.id
                    ? 'bg-primary text-white border-primary font-bold shadow-glow-red-sm'
                    : 'border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-surface hover:border-border-strong'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tournament grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${formatFilter}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredTournaments.map((t, i) => (
                <TournamentCard key={t.id} t={t} index={i} />
              ))}
              {filteredTournaments.length === 0 && (
                <div className="col-span-3 py-24 text-center">
                  <div className="size-16 rounded-2xl bg-primary/08 border border-primary/15 flex items-center justify-center mx-auto mb-5">
                    <Trophy className="size-8 text-primary/40" />
                  </div>
                  <p className="font-heading text-xl font-bold text-foreground">No tournaments in this category</p>
                  <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto font-body">
                    {activeTab === 'completed'
                      ? 'No completed tournaments recorded yet.'
                      : 'Check back soon for new live & upcoming championships, or switch to the Completed tab to view past recaps.'}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </AnimatedSection>

      {/* ══════════════════════════════════
          OFFICIAL CREATORS
      ══════════════════════════════════ */}
      <AnimatedSection id="creators" className="py-28 border-t border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-20">
            <div className="flex justify-center mb-4">
              <span className="section-eyebrow">
                <Star className="size-3" />
                Official Partners
              </span>
            </div>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-foreground">
              Our Official Creators & Organizers
            </h2>
            <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-gold mx-auto mt-5 mb-5 rounded-full" />
            <p className="text-sm text-muted-foreground leading-relaxed font-body">
              Official Creators are personally vetted and authorized by RDK Technologies.
              They organize championships, scrims, and player auctions with full platform backing.
            </p>
          </motion.div>

          {creators.length > 0 ? (
            <motion.div
              variants={{ show: { transition: { staggerChildren: 0.12 } } }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {creators.map((c, i) => (
                <CreatorCard key={c.id} creator={c} index={i} />
              ))}
            </motion.div>
          ) : !isLoadingCreators ? (
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-white/10 bg-card/60 backdrop-blur-md p-10 text-center max-w-xl mx-auto"
            >
              <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">
                <Users className="size-7" />
              </div>
              <h3 className="font-heading text-xl font-bold text-white">Partner Program Open</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-body">
                We are currently onboarding authorized tournament organizers, clans, and esports communities.
              </p>
              <button
                type="button"
                onClick={openLogin}
                className="mt-6 btn-primary glow-red inline-flex items-center gap-2 cursor-pointer"
              >
                Apply for Official Partner
                <ArrowRight className="size-4" />
              </button>
            </motion.div>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground font-mono">
              Loading official partner directory...
            </div>
          )}

          {/* Become a partner CTA */}
          <motion.div
            variants={fadeUp}
            className="mt-14 relative rounded-2xl overflow-hidden border border-primary/20"
            style={{ background: 'linear-gradient(135deg, hsl(0 90% 55% / 0.07) 0%, hsl(42 100% 50% / 0.04) 100%)' }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at left center, hsl(0 90% 55% / 0.12) 0%, transparent 55%)' }}
            />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 p-8 lg:p-10">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award className="size-5 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-primary font-body">Become a Partner</span>
                </div>
                <h4 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Gaming Creator, Clan Owner, or College Host?
                </h4>
                <p className="text-sm text-muted-foreground mt-2 max-w-lg font-body leading-relaxed">
                  Apply for Official Creator status. Get verified, your own branded tournament control center,
                  ambassador delegation, and live auction capabilities.
                </p>
              </div>
              <button
                type="button"
                onClick={openLogin}
                className="btn-primary glow-red shrink-0 cursor-pointer whitespace-nowrap"
              >
                Access Creator Portal
                <ArrowRight className="size-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ══════════════════════════════════
          PLATFORM FEATURES
      ══════════════════════════════════ */}
      <AnimatedSection id="features" className="py-28 border-t border-border/60 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-hex-pattern opacity-30 pointer-events-none" />
        <div
          className="absolute right-0 top-0 w-1/2 h-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at right top, hsl(42 100% 50% / 0.04) 0%, transparent 60%)' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-20">
            <div className="flex justify-center mb-4">
              <span className="section-eyebrow-gold">
                <Zap className="size-3" />
                Platform Features
              </span>
            </div>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-foreground">
              Built for Serious Tournament Ops
            </h2>
            <div className="w-16 h-0.5 bg-gradient-to-r from-gold to-primary mx-auto mt-5 mb-5 rounded-full" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Trophy,
                gradient: 'from-primary/20 to-primary/5',
                border: 'border-primary/20',
                iconColor: 'text-primary',
                title: 'Auto Points & Leaderboards',
                desc: 'Configure custom kill multipliers, placement points, and tiebreaker logic for Free Fire, BGMI, and CODM. Auto-computed instantly after each match.',
              },
              {
                icon: Shield,
                gradient: 'from-purple-500/15 to-purple-500/5',
                border: 'border-purple-500/20',
                iconColor: 'text-purple-400',
                title: 'Ambassador Delegation Desk',
                desc: 'Assign campus ambassadors to batches of teams. Ambassadors collect payment proofs, confirm eligibility, and relay credentials securely.',
              },
              {
                icon: Globe,
                gradient: 'from-gold/15 to-gold/5',
                border: 'border-gold/20',
                iconColor: 'text-gold',
                title: 'Google Sheets Two-Way Sync',
                desc: 'Import thousands of auction players from Sheets. Export final rosters, bid logs, and match results with a single click.',
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                variants={stagger(i * 0.12)}
                className={`feature-card group cursor-default bg-gradient-to-br ${card.gradient} border ${card.border}`}
                whileHover={{ y: -5 }}
              >
                <h3 className="font-heading text-xl font-bold text-foreground mb-3">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-body">{card.desc}</p>

                {/* Bottom accent line */}
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl`} />
              </motion.div>
            ))}
          </div>

          {/* Stats row */}
          <motion.div
            variants={fadeUp}
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {[
              { value: stats?.totalTournamentsHosted ?? '36+', label: 'Tournaments Hosted', color: 'text-primary' },
              { value: stats?.registeredGamers ?? '12K+',      label: 'Registered Gamers', color: 'gradient-text' },
              { value: stats?.totalPrizeDistributed ?? '₹8.75L+', label: 'Prize Distributed', color: 'gradient-text-gold' },
              { value: `${creators.length}`,                    label: 'Official Partners', color: 'text-purple-400' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                variants={stagger(i * 0.08)}
                className="stat-card text-center group cursor-default"
              >
                <p className={`stat-number text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1 font-body uppercase tracking-wide">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ══════════════════════════════════
          FOOTER
      ══════════════════════════════════ */}
      <footer className="mt-auto border-t border-border/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-surface/30 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.png" alt="RDK Esports" className="h-9 w-auto logo-glow" />
                <span className="font-display text-base tracking-widest text-foreground">RDK ESPORTS</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-body max-w-xs">
                The Tournament Operating System. Powered by{' '}
                <span className="text-foreground font-semibold">RDK Technologies</span>.
                South India's premier competitive gaming infrastructure.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-3 mt-5">
                {[
                  { href: 'https://youtube.com/@rdkesports', icon: Youtube, color: 'hover:text-red-400 hover:border-red-400/40' },
                  { href: 'https://instagram.com/rdkesports', icon: Instagram, color: 'hover:text-purple-400 hover:border-purple-400/40' },
                ].map(({ href, icon: Icon, color }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={`size-8 rounded-lg border border-border bg-surface flex items-center justify-center text-muted-foreground transition-all duration-200 ${color}`}
                  >
                    <Icon className="size-3.5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-foreground mb-4 font-body">Navigation</p>
              <nav className="flex flex-col gap-2.5">
                {[
                  ['What We Do', '#what-we-do'],
                  ['Tournaments', '#tournaments'],
                  ['Official Creators', '#creators'],
                  ['Platform Features', '#features'],
                ].map(([label, href]) => (
                  <a key={label} href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 nav-link-underline font-body w-fit">
                    {label}
                  </a>
                ))}
              </nav>
            </div>


          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-muted-foreground font-body">
              © {new Date().getFullYear()} RDK Technologies. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-body">
              <span>South India's #1 Esports Platform</span>
              <span className="w-1 h-1 rounded-full bg-border-strong" />
              <span>Competitive Gaming Infrastructure</span>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal />
    </div>
  )
}
