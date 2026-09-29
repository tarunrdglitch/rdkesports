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
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useAuth } from '@/stores/authStore'
import { tournamentService } from '@/services/api/tournamentService'
import type { Tournament } from '@/types'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
})

export default function PlayerDashboard() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])

  useEffect(() => {
    tournamentService.list().then(setTournaments)
  }, [])

  return (
    <div className="space-y-7 page-enter">
      <PageHeader
        title={`Welcome back, ${user?.name || 'Gamer'}!`}
        description={`IGN: ${user?.ign || 'Active Competitor'} • Competitive Player`}
        badge="Player Dashboard"
        actions={
          <Link
            to="/#tournaments"
            className="btn-primary cursor-pointer"
          >
            <Trophy className="size-4" />
            Join Tournaments
          </Link>
        }
      />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div {...fadeUp(0)}>
          <StatCard
            label="My Active Squad"
            value="Free Agent"
            hint="Ready for tournament entry"
            icon={<Users className="size-4" />}
            accent="white"
          />
        </motion.div>
        <motion.div {...fadeUp(0.06)}>
          <StatCard
            label="My Tournaments"
            value="2"
            hint="1 match scheduled today"
            icon={<Gamepad2 className="size-4" />}
            accent="warning"
          />
        </motion.div>
        <motion.div {...fadeUp(0.12)}>
          <StatCard
            label="Payment Status"
            value="Verified"
            hint="Clashers Championship 2026"
            icon={<CheckCircle2 className="size-4" />}
            accent="success"
          />
        </motion.div>
      </div>

      {/* ── Match Room Alert ── */}
      <motion.div
        {...fadeUp(0.18)}
        className="rdk-card bracket animate-border-glow"
      >
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-foreground font-body">
                  Next Match: Clashers Championship (Round 2)
                </span>
                <StatusBadge status="live" />
              </div>
              <p className="text-xs text-muted-foreground font-body leading-relaxed">
                Room ID:{' '}
                <code className="font-mono text-foreground font-semibold bg-muted px-1.5 py-0.5 rounded text-[11px]">
                  8492011
                </code>
                {' '}• Pass:{' '}
                <code className="font-mono text-foreground font-semibold bg-muted px-1.5 py-0.5 rounded text-[11px]">
                  rdk2026
                </code>
                {' '}• Map: Bermuda
              </p>
            </div>
          </div>
          <button
            onClick={() => alert('Credentials copied to clipboard!')}
            className="btn-primary shrink-0 cursor-pointer"
          >
            <QrCode className="size-4" />
            Copy Room Info
          </button>
        </div>
      </motion.div>

      {/* ── Featured Tournaments ── */}
      <motion.div {...fadeUp(0.24)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Swords className="size-4 text-primary" />
            <h2 className="font-display text-sm tracking-wide text-foreground">
              Featured Tournaments
            </h2>
          </div>
          <Link
            to="/#tournaments"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-glow transition-colors font-body"
          >
            Browse all <ArrowRight className="size-3" />
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="rdk-card-flat p-8 text-center text-muted-foreground text-sm font-body">
            <Zap className="size-8 mx-auto mb-2 text-primary/40" />
            No tournaments available right now. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tournaments.slice(0, 2).map((t, idx) => (
              <motion.div
                key={t.id}
                className="rdk-card bracket p-4 flex flex-col justify-between gap-4 cursor-default"
                {...fadeUp(0.1 * idx)}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="badge-primary">{t.game}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-body">
                      <Calendar className="size-3" />
                      {t.startDate}
                    </span>
                  </div>
                  <h3 className="font-display text-base text-foreground leading-snug tracking-wide">
                    {t.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 font-body">
                    Hosted by {t.creatorName || 'Official Partner'}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] text-muted-foreground uppercase tracking-[0.15em] font-display">
                      Prize Pool
                    </span>
                    <span className="text-sm font-semibold gradient-text-gold font-body">
                      {t.prizePool || '₹25,000'}
                    </span>
                  </div>
                  <Link
                    to="/#tournaments"
                    className="btn-ghost text-xs gap-1.5 cursor-pointer"
                  >
                    View Details <ArrowRight className="size-3" />
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
