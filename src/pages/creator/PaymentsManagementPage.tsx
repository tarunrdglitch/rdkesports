import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  ArrowUpRight,
  Sparkles,
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

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
})

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
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 space-y-6">
      <PageHeader
        title="Financial Ledger & Settlements Desk"
        description="Powered by RDK Technologies platform engine. Oversee player registration entry verifications and Official Partner 10% platform fee remittances."
        badge="Platform Treasury"
        actions={
          <button
            onClick={loadAll}
            className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white bg-[#141414] hover:bg-[#1E1E1E] border border-white/10 rounded-xl px-4 py-2 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        }
      />

      {/* Notifications */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2.5 shadow-lg backdrop-blur-md"
          >
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            <span className="font-medium">{actionMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2.5 shadow-lg backdrop-blur-md"
          >
            <AlertCircle className="size-4 shrink-0 text-red-400" />
            <span className="font-medium">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top View Selector Tabs — Modern Segmented Control */}
      <div className="flex items-center p-1.5 bg-[#0D0D0D] border border-white/10 rounded-2xl w-fit gap-1 shadow-inner">
        <button
          onClick={() => setActiveView('settlements')}
          className={`flex items-center gap-2.5 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer relative ${
            activeView === 'settlements'
              ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
              : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Receipt className="size-4 text-emerald-400" />
          <span>RDK 10% Platform Settlements</span>
          {settlements.filter((s) => s.status === 'UNDER_REVIEW').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black animate-pulse">
              {settlements.filter((s) => s.status === 'UNDER_REVIEW').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveView('teams')}
          className={`flex items-center gap-2.5 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer relative ${
            activeView === 'teams'
              ? 'text-primary bg-primary/15 border border-primary/30 shadow-[0_0_20px_rgba(229,57,53,0.15)]'
              : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <ShieldCheck className="size-4 text-primary" />
          <span>Player Entry Verification Queue</span>
          {payments.filter((p) => p.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black animate-pulse">
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
            <motion.div
              {...fadeUp(0)}
              className="p-5 rounded-2xl border border-white/10 bg-[#0E0E0E] relative overflow-hidden group hover:border-white/20 transition-all shadow-xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
                  Gross Platform Turnover
                </span>
                <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60">
                  <Coins className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-display font-black text-white">
                ₹{(settlementStats?.totalGrossRevenue ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-white/40 block mt-1.5">
                100% of approved player entries
              </span>
            </motion.div>

            <motion.div
              {...fadeUp(0.06)}
              className="p-5 rounded-2xl border border-emerald-500/20 bg-[#0E0E0E] relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  RDK 10% Platform Volume
                </span>
                <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <Landmark className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-display font-black text-emerald-400">
                ₹{(settlementStats?.totalRdkFeeVolume ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-white/40 block mt-1.5">
                Calculated strictly on paid entries
              </span>
            </motion.div>

            <motion.div
              {...fadeUp(0.12)}
              className="p-5 rounded-2xl border border-emerald-500/30 bg-[#0E0E0E] relative overflow-hidden group hover:border-emerald-500/50 transition-all shadow-xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Verified Fees Collected
                </span>
                <div className="size-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-display font-black text-emerald-400">
                ₹{(settlementStats?.verifiedFeesCollected ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-400/80 block mt-1.5 font-medium">
                Collection rate: {settlementStats?.collectionRate ?? 0}%
              </span>
            </motion.div>

            <motion.div
              {...fadeUp(0.18)}
              className="p-5 rounded-2xl border border-amber-500/20 bg-[#0E0E0E] relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Pending Settlements Due
                </span>
                <div className="size-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                  <Clock className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-display font-black text-amber-400">
                ₹{(settlementStats?.pendingFeesDue ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-amber-400/80 block mt-1.5 font-medium">
                {settlementStats?.pendingVerificationCount ?? 0} events awaiting review
              </span>
            </motion.div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-xl">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 size-4 text-white/40" />
              <input
                type="text"
                placeholder="Search tournament, partner, or UTR..."
                value={settlementSearch}
                onChange={(e) => setSettlementSearch(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    settlementFilter === tab.id
                      ? 'bg-emerald-500 text-black shadow-lg'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Settlements Table */}
          {isLoading ? (
            <div className="p-16 text-center bg-[#0D0D0D] rounded-2xl border border-white/10">
              <div className="size-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-white/40 font-mono">Synchronizing financial records…</p>
            </div>
          ) : filteredSettlements.length === 0 ? (
            <div className="p-16 text-center border border-white/10 rounded-2xl bg-[#0D0D0D]">
              <Receipt className="size-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white/80">No settlements found</p>
              <p className="text-xs text-white/40 mt-1">
                No platform settlements matched your active filter or search query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0D0D0D] shadow-2xl">
              <table className="w-full text-xs">
                <thead className="border-b border-white/10 bg-white/[0.02] text-left text-white/50 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-4">Tournament & Type</th>
                    <th className="px-5 py-4">Official Partner</th>
                    <th className="px-5 py-4">Entries & Fee</th>
                    <th className="px-5 py-4">Gross Turnover</th>
                    <th className="px-5 py-4 text-emerald-400 font-bold">RDK 10% Fee</th>
                    <th className="px-5 py-4">Partner 90% Net</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Proof / UTR</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredSettlements.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-bold text-white">
                          <Trophy className="size-4 text-primary shrink-0" />
                          <span className="group-hover:text-primary transition-colors">{s.tournamentName}</span>
                        </div>
                        <span className="text-[10px] text-white/40 font-mono mt-0.5 block">
                          {s.tournamentType || 'TOURNAMENT'}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-semibold text-white/90">
                        {s.partnerName}
                      </td>

                      <td className="px-5 py-4 text-white/60">
                        <span className="text-white font-medium">{s.approvedEntries} squads</span> × ₹{s.entryFee}
                      </td>

                      <td className="px-5 py-4 font-semibold text-white">
                        ₹{s.grossRevenue.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 font-display font-black text-emerald-400 text-sm">
                        ₹{s.rdkFee.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 font-semibold text-white/80">
                        ₹{s.partnerNet.toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`text-[9px] uppercase font-bold px-2.5 py-1 rounded-full border tracking-wide inline-flex items-center gap-1 ${
                            s.status === 'VERIFIED'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : s.status === 'UNDER_REVIEW'
                              ? 'bg-blue-500/15 text-blue-400 border-blue-500/30 animate-pulse'
                              : s.status === 'REJECTED'
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {s.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
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
                              className="group/img relative size-11 rounded-xl border border-white/10 overflow-hidden bg-black/60 hover:border-emerald-400 shrink-0 transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                              title="Click to view full payment screenshot"
                            >
                              <img
                                src={s.screenshotUrl}
                                alt="Payment Proof"
                                className="size-full object-cover group-hover/img:opacity-80"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition">
                                <Eye className="size-3.5 text-white" />
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
                                className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="size-3" /> View Proof
                              </button>
                              {s.utr && !s.utr.startsWith('SCREENSHOT-') ? (
                                <span className="font-mono text-[10px] text-white/50 block truncate max-w-[130px]" title={s.utr}>
                                  Ref: {s.utr}
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-400/80 block font-semibold">
                                  Screenshot Attached
                                </span>
                              )}
                            </div>
                          </div>
                        ) : s.utr ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-[11px] font-bold text-white select-all bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg block w-fit">
                              {s.utr}
                            </span>
                            <span className="text-amber-400/80 text-[10px] block">No image attached</span>
                          </div>
                        ) : (
                          <span className="text-white/30 text-[10px] italic">
                            No proof yet
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isSuperAdmin && s.status === 'UNDER_REVIEW' && (
                            <>
                              <button
                                onClick={() => handleVerifySettlement(s)}
                                disabled={isProcessingAction}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-bold text-[11px] hover:bg-emerald-400 transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                                title="Verify settlement and unlock closure"
                              >
                                <Check className="size-3 stroke-[3]" />
                                <span>Verify</span>
                              </button>

                              <button
                                onClick={() => {
                                  setRejectingSettlement(s)
                                  setRejectionReason('')
                                }}
                                disabled={isProcessingAction}
                                className="px-3 py-1.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 font-bold text-[11px] transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                                title="Reject proof with explanation"
                              >
                                <X className="size-3 stroke-[3]" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          <Link
                            to={`/creator/tournaments/${s.tournamentId}`}
                            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              {...fadeUp(0)}
              className="p-5 rounded-2xl border border-amber-500/20 bg-[#0E0E0E] relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Pending Verification
                </span>
                <div className="size-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                  <Clock className="size-4" />
                </div>
              </div>
              <span className="text-3xl font-display font-black text-amber-400">
                {payments.filter((p) => p.status === 'pending').length}
              </span>
              <span className="text-[11px] text-white/40 block mt-1">
                Awaiting manual UTR/Screenshot check
              </span>
            </motion.div>

            <motion.div
              {...fadeUp(0.06)}
              className="p-5 rounded-2xl border border-emerald-500/20 bg-[#0E0E0E] relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Approved & Confirmed
                </span>
                <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <span className="text-3xl font-display font-black text-emerald-400">
                {payments.filter((p) => p.status === 'approved').length}
              </span>
              <span className="text-[11px] text-white/40 block mt-1">
                Enrolled officially in match brackets
              </span>
            </motion.div>

            <motion.div
              {...fadeUp(0.12)}
              className="p-5 rounded-2xl border border-white/10 bg-[#0E0E0E] relative overflow-hidden group hover:border-white/20 transition-all shadow-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
                  Total Submissions
                </span>
                <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60">
                  <Coins className="size-4" />
                </div>
              </div>
              <span className="text-3xl font-display font-black text-white">
                {payments.length}
              </span>
              <span className="text-[11px] text-white/40 block mt-1">
                Across all active and closed tournaments
              </span>
            </motion.div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-xl">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 size-4 text-white/40" />
              <input
                type="text"
                placeholder="Search by team, captain, or UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {['all', 'pending', 'approved', 'rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    filterStatus === st
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table Queue */}
          {isLoading ? (
            <div className="p-16 text-center bg-[#0D0D0D] rounded-2xl border border-white/10">
              <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-white/40 font-mono">Loading team payments queue…</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-16 text-center border border-white/10 rounded-2xl bg-[#0D0D0D]">
              <ShieldCheck className="size-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white/80">No entries in queue</p>
              <p className="text-xs text-white/40 mt-1">
                No team payments match the selected status or query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0D0D0D] shadow-2xl">
              <table className="w-full text-xs">
                <thead className="border-b border-white/10 bg-white/[0.02] text-left text-white/50 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-4">Tournament</th>
                    <th className="px-5 py-4">Team Name</th>
                    <th className="px-5 py-4">Captain</th>
                    <th className="px-5 py-4">Fee Amount</th>
                    <th className="px-5 py-4">12-Digit UTR / Ref</th>
                    <th className="px-5 py-4">Screenshot Proof</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-4 font-semibold text-white flex items-center gap-2">
                        <Trophy className="size-3.5 text-primary shrink-0" />
                        <span className="group-hover:text-primary transition-colors">{p.tournamentName}</span>
                      </td>
                      <td className="px-5 py-4 font-bold text-white">{p.teamName}</td>
                      <td className="px-5 py-4 text-white/60">{p.captainName}</td>
                      <td className="px-5 py-4 font-bold text-primary font-mono">{p.amount}</td>
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-white select-all bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg inline-block">
                          {p.utr}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {p.screenshotUrl ? (
                          <a
                            href={p.screenshotUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-bold"
                          >
                            <Eye className="size-3.5" />
                            View Proof
                          </a>
                        ) : (
                          <span className="text-white/30 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-[9px] uppercase font-bold px-2.5 py-1 rounded-full border tracking-wide inline-flex items-center gap-1 ${
                            p.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : p.status === 'rejected'
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {p.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleTeamPaymentAction(p.id, 'approved')}
                              className="flex items-center gap-1.5 text-[11px] font-bold bg-emerald-500 text-black px-3 py-1.5 rounded-xl hover:bg-emerald-400 transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              <CheckCircle2 className="size-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleTeamPaymentAction(p.id, 'rejected')}
                              className="flex items-center gap-1.5 text-[11px] font-bold border border-red-500/40 text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                            >
                              <XCircle className="size-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-white/40 capitalize font-medium">
                            Processed
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
      <AnimatePresence>
        {rejectingSettlement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0E0E0E] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-red-500/15 flex items-center justify-center text-red-400">
                    <AlertTriangle className="size-4" />
                  </div>
                  <h3 className="font-display text-sm tracking-wider text-white">
                    Reject Platform Settlement
                  </h3>
                </div>
                <button
                  onClick={() => setRejectingSettlement(null)}
                  className="size-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="text-xs text-white/60 leading-relaxed">
                Rejecting settlement for <strong className="text-white">{rejectingSettlement.tournamentName}</strong> (Amount: ₹{rejectingSettlement.rdkFee.toLocaleString()}). The Official Partner will be requested to review and resubmit proof.
              </p>

              <form onSubmit={handleRejectSettlementSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5">
                    Reason for Rejection *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. UTR reference not matching platform bank statement, or payment under amount."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-[#141414] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingSettlement(null)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingAction}
                    className="px-5 py-2 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-all shadow-lg active:scale-95 disabled:opacity-60 cursor-pointer"
                  >
                    {isProcessingAction ? 'Rejecting…' : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal for Payment Screenshot Proof */}
      <AnimatePresence>
        {previewProofModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
            onClick={() => setPreviewProofModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-3xl w-full max-h-[92vh] bg-[#0E0E0E] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0E0E0E]">
                <div>
                  <h4 className="font-display text-sm tracking-wider text-white flex items-center gap-2">
                    <Receipt className="size-4 text-emerald-400" />
                    {previewProofModal.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/50 mt-1">
                    {previewProofModal.partnerName && (
                      <span>
                        Sender: <strong className="text-white">{previewProofModal.partnerName}</strong>
                      </span>
                    )}
                    {previewProofModal.amount && (
                      <span>
                        Fee Amount: <strong className="text-emerald-400 font-bold">₹{previewProofModal.amount.toLocaleString()}</strong>
                      </span>
                    )}
                    {previewProofModal.utr && !previewProofModal.utr.startsWith('SCREENSHOT-') && (
                      <span className="font-mono text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-white font-semibold">
                        Ref: {previewProofModal.utr}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewProofModal(null)}
                  className="size-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Image Viewport */}
              <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-black/80 min-h-[300px]">
                <img
                  src={previewProofModal.url}
                  alt="Payment Proof Screenshot"
                  className="max-h-[62vh] w-auto max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
                />
              </div>

              {/* Footer / Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-white/10 bg-[#0E0E0E]">
                <a
                  href={previewProofModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1.5 font-bold"
                >
                  <ExternalLink className="size-3.5" />
                  Open original resolution
                </a>

                <div className="flex items-center gap-2.5">
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
                          className="px-3.5 py-1.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 font-bold text-xs transition-all cursor-pointer"
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
                          className="px-4 py-1.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                        >
                          <Check className="size-3.5 stroke-[3]" />
                          Verify 10% Settlement
                        </button>
                      </>
                    )}
                  <button
                    type="button"
                    onClick={() => setPreviewProofModal(null)}
                    className="px-4 py-1.5 rounded-xl border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/5 font-semibold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
