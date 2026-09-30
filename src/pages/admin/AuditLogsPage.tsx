import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  AlertTriangle,
  Receipt,
  Gavel,
  KeyRound,
  Trophy,
  Users,
  ChevronDown,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/stores/authStore'

interface AuditLog {
  id: string
  tournamentId?: string
  action: string
  actorId?: string
  actorName?: string
  actorRole?: string
  details?: string
  oldValue?: string
  newValue?: string
  reason?: string
  createdAt: string
}

export default function AuditLogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionCategory, setActionCategory] = useState<string>('all')

  useEffect(() => {
    loadAuditLogs()
  }, [])

  const loadAuditLogs = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/audit-logs?limit=200')
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setTotalCount(data.count || 0)
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false)
    }
  }

  const getActionCategory = (action: string) => {
    const act = action.toUpperCase()
    if (act.includes('SETTLEMENT')) return 'settlement'
    if (act.includes('CREATOR') || act.includes('PARTNER')) return 'partner'
    if (act.includes('AUCTION')) return 'auction'
    if (act.includes('ROOM')) return 'room'
    if (act.includes('TOURNAMENT')) return 'tournament'
    return 'other'
  }

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase()
    if (act.includes('VERIFIED') || act.includes('APPROVED')) {
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    }
    if (act.includes('REJECTED') || act.includes('DECOMMISSIONED') || act.includes('DELETED')) {
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    if (act.includes('REVERSED') || act.includes('SUSPENDED')) {
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    }
    if (act.includes('SETTLEMENT')) {
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
    if (act.includes('AUCTION')) {
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    }
    return 'bg-primary/20 text-primary border-primary/30'
  }

  const filteredLogs = logs.filter((log) => {
    const matchesCategory =
      actionCategory === 'all' || getActionCategory(log.action) === actionCategory
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      log.action.toLowerCase().includes(q) ||
      (log.actorName && log.actorName.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q)) ||
      (log.reason && log.reason.toLowerCase().includes(q)) ||
      (log.tournamentId && log.tournamentId.toLowerCase().includes(q))
    return matchesCategory && matchesSearch
  })

  // Category counts
  const settlementLogsCount = logs.filter((l) => getActionCategory(l.action) === 'settlement').length
  const partnerLogsCount = logs.filter((l) => getActionCategory(l.action) === 'partner').length
  const auctionLogsCount = logs.filter((l) => getActionCategory(l.action) === 'auction').length

  return (
    <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4 space-y-6">
      <PageHeader
        title="Platform Security & Operational Audit Log"
        description="Immutable audit trail powered by RDK Technologies. Every partner credential change, status modification, room dispatch, auction bid reversal, and 10% platform settlement is permanently recorded."
        actions={
          <button
            onClick={loadAuditLogs}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded px-3 py-1.5 transition-colors"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh Logs</span>
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
            Total Audit Entries
          </span>
          <div className="text-2xl font-heading font-black text-foreground">{logs.length}</div>
          <span className="text-[11px] text-muted-foreground block mt-1">Platform-wide events</span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-1">
            Settlement Events
          </span>
          <div className="text-2xl font-heading font-black text-emerald-400">
            {settlementLogsCount}
          </div>
          <span className="text-[11px] text-emerald-500/80 block mt-1">
            10% fee submissions & verifications
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
            Official Partner Events
          </span>
          <div className="text-2xl font-heading font-black text-primary">
            {partnerLogsCount}
          </div>
          <span className="text-[11px] text-muted-foreground block mt-1">
            Status changes & password resets
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
            Live Auction Events
          </span>
          <div className="text-2xl font-heading font-black text-purple-400">
            {auctionLogsCount}
          </div>
          <span className="text-[11px] text-muted-foreground block mt-1">
            Bids & reverse sold transactions
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search action, actor, details, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'settlement', label: 'Settlements' },
            { id: 'partner', label: 'Partners' },
            { id: 'auction', label: 'Auctions' },
            { id: 'room', label: 'Room Dispatch' },
            { id: 'tournament', label: 'Tournaments' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActionCategory(cat.id)}
              className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap transition-colors ${
                actionCategory === cat.id
                  ? 'bg-primary text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      {isLoading ? (
        <div className="p-12 text-center">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center border border-border rounded-xl bg-card">
          <FileText className="size-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-xs text-muted-foreground">
            No audit log records found matching your filter criteria.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-xs">
            <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action Event</th>
                <th className="px-4 py-3">Actor & Role</th>
                <th className="px-4 py-3">Event Details</th>
                <th className="px-4 py-3">Context & Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border inline-block ${getActionBadgeColor(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground flex items-center gap-1">
                      <User className="size-3 text-muted-foreground" />
                      <span>{log.actorName || 'System'}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground">
                      {log.actorRole || 'system'}
                    </span>
                  </td>

                  <td className="px-4 py-3 max-w-md">
                    <p className="text-xs text-foreground leading-relaxed">
                      {log.details || '—'}
                    </p>
                    {log.reason && (
                      <p className="text-[11px] text-amber-400/90 font-medium mt-0.5">
                        <strong>Reason:</strong> {log.reason}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-[11px]">
                    {log.oldValue || log.newValue ? (
                      <div className="font-mono text-[10px] space-y-0.5">
                        {log.oldValue && (
                          <div className="text-red-400">
                            - {log.oldValue}
                          </div>
                        )}
                        {log.newValue && (
                          <div className="text-emerald-400">
                            + {log.newValue}
                          </div>
                        )}
                      </div>
                    ) : log.tournamentId ? (
                      <Link
                        to={`/creator/tournaments/${log.tournamentId}`}
                        className="font-mono text-[10px] text-primary hover:underline"
                      >
                        ID: {log.tournamentId.slice(0, 14)}…
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
