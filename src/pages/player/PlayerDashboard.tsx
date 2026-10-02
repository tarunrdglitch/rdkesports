import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Gamepad2,
  Users,
  Trophy,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Zap,
  Swords,
  TrendingUp,
  Star,
  ChevronRight,
  Copy,
  Clock,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useAuth } from '@/stores/authStore'
import { tournamentService, type PlayerTournamentData } from '@/services/api/tournamentService'
import type { Tournament } from '@/types'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay },
})

const cardHover = {
  whileHover: { y: -3, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
}

export default function PlayerDashboard() {
  const { user } = useAuth()
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([])
  const [playerData, setPlayerData] = useState<PlayerTournamentData>({
    tournaments: [],
    count: 0,
    paymentStatus: 'None',
    activeMatch: null,
  })
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      try {
        const [tourneys, pData] = await Promise.all([
          tournamentService.list(),
          tournamentService.getMyTournaments({ email: user?.email, ign: user?.ign }),
        ])

        if (!isMounted) return
        setAllTournaments(tourneys)

        // Check local storage for any client-side registered tournaments
        const localRegisteredIds = new Set<string>()
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('rdk_registered_')) {
              localRegisteredIds.add(key.replace('rdk_registered_', ''))
            }
          }
        } catch {}

        if (user?.tournamentId) {
          localRegisteredIds.add(user.tournamentId)
        }

        // Merge server and local registrations
        const combinedTourneys = [...pData.tournaments]
        localRegisteredIds.forEach((id) => {
          if (!combinedTourneys.some((t) => t.id === id)) {
            const match = tourneys.find((t) => t.id === id)
            if (match) combinedTourneys.push(match)
          }
        })

        // Determine active match with published room info
        let activeMatch = pData.activeMatch
        if (!activeMatch) {
          const liveOrRoomTourney = combinedTourneys.find(
            (t) => (t.status === 'live' || t.roomPublished) && (t.roomId || t.scheduledMatchInfo)
          )
          if (liveOrRoomTourney) {
            activeMatch = {
              tournamentId: liveOrRoomTourney.id,
              tournamentName: liveOrRoomTourney.name,
              game: liveOrRoomTourney.game,
              roomId: liveOrRoomTourney.roomPublished ? liveOrRoomTourney.roomId : undefined,
              roomPassword: liveOrRoomTourney.roomPublished ? liveOrRoomTourney.roomPassword : undefined,
              status: liveOrRoomTourney.status,
              scheduledMatchInfo: liveOrRoomTourney.scheduledMatchInfo || 'Match in progress',
            }
          }
        }

        const totalCount = combinedTourneys.length
        let paymentStatus = pData.paymentStatus
        if (totalCount === 0) {
          paymentStatus = 'None'
        } else if (paymentStatus === 'None' && totalCount > 0) {
          paymentStatus = 'Verified'
        }

        setPlayerData({
          tournaments: combinedTourneys,
          count: totalCount,
          paymentStatus,
          activeMatch,
        })
      } catch (err) {
        console.error('Failed to load player dashboard data:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [user?.email, user?.ign, user?.tournamentId])

  // Filter only strictly ACTIVE (non-finished, non-closed) tournaments for the featured section
  const activeFeaturedTournaments = useMemo(() => {
    return allTournaments.filter((t) => {
      const st = String(t.status || '').toLowerCase()
      const isEnded =
        st === 'completed' ||
        st === 'finished' ||
        st === 'closed' ||
        st === 'ended' ||
        Boolean((t as any).isClosed) ||
        Boolean((t as any).closedAt) ||
        (t.endDate
          ? new Date(t.endDate).getTime() < Date.now()
          : t.startDate
          ? new Date(t.startDate).getTime() + 86400000 < Date.now()
          : false) ||
        (t.registrationClosing ? new Date(t.registrationClosing).getTime() < Date.now() : false)

      return !isEnded && (st === 'registration_open' || st === 'live' || st === 'upcoming')
    })
  }, [allTournaments])

  const handleCopyRoom = () => {
    if (!playerData.activeMatch) return
    const text = `Room ID: ${playerData.activeMatch.roomId || 'TBA'} | Pass: ${playerData.activeMatch.roomPassword || 'TBA'} | ${playerData.activeMatch.tournamentName}`
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const registeredCount = playerData.count
  const isNewUser = registeredCount === 0

  return (
    <div className="space-y-7 page-enter max-w-6xl">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'Gamer'}!`}
        description={`IGN: ${user?.ign || 'Active Competitor'} · Competitive Player Account`}
        badge="Player Dashboard"
        actions={
          <Link to="/#tournaments" className="btn-primary cursor-pointer">
            <Trophy className="size-4" />
            Browse Tournaments
          </Link>
        }
      />

      {/* ── Stat Cards (Live Dynamic Data) ── */}
      <motion.div {...fadeUp(0)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="My Active Squad"
          value={user?.teamName || 'Free Agent'}
          hint={user?.teamName ? 'Registered Clan / Squad' : 'Ready for tournament entry'}
          icon={<Users className="size-4" />}
          accent="white"
        />
        <StatCard
          label="My Tournaments"
          value={String(registeredCount)}
          hint={
            registeredCount === 0
              ? 'No active tournament entries'
              : `${registeredCount} championship${registeredCount > 1 ? 's' : ''} enrolled`
          }
          icon={<Gamepad2 className="size-4" />}
          accent={registeredCount > 0 ? 'gold' : 'white'}
        />
        <StatCard
          label="Payment Status"
          value={isNewUser ? 'None' : playerData.paymentStatus}
          hint={
            isNewUser
              ? 'No entry fees submitted'
              : playerData.tournaments[0]?.name || 'Active tournament verification'
          }
          icon={<CheckCircle2 className="size-4" />}
          accent={isNewUser ? 'white' : playerData.paymentStatus === 'Verified' ? 'success' : 'gold'}
        />
      </motion.div>

      {/* ── Live Match Room Alert OR Get Started Callout ── */}
      <motion.div {...fadeUp(0.1)}>
        {playerData.activeMatch && playerData.activeMatch.roomId ? (
          <div
            className="rdk-card animate-border-glow"
            style={{ background: 'linear-gradient(135deg, rgba(245,26,26,0.06) 0%, rgba(245,26,26,0.02) 100%)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/70 to-transparent rounded-t-xl" />

            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                  <ShieldCheck className="size-6 text-primary" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-heading text-base font-bold text-foreground">
                      Live Match: {playerData.activeMatch.tournamentName}
                    </span>
                    <StatusBadge status={playerData.activeMatch.status as any || 'live'} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-body mt-1">
                    <span className="text-muted-foreground">Room ID:</span>
                    <code className="font-mono text-foreground font-bold bg-surface px-2.5 py-0.5 rounded-md text-[12px] border border-border">
                      {playerData.activeMatch.roomId}
                    </code>
                    <span className="text-muted-foreground">Pass:</span>
                    <code className="font-mono text-foreground font-bold bg-surface px-2.5 py-0.5 rounded-md text-[12px] border border-border">
                      {playerData.activeMatch.roomPassword || 'None'}
                    </code>
                    <span className="text-muted-foreground">
                      Status: <span className="text-emerald-400 font-semibold">{playerData.activeMatch.scheduledMatchInfo}</span>
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCopyRoom}
                className={`btn-primary shrink-0 cursor-pointer transition-all ${
                  copied ? '!bg-emerald-600 !border-emerald-500' : ''
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy Room Info
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="rdk-card border border-border/70 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(245,26,26,0.03) 100%)' }}
          >
            <div className="flex items-start sm:items-center gap-4">
              <div className="size-12 rounded-2xl bg-surface border border-border flex items-center justify-center text-primary shrink-0 shadow-sm">
                <Swords className="size-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-heading text-base font-bold text-foreground">
                    {registeredCount > 0
                      ? 'No Live Match Lobbies Right Now'
                      : 'Welcome to RDK Esports Arena'}
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {registeredCount > 0 ? 'Standby' : 'Ready to Join'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-body max-w-xl leading-relaxed">
                  {registeredCount > 0
                    ? 'Your registrations are active. Match room credentials will appear here 15 minutes before match start.'
                    : 'You are not enrolled in any tournaments yet. Join open championships to secure your squad slot and receive custom room credentials.'}
                </p>
              </div>
            </div>
            <Link to="/#tournaments" className="btn-primary shrink-0 whitespace-nowrap cursor-pointer">
              <Trophy className="size-4" />
              Explore Open Tournaments
            </Link>
          </div>
        )}
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div {...fadeUp(0.18)}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: Trophy,
              title: 'Join a Tournament',
              desc: 'Browse & register for upcoming championships',
              href: '/#tournaments',
              color: 'text-primary',
              bg: 'bg-primary/08',
              border: 'border-primary/18',
            },
            {
              icon: Star,
              title: 'View Leaderboards',
              desc: 'Check your ranking and points standing',
              href: '/#tournaments',
              color: 'text-amber-400',
              bg: 'bg-amber-500/08',
              border: 'border-amber-500/18',
            },
            {
              icon: TrendingUp,
              title: 'Match History',
              desc: 'Review your past tournament performance',
              href: '/#tournaments',
              color: 'text-purple-400',
              bg: 'bg-purple-500/08',
              border: 'border-purple-500/18',
            },
          ].map((action) => (
            <motion.div key={action.title} {...cardHover}>
              <Link
                to={action.href}
                className={`flex items-center gap-4 p-4 rounded-xl border ${action.border} ${action.bg} hover:border-opacity-40 transition-all duration-200 group cursor-pointer`}
              >
                <div className={`size-10 rounded-xl border flex items-center justify-center shrink-0 ${action.color} ${action.bg} ${action.border}`}>
                  <action.icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm font-bold text-foreground">{action.title}</p>
                  <p className="text-[11px] text-muted-foreground font-body mt-0.5">{action.desc}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Featured Active Tournaments ── */}
      <motion.div {...fadeUp(0.25)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-md bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Swords className="size-3 text-primary" />
            </div>
            <h2 className="font-heading text-base font-bold tracking-wide text-foreground">
              Featured Active Tournaments
            </h2>
          </div>
          <Link
            to="/#tournaments"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-light transition-colors font-body font-semibold"
          >
            Browse all <ArrowRight className="size-3" />
          </Link>
        </div>

        {activeFeaturedTournaments.length === 0 ? (
          <div className="rdk-card-flat p-10 text-center">
            <div className="size-14 rounded-2xl bg-primary/08 border border-primary/15 flex items-center justify-center mx-auto mb-4">
              <Zap className="size-6 text-primary/40" />
            </div>
            <p className="font-heading text-base font-bold text-foreground">No active tournaments open for entry right now</p>
            <p className="text-xs text-muted-foreground mt-1 font-body">Finished tournaments are archived. Check back soon for new open championships!</p>
            <Link to="/#tournaments" className="btn-ghost text-xs gap-1.5 mt-4 inline-flex">
              View All Tournaments & Results <ChevronRight className="size-3" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeFeaturedTournaments.slice(0, 2).map((t, idx) => (
              <motion.div
                key={t.id}
                className="tournament-card p-5 flex flex-col justify-between gap-4 cursor-default"
                {...fadeUp(0.08 * idx)}
                whileHover={{ y: -3 }}
              >
                {/* Top: game badge + status */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="badge-red">{t.game}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-body">
                      <Calendar className="size-3" />
                      {t.startDate}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground leading-snug">
                    {t.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 font-body">
                    Hosted by <span className="text-foreground/80">{t.creatorName || 'Official Partner'}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] text-muted-foreground uppercase tracking-[0.15em] font-body mb-0.5">
                      Prize Pool
                    </span>
                    <span
                      className="text-base font-bold font-body"
                      style={{
                        background: 'linear-gradient(135deg, #FFB800, #FF8C00)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {t.prizePool || '₹25,000'}
                    </span>
                  </div>
                  <Link
                    to={`/tournaments/${t.id}`}
                    className="btn-primary text-xs gap-1.5 cursor-pointer py-1.5 px-3.5"
                  >
                    View & Register <ChevronRight className="size-3" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
