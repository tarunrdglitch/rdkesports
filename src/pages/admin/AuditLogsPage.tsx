import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText, ShieldCheck, Search, RefreshCw,
  User, AlertTriangle, Receipt, Gavel, Trophy, Users,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/stores/authStore'

interface AuditLog {
  id: string; tournamentId?: string; action: string
  actorId?: string; actorName?: string; actorRole?: string
  details?: string; oldValue?: string; newValue?: string
  reason?: string; createdAt: string
}

export default function AuditLogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionCategory, setActionCategory] = useState<string>('all')

  useEffect(() => { loadAuditLogs() }, [])

  const loadAuditLogs = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/audit-logs?limit=200')
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setTotalCount(data.count || 0)
      }
    } catch { } finally { setIsLoading(false) }
  }

  const getActionCategory = (action: string) => {
    const a = action.toUpperCase()
    if (a.includes('SETTLEMENT')) return 'settlement'
    if (a.includes('CREATOR') || a.includes('PARTNER')) return 'partner'
    if (a.includes('AUCTION')) return 'auction'
    if (a.includes('ROOM')) return 'room'
    if (a.includes('TOURNAMENT')) return 'tournament'
    return 'other'
  }

  const getActionBadge = (action: string) => {
    const a = action.toUpperCase()
    if (a.includes('VERIFIED') || a.includes('APPROVED'))
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
    if (a.includes('REJECTED') || a.includes('DECOMMISSIONED') || a.includes('DELETED'))
      return 'bg-red-500/15 text-red-400 border-red-500/25'
    if (a.includes('REVERSED') || a.includes('SUSPENDED'))
      return 'bg-amber-500/15 text-amber-400 border-amber-500/25'
    if (a.includes('SETTLEMENT')) return 'bg-blue-500/15 text-blue-400 border-blue-500/25'
    if (a.includes('AUCTION'))    return 'bg-purple-500/15 text-purple-400 border-purple-500/25'
    return 'bg-primary/12 text-primary border-primary/25'
  }

  const filteredLogs = logs.filter(log => {
    const matchesCat = actionCategory === 'all' || getActionCategory(log.action) === actionCategory
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      log.action.toLowerCase().includes(q) ||
      (log.actorName?.toLowerCase().includes(q)) ||
      (log.details?.toLowerCase().includes(q)) ||
      (log.reason?.toLowerCase().includes(q)) ||
      (log.tournamentId?.toLowerCase().includes(q))
    return matchesCat && matchesSearch
  })

  const settlementCount = logs.filter(l => getActionCategory(l.action) === 'settlement').length
  const partnerCount    = logs.filter(l => getActionCategory(l.action) === 'partner').length
  const auctionCount    = logs.filter(l => getActionCategory(l.action) === 'auction').length

  const CATS = [
    { id: 'all', label: 'All Events' },
    { id: 'settlement', label: 'Settlements' },
    { id: 'partner', label: 'Partners' },
    { id: 'auction', label: 'Auctions' },
    { id: 'room', label: 'Room Dispatch' },
    { id: 'tournament', label: 'Tournaments' },
  ]

  return (
    <div className="space-y-6 max-w-full">
      <PageHeader
        title="Platform Audit Log"
        description="Immutable trail of every credential change, status modification, room dispatch, auction bid reversal, and settlement."
        badge="Security & Operations"
        actions={
          <button
            onClick={loadAuditLogs}
            className="btn-ghost text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: logs.length, hint: 'Platform-wide', color: 'text-foreground', bg: 'bg-card', border: 'border-border', icon: FileText, icolor: 'text-muted-foreground' },
          { label: 'Settlements', value: settlementCount, hint: '10% fee events', color: 'text-emerald-400', bg: 'bg-emerald-500/05', border: 'border-emerald-500/20', icon: Receipt, icolor: 'text-emerald-400' },
          { label: 'Partner Events', value: partnerCount, hint: 'Status & credentials', color: 'text-primary', bg: 'bg-primary/05', border: 'border-primary/20', icon: ShieldCheck, icolor: 'text-primary' },
          { label: 'Auction Events', value: auctionCount, hint: 'Bids & reversals', color: 'text-purple-400', bg: 'bg-purple-500/05', border: 'border-purple-500/20', icon: Gavel, icolor: 'text-purple-400' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            className={`rounded-2xl border p-4 ${card.bg} ${card.border}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-bold tracking-[0.12em] text-muted-foreground/70 font-body">{card.label}</span>
              <card.icon className={`size-4 ${card.icolor}`} />
            </div>
            <p className={`font-display text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1 font-body">{card.hint}</p>
          </motion.div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="rdk-card p-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search action, actor, details…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="rdk-input pl-9 py-2 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap sm:ml-auto">
          {CATS.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActionCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold font-body whitespace-nowrap transition-all duration-200 cursor-pointer ${
                actionCategory === cat.id
                  ? 'bg-primary text-white shadow-glow-red-sm'
                  : 'text-muted-foreground border border-border hover:text-foreground hover:bg-surface'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log Table */}
      {isLoading ? (
        <div className="rdk-card p-16 text-center">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground mt-3 font-body">Loading audit records…</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rdk-card p-16 text-center">
          <div className="size-12 rounded-2xl bg-primary/08 border border-primary/15 flex items-center justify-center mx-auto mb-3">
            <FileText className="size-5 text-primary/40" />
          </div>
          <p className="text-xs text-muted-foreground font-body">No audit log records matching your filters.</p>
        </div>
      ) : (
        <div className="rdk-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Timestamp', 'Action Event', 'Actor & Role', 'Details', 'Context'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70 font-body">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx, 20) * 0.02 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border inline-block ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground font-body text-[11px]">
                        <User className="size-3 text-muted-foreground shrink-0" />
                        {log.actorName || 'System'}
                      </div>
                      <span className="text-[9px] uppercase font-mono text-muted-foreground/60 ml-4.5">
                        {log.actorRole || 'system'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-[11px] text-foreground/80 leading-relaxed font-body">{log.details || '—'}</p>
                      {log.reason && (
                        <p className="text-[10px] text-amber-400/80 font-body mt-0.5">
                          <span className="font-bold">Reason:</span> {log.reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[10px]">
                      {log.oldValue || log.newValue ? (
                        <div className="font-mono space-y-0.5">
                          {log.oldValue && <div className="text-red-400">— {log.oldValue}</div>}
                          {log.newValue && <div className="text-emerald-400">+ {log.newValue}</div>}
                        </div>
                      ) : log.tournamentId ? (
                        <Link to={`/creator/tournaments/${log.tournamentId}`}
                          className="font-mono text-[10px] text-primary hover:underline">
                          ID: {log.tournamentId.slice(0, 12)}…
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
