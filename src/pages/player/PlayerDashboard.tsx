import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Gamepad2,
  Users,
  Trophy,
  QrCode,
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
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useAuth } from '@/stores/authStore'
import { tournamentService } from '@/services/api/tournamentService'
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
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    tournamentService.list().then(setTournaments)
  }, [])

  const handleCopyRoom = () => {
    navigator.clipboard.writeText('Room ID: 8492011 | Pass: rdk2026 | Map: Bermuda').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-7 page-enter max-w-6xl">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'Gamer'}!`}
        description={`IGN: ${user?.ign || 'Active Competitor'} · Competitive Player`}
        badge="Player Dashboard"
        actions={
          <Link to="/#tournaments" className="btn-primary cursor-pointer">
            <Trophy className="size-4" />
            Browse Tournaments
          </Link>
        }
      />

      {/* ── Stat Cards ── */}
      <motion.div {...fadeUp(0)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="My Active Squad"
          value="Free Agent"
          hint="Ready for tournament entry"
          icon={<Users className="size-4" />}
          accent="white"
        />
        <StatCard
          label="My Tournaments"
          value="2"
          hint="1 match scheduled today"
          icon={<Gamepad2 className="size-4" />}
          accent="gold"
        />
        <StatCard
          label="Payment Status"
          value="Verified"
          hint="Clashers Championship 2026"
          icon={<CheckCircle2 className="size-4" />}
          accent="success"
        />
      </motion.div>

      {/* ── Live Match Room Alert ── */}
      <motion.div {...fadeUp(0.1)}>
        <div
          className="rdk-card animate-border-glow"
          style={{ background: 'linear-gradient(135deg, rgba(245,26,26,0.05) 0%, rgba(245,26,26,0.02) 100%)' }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent rounded-t-xl" />

          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              {/* Icon */}
              <div className="size-12 rounded-2xl bg-primary/12 border border-primary/25 flex items-center justify-center text-primary shrink-0">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-heading text-base font-bold text-foreground">
                    Next Match: Clashers Championship — Round 2
                  </span>
                  <StatusBadge status="live" />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-body mt-1">
                  <span className="text-muted-foreground">Room ID:</span>
                  <code className="font-mono text-foreground font-bold bg-surface px-2 py-0.5 rounded-md text-[11px] border border-border">
                    8492011
                  </code>
                  <span className="text-muted-foreground">Pass:</span>
                  <code className="font-mono text-foreground font-bold bg-surface px-2 py-0.5 rounded-md text-[11px] border border-border">
                    rdk2026
                  </code>
                  <span className="text-muted-foreground">Map: <span className="text-foreground font-semibold">Bermuda</span></span>
                </div>
              </div>
            </div>
            <button
              onClick={handleCopyRoom}
              className={`btn-primary shrink-0 cursor-pointer transition-all ${copied ? '!bg-emerald-600 !border-emerald-500' : ''}`}
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
          ].map((action, i) => (
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

      {/* ── Featured Tournaments ── */}
      <motion.div {...fadeUp(0.25)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-md bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Swords className="size-3 text-primary" />
            </div>
            <h2 className="font-heading text-base font-bold tracking-wide text-foreground">
              Featured Tournaments
            </h2>
          </div>
          <Link
            to="/#tournaments"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-light transition-colors font-body font-semibold"
          >
            Browse all <ArrowRight className="size-3" />
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="rdk-card-flat p-10 text-center">
            <div className="size-14 rounded-2xl bg-primary/08 border border-primary/15 flex items-center justify-center mx-auto mb-4">
              <Zap className="size-6 text-primary/40" />
            </div>
            <p className="font-heading text-base font-bold text-foreground">No tournaments available yet</p>
            <p className="text-xs text-muted-foreground mt-1 font-body">Check back soon for new championships!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tournaments.slice(0, 2).map((t, idx) => (
              <motion.div
                key={t.id}
                className="tournament-card p-5 flex flex-col justify-between gap-4 cursor-default"
                {...fadeUp(0.08 * idx)}
                whileHover={{ y: -3 }}
              >
                {/* Top: game badge + date */}
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
                    className="btn-ghost text-xs gap-1.5 cursor-pointer"
                  >
                    View Details <ChevronRight className="size-3" />
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
