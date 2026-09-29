import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Gamepad2,
  Users,
  Trophy,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/stores/authStore'
import { tournamentService } from '@/services/api/tournamentService'
import type { Tournament } from '@/types'

export default function PlayerDashboard() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])

  useEffect(() => {
    tournamentService.list().then(setTournaments)
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.name || 'Gamer'}!`}
        description={`IGN: ${user?.ign || 'Active Competitor'} • Role: ${user?.role === 'team_captain' ? 'Team Captain' : 'Competitive Player'}`}
        actions={
          <Link
            to="/#tournaments"
            className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-xs font-semibold text-background shadow hover:opacity-90 transition"
          >
            <Trophy className="size-4" />
            Join Tournaments
          </Link>
        }
      />

      {/* Highlights / Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>My Active Squad</span>
            <Users className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">
            {user?.role === 'team_captain' ? 'Aura Esports (Captain)' : 'Free Agent / Available'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Ready for tournament entry</p>
        </div>

        <div className="rounded border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>My Tournaments</span>
            <Gamepad2 className="size-4 text-warning" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">2</p>
          <p className="mt-1 text-[11px] text-muted-foreground">1 match scheduled today</p>
        </div>

        <div className="rounded border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Payment Status</span>
            <QrCode className="size-4 text-success" />
          </div>
          <p className="mt-2 text-xl font-bold text-success flex items-center gap-1.5">
            <CheckCircle2 className="size-5" />
            Verified
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Clashers Championship 2026</p>
        </div>
      </div>

      {/* Match Room Alert Box */}
      <div className="rounded-lg border border-primary/40 bg-primary/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="size-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 animate-pulse">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">Next Match: Clashers Championship (Round 2)</span>
              <span className="rounded bg-danger/20 text-danger text-[10px] font-bold px-1.5 py-0.5 uppercase">Lobby Live</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Room ID: <code className="font-mono text-foreground font-semibold bg-muted px-1.5 py-0.5 rounded">8492011</code> • Pass: <code className="font-mono text-foreground font-semibold bg-muted px-1.5 py-0.5 rounded">rdk2026</code> • Map: Bermuda
            </p>
          </div>
        </div>
        <button
          onClick={() => alert('Credentials copied to clipboard!')}
          className="rounded border border-primary bg-primary px-3 py-1.5 text-xs font-bold text-background hover:opacity-90 shrink-0"
        >
          Copy Room Info
        </button>
      </div>

      {/* Recommended Live Tournaments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-foreground">Featured Tournaments for Your Squad</h2>
          <Link to="/#tournaments" className="text-xs text-primary hover:underline flex items-center gap-1">
            Browse all <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tournaments.slice(0, 2).map((t) => (
            <div key={t.id} className="rounded border border-border bg-card p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">{t.game}</span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" /> {t.startDate}
                  </span>
                </div>
                <h3 className="font-bold text-base text-foreground mt-1">{t.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Hosted by {t.creatorName || 'Official Partner'}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Prize Pool</span>
                  <span className="text-xs font-bold text-foreground">{t.prizePool || '₹25,000'}</span>
                </div>
                <Link
                  to="/#tournaments"
                  className="rounded bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-primary hover:text-background transition"
                >
                  View Tournament
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
