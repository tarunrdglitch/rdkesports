import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, Plus, ExternalLink, Settings, ShieldCheck, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Skeleton } from '@/components/common/Skeleton'
import { useTournaments } from '@/hooks/useTournaments'

const initialStats = [
  { label: 'Active tournaments', value: '0', hint: 'No active tournaments' },
  { label: 'Registered teams', value: '0', hint: '0 registered' },
  { label: 'Pending payments', value: '0', hint: '₹0 to verify' },
  { label: 'Active ambassadors', value: '0', hint: '0 assigned' },
]

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useTournaments()
  const [stats, setStats] = useState(initialStats)

  useEffect(() => {
    fetch('/api/tournaments/stats')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setStats(d)
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <PageHeader
        title="Creator & Tournament Overview"
        description="Monitor championship schedules, room credentials distribution, and incoming UPI team payment proofs."
        actions={
          <Link
            to="/creator/tournaments/create"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-heading font-black text-background hover:bg-primary/90 transition shadow-[0_0_15px_rgba(255,46,0,0.3)]"
          >
            <Plus className="size-4" />
            Create Tournament
          </Link>
        }
      />

      <motion.div
        initial="h"
        animate="s"
        variants={{ s: { transition: { staggerChildren: 0.06 } } }}
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {stats.map((s) => (
          <motion.div
            key={s.label}
            variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }}
          >
            <StatCard {...s} />
          </motion.div>
        ))}
      </motion.div>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-base text-foreground uppercase tracking-wider">
            All Hosted Tournaments
          </h2>
          <span className="text-xs text-muted-foreground">
            {data?.length || 0} events in database
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[700px] text-xs">
            <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground font-semibold">
              <tr>
                {['Tournament', 'Game', 'Format', 'Teams', 'Status', 'Start Date', 'Actions'].map(
                  (h) => (
                    <th key={h} className="px-4 py-3">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="p-3">
                      <Skeleton className="h-6" />
                    </td>
                  </tr>
                ))}
              {isError && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-xs">
                    Couldn't load tournaments.{' '}
                    <button onClick={() => refetch()} className="text-primary font-bold">
                      Try again
                    </button>
                  </td>
                </tr>
              )}
              {data?.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                    No tournaments created yet. Launch your first tournament above!
                  </td>
                </tr>
              )}
              {data?.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-foreground">
                    <div className="flex items-center gap-2">
                      <Trophy className="size-4 text-primary shrink-0" />
                      <span>{t.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-muted px-2 py-0.5 rounded font-medium text-foreground">
                      {t.game}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.format}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold">
                    {t.teams}/{t.maxTeams}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.startDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/creator/tournaments/${t.id}/manage`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded"
                      >
                        <Settings className="size-3" />
                        Manage & Rooms
                      </Link>
                      <Link
                        to={`/tournaments/${t.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded"
                        title="View Public Page"
                      >
                        <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
