import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  Receipt,
  Landmark,
  Coins,
  Check,
  X,
  ExternalLink,
  Clock,
  AlertTriangle,
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

interface PlatformSettlementItem {
  id: string
  tournamentId: string
  tournamentName: string
  tournamentType?: string
  tournamentStatus?: string
  isClosed?: boolean
  partnerId?: string
  partnerName: string
  entryFee: number
  approvedEntries: number
  grossRevenue: number
  rdkFee: number
  partnerNet: number
  status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'
  utr?: string
  screenshotUrl?: string
  paymentDate?: string
  submittedAt?: string
  verifiedAt?: string
  rejectionReason?: string
}

interface SettlementStats {
  totalGrossRevenue: number
  totalRdkFeeVolume: number
  verifiedFeesCollected: number
  pendingFeesDue: number
  pendingVerificationCount: number
  collectionRate: number
}

export default function PaymentsManagementPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'

  // Top View Mode: 'teams' = Team Entry UPIs, 'settlements' = RDK 10% Platform Settlements
  const [activeView, setActiveView] = useState<'settlements' | 'teams'>(
    isSuperAdmin ? 'settlements' : 'teams'
  )

  // Team payments state
  const [payments, setPayments] = useState<Payment[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Platform settlements state
  const [settlements, setSettlements] = useState<PlatformSettlementItem[]>([])
  const [settlementStats, setSettlementStats] = useState<SettlementStats | null>(null)
  const [settlementFilter, setSettlementFilter] = useState<string>('all')
  const [settlementSearch, setSettlementSearch] = useState('')

  // Rejection Modal
  const [rejectingSettlement, setRejectingSettlement] = useState<PlatformSettlementItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessingAction, setIsProcessingAction] = useState(false)

  // Lightbox Modal for Payment Screenshot Proof
  const [previewProofModal, setPreviewProofModal] = useState<{
    url: string
    title: string
    tournamentName?: string
    partnerName?: string
    amount?: number | string
    utr?: string
    settlementItem?: PlatformSettlementItem
  } | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setIsLoading(true)
    setError('')
    try {
      await Promise.all([loadPayments(), loadSettlements()])
    } finally {
      setIsLoading(false)
    }
  }

  const loadPayments = async () => {
    try {
      const res = await fetch('/api/payments/all')
      if (res.ok) {
        const data = await res.json()
        setPayments(data)
      }
    } catch {
      // Ignored
    }
  }

  const loadSettlements = async () => {
    try {
      const [sRes, statsRes] = await Promise.all([
        fetch('/api/settlements'),
        fetch('/api/settlements/stats'),
      ])
      if (sRes.ok) {
        const data = await sRes.json()
        setSettlements(data)
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setSettlementStats(statsData)
      }
    } catch {
      // Ignored
    }
  }

  const handleTeamPaymentAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update payment')

      setActionMsg(`Team payment marked as ${status}! Team status updated.`)
      setTimeout(() => setActionMsg(''), 3000)
      loadPayments()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to update payment')
    }
  }

  const handleVerifySettlement = async (settlement: PlatformSettlementItem) => {
    if (!confirm(`Verify RDK 10% platform settlement of ₹${settlement.rdkFee.toLocaleString()} for "${settlement.tournamentName}"? This will unlock tournament closure.`)) {
      return
    }
    setIsProcessingAction(true)
    try {
      const res = await fetch(`/api/settlements/${settlement.tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'VERIFIED' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to verify settlement')
      }
      setActionMsg(`Settlement verified for "${settlement.tournamentName}"! Tournament closure clearance granted.`)
      setTimeout(() => setActionMsg(''), 4000)
      loadSettlements()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to verify settlement')
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleRejectSettlementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingSettlement) return
    setIsProcessingAction(true)
    try {
      const res = await fetch(`/api/settlements/${rejectingSettlement.tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: rejectionReason.trim() || 'Settlement verification failed: Invalid transaction reference or mismatch.',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to reject settlement')
      }
      setActionMsg(`Settlement rejected for "${rejectingSettlement.tournamentName}". Organizer notified to correct UTR.`)
      setTimeout(() => setActionMsg(''), 4000)
      setRejectingSettlement(null)
      setRejectionReason('')
      loadSettlements()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to reject settlement')
    } finally {
      setIsProcessingAction(false)
    }
  }

  // Filtered Team Payments
  const filteredPayments = payments.filter((p) => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus
    const matchesSearch =
      p.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.utr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.captainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tournamentName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Filtered Platform Settlements
  const filteredSettlements = settlements.filter((s) => {
    const matchesStatus =
      settlementFilter === 'all' ||
      s.status.toLowerCase() === settlementFilter.toLowerCase()
    const matchesSearch =
      s.tournamentName.toLowerCase().includes(settlementSearch.toLowerCase()) ||
      s.partnerName.toLowerCase().includes(settlementSearch.toLowerCase()) ||
      (s.utr && s.utr.toLowerCase().includes(settlementSearch.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const pendingSettlementsCount = settlements.filter(
    (s) => s.status === 'UNDER_REVIEW' || s.status === 'PENDING'
  ).length

  return (
    <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4 space-y-6">
      <PageHeader
        title="Financial Ledger & Settlements Desk"
        description="Powered by RDK Technologies platform engine. Oversee player registration entry verifications and Official Partner 10% platform fee remittances."
        actions={
          <button
            onClick={loadAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded px-3 py-1.5 transition-colors"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh All Data</span>
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

      {/* Top View Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-px">
        <button
          onClick={() => setActiveView('settlements')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
            activeView === 'settlements'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="size-4 text-emerald-400" />
          <span>RDK 10% Platform Settlements</span>
          {settlements.filter((s) => s.status === 'UNDER_REVIEW').length > 0 && (
            <span className="size-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black">
              {settlements.filter((s) => s.status === 'UNDER_REVIEW').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveView('teams')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
            activeView === 'teams'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="size-4 text-primary" />
          <span>Player Entry Verification Queue</span>
          {payments.filter((p) => p.status === 'pending').length > 0 && (
            <span className="size-4 rounded-full bg-primary text-background flex items-center justify-center text-[10px] font-black">
              {payments.filter((p) => p.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: RDK 10% PLATFORM SETTLEMENTS */}
      {activeView === 'settlements' && (
        <div className="space-y-6">
          {/* Executive Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                Gross Platform Turnover
              </span>
              <div className="text-2xl font-heading font-black text-foreground">
                ₹{(settlementStats?.totalGrossRevenue ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-muted-foreground block mt-1">
                100% of approved player entries
              </span>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                RDK 10% Platform Volume
              </span>
              <div className="text-2xl font-heading font-black text-emerald-400">
                ₹{(settlementStats?.totalRdkFeeVolume ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-muted-foreground block mt-1">
                Calculated strictly on paid entries
              </span>
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-1">
                Verified Fees Collected
              </span>
              <div className="text-2xl font-heading font-black text-emerald-400">
                ₹{(settlementStats?.verifiedFeesCollected ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-500/80 block mt-1">
                Collection rate: {settlementStats?.collectionRate ?? 0}%
              </span>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                Pending Settlements Due
              </span>
              <div className="text-2xl font-heading font-black text-amber-400">
                ₹{(settlementStats?.pendingFeesDue ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-amber-400/80 block mt-1">
                {settlementStats?.pendingVerificationCount ?? 0} events awaiting review
              </span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tournament, partner, or UTR..."
                value={settlementSearch}
                onChange={(e) => setSettlementSearch(e.target.value)}
                className="w-full bg-background border border-border rounded pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
              {[
                { id: 'all', label: 'All Settlements' },
                { id: 'under_review', label: 'Under Review' },
                { id: 'verified', label: 'Verified' },
                { id: 'pending', label: 'Pending Due' },
                { id: 'rejected', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSettlementFilter(tab.id)}
                  className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap transition-colors ${
                    settlementFilter === tab.id
                      ? 'bg-emerald-500 text-black'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Settlements Table */}
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="size-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredSettlements.length === 0 ? (
            <div className="p-12 text-center border border-border rounded-xl bg-card">
              <Receipt className="size-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-xs text-muted-foreground">
                No platform settlements found matching the filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-4 py-3">Tournament & Type</th>
                    <th className="px-4 py-3">Official Partner</th>
                    <th className="px-4 py-3">Entries & Fee</th>
                    <th className="px-4 py-3">Gross Turnover</th>
                    <th className="px-4 py-3 text-emerald-400 font-bold">RDK 10% Fee</th>
                    <th className="px-4 py-3">Partner 90% Net</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Proof / UTR</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSettlements.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <Trophy className="size-3.5 text-primary shrink-0" />
                          <span>{s.tournamentName}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {s.tournamentType || 'TOURNAMENT'}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-semibold text-foreground">
                        {s.partnerName}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {s.approvedEntries} squads × ₹{s.entryFee}
                      </td>

                      <td className="px-4 py-3 font-semibold text-foreground">
                        ₹{s.grossRevenue.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 font-heading font-black text-emerald-400 text-sm">
                        ₹{s.rdkFee.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 font-semibold text-primary">
                        ₹{s.partnerNet.toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                            s.status === 'VERIFIED'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : s.status === 'UNDER_REVIEW'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : s.status === 'REJECTED'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {s.screenshotUrl ? (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewProofModal({
                                  url: s.screenshotUrl!,
                                  title: `10% Platform Settlement — ${s.tournamentName}`,
                                  tournamentName: s.tournamentName,
                                  partnerName: s.partnerName,
                                  amount: s.rdkFee,
                                  utr: s.utr,
                                  settlementItem: s,
                                })
                              }
                              className="group relative size-12 rounded-lg border-2 border-primary/30 overflow-hidden bg-black/60 hover:border-primary shrink-0 transition shadow-sm hover:scale-105 active:scale-95"
                              title="Click to view full payment screenshot"
                            >
                              <img
                                src={s.screenshotUrl}
                                alt="Payment Proof"
                                className="size-full object-cover group-hover:opacity-90"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Eye className="size-4 text-white" />
                              </div>
                            </button>
                            <div className="space-y-0.5 min-w-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewProofModal({
                                    url: s.screenshotUrl!,
                                    title: `10% Platform Settlement — ${s.tournamentName}`,
                                    tournamentName: s.tournamentName,
                                    partnerName: s.partnerName,
                                    amount: s.rdkFee,
                                    utr: s.utr,
                                    settlementItem: s,
                                  })
                                }
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                              >
                                <Eye className="size-3" /> View Screenshot
                              </button>
                              {s.utr && !s.utr.startsWith('SCREENSHOT-') ? (
                                <span className="font-mono text-[10px] text-muted-foreground block truncate max-w-[130px]" title={s.utr}>
                                  Ref: {s.utr}
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-400 block font-semibold">
                                  Screenshot Uploaded
                                </span>
                              )}
                            </div>
                          </div>
                        ) : s.utr ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-[11px] font-bold text-foreground select-all bg-muted/30 px-1.5 py-0.5 rounded block w-fit">
                              {s.utr}
                            </span>
                            <span className="text-amber-400 text-[10px] block">No image attached</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[10px] italic">
                            No proof yet
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSuperAdmin && s.status === 'UNDER_REVIEW' && (
                            <>
                              <button
                                onClick={() => handleVerifySettlement(s)}
                                disabled={isProcessingAction}
                                className="px-2.5 py-1 rounded bg-emerald-500 text-black font-bold text-[11px] hover:bg-emerald-400 transition flex items-center gap-1"
                                title="Verify settlement and unlock closure"
                              >
                                <Check className="size-3" />
                                <span>Verify</span>
                              </button>

                              <button
                                onClick={() => {
                                  setRejectingSettlement(s)
                                  setRejectionReason('')
                                }}
                                disabled={isProcessingAction}
                                className="px-2.5 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 font-bold text-[11px] transition flex items-center gap-1"
                                title="Reject proof with explanation"
                              >
                                <X className="size-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          <Link
                            to={`/creator/tournaments/${s.tournamentId}`}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
                            title="Go to tournament control room"
                          >
                            <ExternalLink className="size-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: PLAYER ENTRY VERIFICATION QUEUE */}
      {activeView === 'teams' && (
        <div className="space-y-6">
          {/* Quick Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Pending Queue
              </span>
              <span className="text-2xl font-heading font-black text-amber-400">
                {payments.filter((p) => p.status === 'pending').length}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Awaiting manual check
              </span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Approved & Verified
              </span>
              <span className="text-2xl font-heading font-black text-emerald-400">
                {payments.filter((p) => p.status === 'approved').length}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Enrolled in brackets
              </span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Total Submissions
              </span>
              <span className="text-2xl font-heading font-black text-foreground">
                {payments.length}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Across all events
              </span>
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
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center border border-border rounded-xl bg-card">
              <ShieldCheck className="size-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-xs text-muted-foreground">
                No payments found matching the selected filter.
              </p>
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
                  {filteredPayments.map((p) => (
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
                              onClick={() => handleTeamPaymentAction(p.id, 'approved')}
                              className="flex items-center gap-1 text-[11px] font-bold bg-emerald-500 text-black px-2.5 py-1 rounded hover:bg-emerald-400 transition"
                            >
                              <CheckCircle2 className="size-3" /> Approve
                            </button>
                            <button
                              onClick={() => handleTeamPaymentAction(p.id, 'rejected')}
                              className="flex items-center gap-1 text-[11px] font-bold border border-red-500/40 text-red-400 hover:bg-red-500/10 px-2.5 py-1 rounded transition"
                            >
                              <XCircle className="size-3" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground capitalize">
                            Verified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Super Admin Rejection Reason Modal */}
      {rejectingSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-400" />
                <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground">
                  Reject Platform Settlement
                </h3>
              </div>
              <button
                onClick={() => setRejectingSettlement(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Rejecting settlement for <strong className="text-foreground">{rejectingSettlement.tournamentName}</strong> (Amount: ₹{rejectingSettlement.rdkFee.toLocaleString()}). The Official Partner will be requested to review and resubmit proof.
            </p>

            <form onSubmit={handleRejectSettlementSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. UTR reference not matching platform bank statement, or payment under amount."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingSettlement(null)}
                  className="px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className="px-4 py-1.5 rounded bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition disabled:opacity-60"
                >
                  {isProcessingAction ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Payment Screenshot Proof */}
      {previewProofModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
          onClick={() => setPreviewProofModal(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[92vh] bg-card border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div>
                <h4 className="font-heading font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Receipt className="size-4 text-primary" />
                  {previewProofModal.title}
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                  {previewProofModal.partnerName && (
                    <span>
                      Sender: <strong className="text-foreground">{previewProofModal.partnerName}</strong>
                    </span>
                  )}
                  {previewProofModal.amount && (
                    <span>
                      Fee Amount: <strong className="text-emerald-400">₹{previewProofModal.amount.toLocaleString()}</strong>
                    </span>
                  )}
                  {previewProofModal.utr && !previewProofModal.utr.startsWith('SCREENSHOT-') && (
                    <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-foreground">
                      Ref: {previewProofModal.utr}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProofModal(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                title="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Image Viewport */}
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-black/70 min-h-[300px]">
              <img
                src={previewProofModal.url}
                alt="Payment Proof Screenshot"
                className="max-h-[62vh] w-auto max-w-full object-contain rounded-lg shadow-2xl border border-white/10"
              />
            </div>

            {/* Footer / Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-t border-border bg-card">
              <a
                href={previewProofModal.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <ExternalLink className="size-3.5" />
                Open original full resolution
              </a>

              <div className="flex items-center gap-2">
                {previewProofModal.settlementItem &&
                  isSuperAdmin &&
                  previewProofModal.settlementItem.status === 'UNDER_REVIEW' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const item = previewProofModal.settlementItem!
                          setPreviewProofModal(null)
                          setRejectingSettlement(item)
                          setRejectionReason('')
                        }}
                        className="px-3 py-1.5 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 font-bold text-xs transition"
                      >
                        Reject Proof
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const item = previewProofModal.settlementItem!
                          setPreviewProofModal(null)
                          handleVerifySettlement(item)
                        }}
                        className="px-4 py-1.5 rounded bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition flex items-center gap-1.5 shadow"
                      >
                        <Check className="size-3.5" />
                        Verify 10% Settlement
                      </button>
                    </>
                  )}
                <button
                  type="button"
                  onClick={() => setPreviewProofModal(null)}
                  className="px-4 py-1.5 rounded border border-border text-xs text-muted-foreground hover:bg-muted font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
