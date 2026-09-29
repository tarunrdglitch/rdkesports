import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  IndianRupee,
  Search,
  Filter,
  RefreshCw,
  Trophy,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/stores/authStore'

interface Payment {
  id: string
  tournamentId: string
  tournamentName: string
  teamId: string
  teamName: string
  captainName: string
  amount: string
  utr: string
  screenshotUrl?: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  verifiedAt?: string
  rejectionReason?: string
}

export default function PaymentsManagementPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/payments/all')
      if (!res.ok) throw new Error('Failed to fetch payments queue')
      const data = await res.json()
      setPayments(data)
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Error loading payments')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update payment')

      setActionMsg(`Payment marked as ${status} successfully! Team is now ${status === 'approved' ? 'verified' : 'rejected'}.`)
      setTimeout(() => setActionMsg(''), 3000)
      loadPayments()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to update payment')
    }
  }

  const filtered = payments.filter((p) => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus
    const matchesSearch =
      p.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.utr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.captainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tournamentName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const pendingCount = payments.filter((p) => p.status === 'pending').length

  return (
    <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4 space-y-6">
      <PageHeader
        title="UPI Payment Verification Desk"
        description="Verify manual UPI registration payments. Approved teams automatically receive tournament room access."
        actions={
          <button
            onClick={loadPayments}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded px-3 py-1.5 transition-colors"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh Queue</span>
          </button>
        }
      />

      {/* Notifications */}
      {actionMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Summary Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Pending Queue
          </span>
          <span className="text-2xl font-heading font-black text-amber-400">
            {pendingCount}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">Awaiting manual check</span>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Approved & Verified
          </span>
          <span className="text-2xl font-heading font-black text-emerald-400">
            {payments.filter((p) => p.status === 'approved').length}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">Enrolled in brackets</span>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Total Submissions
          </span>
          <span className="text-2xl font-heading font-black text-foreground">
            {payments.length}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">Across all events</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by team, captain, or UTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {['all', 'pending', 'approved', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded text-xs font-bold capitalize transition-colors ${
                filterStatus === st
                  ? 'bg-primary text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table Queue */}
      {isLoading ? (
        <div className="p-12 text-center">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-border rounded-xl bg-card">
          <ShieldCheck className="size-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-xs text-muted-foreground">No payments found matching the selected filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-xs">
            <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3">Tournament</th>
                <th className="px-4 py-3">Team Name</th>
                <th className="px-4 py-3">Captain</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">12-Digit UTR / Ref</th>
                <th className="px-4 py-3">Screenshot Proof</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-1.5">
                    <Trophy className="size-3.5 text-primary shrink-0" />
                    <span>{p.tournamentName}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-foreground">{p.teamName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.captainName}</td>
                  <td className="px-4 py-3 font-bold text-primary">{p.amount}</td>
                  <td className="px-4 py-3 font-mono font-bold text-foreground select-all bg-muted/20 px-2 py-1 rounded">
                    {p.utr}
                  </td>
                  <td className="px-4 py-3">
                    {p.screenshotUrl ? (
                      <a
                        href={p.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <Eye className="size-3.5" />
                        View Proof
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                        p.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : p.status === 'rejected'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleAction(p.id, 'approved')}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-background font-bold text-[10px] transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(p.id, 'rejected')}
                          className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-background font-bold text-[10px] transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Action taken</span>
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
