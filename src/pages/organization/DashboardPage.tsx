import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Trophy, Plus, ExternalLink, Settings, Trash2,
  BarChart3, Users, Coins, ShieldCheck, Gamepad2, TrendingUp, Gavel,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Skeleton } from '@/components/common/Skeleton'
import { useTournaments } from '@/hooks/useTournaments'
import { useAuth } from '@/stores/authStore'
import type { Tournament } from '@/types'

const ACCENT_ICONS = [
  { icon: Trophy, accent: 'red' as const },
  { icon: Users, accent: 'white' as const },
  { icon: Coins, accent: 'gold' as const },
  { icon: ShieldCheck, accent: 'success' as const },
]

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useTournaments()
  const user = useAuth((s) => s.user)
  const [stats, setStats] = useState([
    { label: 'Active Tournaments', value: '0', hint: 'Running now' },
    { label: 'Registered Teams', value: '0', hint: '0 total entries' },
    { label: 'Pending Payments', value: '0', hint: '₹0 to verify' },
    { label: 'Total Players', value: '0', hint: 'Registered gamers' },
  ])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tournaments/stats')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setStats(d) })
      .catch(() => {})
  }, [])

  const handleDeleteTournament = async (t: Tournament) => {
    if (!window.confirm(`Delete "${t.name}"? This cannot be undone.`)) return
    try {
      setDeletingId(t.id)
      const res = await fetch(`/api/tournaments/${t.id}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      })
      const resp = await res.json()
      if (res.ok) {
        refetch()
        fetch('/api/tournaments/stats').then(r => r.json()).then(d => { if (Array.isArray(d)) setStats(d) }).catch(() => {})
      } else {
        alert(resp.error || 'Failed to delete')
      }
    } catch (e: any) {
      alert(e.message || 'Error deleting tournament')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-full">
      <PageHeader
        title="Creator & Tournament Overview"
        description="Monitor championships, match schedules, credentials, and tournament registrations."
        badge="Control Center"
        actions={
          <Link to="/creator/tournaments/create" className="btn-primary">
            <Plus className="size-4" />
            New Tournament
          </Link>
        }
      />

      {/* Stat Cards */}
      <motion.div
        initial="h" animate="s"
        variants={{ s: { transition: { staggerChildren: 0.07 } } }}
        className="grid grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {stats.map((s, i) => {
          const { icon: Icon, accent } = ACCENT_ICONS[i] ?? ACCENT_ICONS[0]
          return (
            <motion.div key={s.label} variants={{ h: { opacity: 0, y: 12 }, s: { opacity: 1, y: 0 } }}>
              <StatCard {...s} icon={<Icon className="size-4" />} accent={accent} />
            </motion.div>
          )
        })}
      </motion.div>

      {/* Tournaments Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-md bg-primary/12 border border-primary/20 flex items-center justify-center">
              <Gamepad2 className="size-3 text-primary" />
            </div>
            <h2 className="font-heading text-base font-bold text-foreground tracking-wide">
              All Hosted Tournaments
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-body font-semibold px-2.5 py-1 rounded-lg bg-surface border border-border">
            {data?.length || 0} total events
          </span>
        </div>

        <div className="rdk-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Tournament', 'Game', 'Format', 'Teams', 'Status', 'Start Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70 font-body">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td colSpan={7} className="px-4 py-3">
                      <Skeleton className="h-5 rounded-lg" />
                    </td>
                  </tr>
                ))}
                {isError && (
                  <tr>
                    <td colSpan={7} className="py-14 text-center">
                      <p className="text-xs text-muted-foreground font-body">
                        Couldn't load tournaments.{' '}
                        <button onClick={() => refetch()} className="text-primary font-bold hover:underline cursor-pointer">
                          Try again
                        </button>
                      </p>
                    </td>
                  </tr>
                )}
                {data?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="size-12 rounded-2xl bg-primary/08 border border-primary/15 flex items-center justify-center mx-auto mb-3">
                        <Trophy className="size-5 text-primary/40" />
                      </div>
                      <p className="text-xs text-muted-foreground font-body">
                        No tournaments yet. Create your first one above!
                      </p>
                    </td>
                  </tr>
                )}
                {data?.map((t, idx) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="group transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Trophy className="size-3 text-primary" />
                        </div>
                        <span className="font-heading font-bold text-foreground text-[13px] leading-tight">
                          {t.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-body bg-surface border border-border text-foreground/80">
                        {t.game}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-body text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{t.format}</span>
                        {(t.format === 'Auction Tournament' || t.format?.toLowerCase().includes('auction')) && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                            <Gavel className="size-2.5" />
                            AUCTION
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold font-body text-foreground tabular-nums">{t.teams}</span>
                      <span className="text-muted-foreground font-body">/{t.maxTeams}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground font-body text-[11px]">{t.startDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/creator/tournaments/${t.id}/manage`}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold font-body text-primary bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white px-2.5 py-1.5 rounded-lg transition-all duration-200"
                        >
                          <Settings className="size-3" />
                          Manage
                        </Link>
                        {(t.format === 'Auction Tournament' || t.format?.toLowerCase().includes('auction')) && (
                          <Link
                            to={`/creator/tournaments/${t.id}/manage?tab=auction`}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold font-body text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 hover:text-black px-2.5 py-1.5 rounded-lg transition-all duration-200"
                            title="Live Auction Stage"
                          >
                            <Gavel className="size-3" />
                            Auction Stage
                          </Link>
                        )}
                        <Link
                          to={`/tournaments/${t.id}`}
                          target="_blank"
                          className="size-7 flex items-center justify-center rounded-lg bg-surface border border-border text-muted-foreground hover:text-foreground hover:border-border-strong transition-all duration-200"
                          title="View Public Page"
                        >
                          <ExternalLink className="size-3" />
                        </Link>
                        {(user?.role === 'super_admin' || user?.id === t.creatorId || user?.organizationId === t.creatorId) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTournament(t)}
                            disabled={deletingId === t.id}
                            className="size-7 flex items-center justify-center rounded-lg bg-danger/08 border border-danger/20 text-danger/60 hover:text-danger hover:bg-danger/15 hover:border-danger/35 transition-all duration-200 disabled:opacity-40 cursor-pointer"
                            title="Delete Tournament"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
