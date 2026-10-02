import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  Plus,
  Play,
  Share2,
  ExternalLink,
  Users,
  Trophy,
  CheckCircle2,
  X,
  Sparkles,
  Check,
  Trash2,
  Pencil,
  Camera,
  Upload,
  KeyRound,
  Eye,
  RotateCcw,
  Coins,
  Copy,
  AlertTriangle,
  Building2,
  Clock,
  Ban,
  Activity,
  ArrowUpRight,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { creatorService } from '@/services/api/creatorService'
import type { OfficialPartner } from '@/types'
import { compressImageFile } from '@/utils/imageCompressor'

const initialForm = {
  name: '',
  handle: '',
  organizationName: '',
  email: '',
  phone: '',
  password: 'password123',
  avatar: '',
  subscribers: '100K Followers',
  bio: '',
  games: 'Free Fire, BGMI',
  youtube: '',
  instagram: '',
  discord: '',
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
})

export default function CreatorsManagementPage() {
  const [creators, setCreators] = useState<OfficialPartner[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'deactivated'>('all')
  const [isOpen, setIsOpen] = useState(false)
  const [editingCreator, setEditingCreator] = useState<OfficialPartner | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Access Reset Modal
  const [resetModalData, setResetModalData] = useState<{
    partner: OfficialPartner
    tempPassword: string
    email?: string
  } | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  // Details & Financials Modal
  const [detailsModalPartner, setDetailsModalPartner] = useState<OfficialPartner | null>(null)
  const [partnerTournaments, setPartnerTournaments] = useState<any[]>([])
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Form State
  const [formData, setFormData] = useState(initialForm)

  useEffect(() => {
    loadCreators()
  }, [])

  const loadCreators = () => {
    creatorService.list(true).then(setCreators)
  }

  const handleOpenCreate = () => {
    setEditingCreator(null)
    setFormData(initialForm)
    setIsOpen(true)
  }

  const handleStartEdit = (creator: OfficialPartner) => {
    setEditingCreator(creator)
    setFormData({
      name: creator.name,
      handle: creator.handle,
      organizationName: creator.organizationName || '',
      email: creator.email || '',
      phone: creator.phone || '',
      password: '',
      avatar: creator.avatar,
      subscribers: creator.subscribers,
      bio: creator.bio,
      games: creator.games.join(', '),
      youtube: creator.socials.youtube || '',
      instagram: creator.socials.instagram || '',
      discord: creator.socials.discord || '',
    })
    setIsOpen(true)
  }

  const handleToggleStatus = async (creator: OfficialPartner) => {
    const currentStatus = creator.status || 'active'
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    try {
      await creatorService.updateStatus(creator.id, newStatus)
      setSuccessMsg(`Official Partner "${creator.name}" status updated to ${newStatus}.`)
      loadCreators()
    } catch {
      setErrorMsg('Failed to change partner status.')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) {
      return
    }
    try {
      await creatorService.delete(id)
      setSuccessMsg(`Partner "${name}" has been permanently deleted.`)
      loadCreators()
    } catch {
      setErrorMsg('Failed to delete partner.')
    }
  }

  const handleResetAccess = async (creator: OfficialPartner) => {
    try {
      const res = await creatorService.resetAccess(creator.id)
      setResetModalData({
        partner: creator,
        tempPassword: res.temporaryPassword,
        email: res.email || creator.email,
      })
    } catch {
      setErrorMsg('Failed to generate reset password credentials.')
    }
  }

  const handleViewDetails = async (creator: OfficialPartner) => {
    setDetailsModalPartner(creator)
    setIsLoadingDetails(true)
    try {
      const res = await fetch(`/api/creators/${creator.id}/details`)
      if (res.ok) {
        const data = await res.json()
        setPartnerTournaments(data.tournaments || [])
      } else {
        setPartnerTournaments([])
      }
    } catch {
      setPartnerTournaments([])
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await compressImageFile(file, 300, 300, 0.85)
      setFormData((prev) => ({ ...prev, avatar: base64 }))
    } catch {
      setErrorMsg('Failed to compress avatar image.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const gamesList = formData.games.split(',').map((g) => g.trim()).filter(Boolean)
      const payload = {
        name: formData.name,
        handle: formData.handle,
        organizationName: formData.organizationName,
        email: formData.email.trim() ? formData.email.trim() : undefined,
        phone: formData.phone.trim() ? formData.phone.trim() : undefined,
        password: formData.password.trim() ? formData.password.trim() : undefined,
        avatar: formData.avatar.trim() ? formData.avatar.trim() : undefined,
        subscribers: formData.subscribers,
        bio: formData.bio,
        games: gamesList,
        socials: {
          youtube: formData.youtube || undefined,
          instagram: formData.instagram || undefined,
          discord: formData.discord || undefined,
        },
      }

      if (editingCreator) {
        await creatorService.update(editingCreator.id, payload)
        setSuccessMsg(`Official Partner "${formData.name}" profile updated successfully!`)
      } else {
        await creatorService.create(payload)
        setSuccessMsg(`Official Partner "${formData.name}" onboarded successfully! Partner credentials generated.`)
      }

      setIsOpen(false)
      setEditingCreator(null)
      loadCreators()
      setFormData(initialForm)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message)
      } else {
        setErrorMsg(editingCreator ? 'Failed to update partner' : 'Failed to onboard partner')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredCreators = creators.filter((c) => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'active') return c.status === 'active' || !c.status
    if (filterStatus === 'suspended') return c.status === 'suspended'
    if (filterStatus === 'deactivated') return c.status === 'deactivated' || c.isDeleted
    return true
  })

  const totalGrossEstimate = creators.reduce((acc, c) => acc + (c.totalTournaments || 0) * 5000, 0)
  const totalRdkFees = totalGrossEstimate * 0.1

  const field =
    'mt-1 w-full rounded-xl border border-white/10 bg-[#141414] px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none transition-colors'

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 space-y-6">
      <PageHeader
        title="Official Partners & Tournament Organizers"
        description="Head Authority: Review, onboard, and manage verified partners who conduct tournaments powered by RDK Technologies."
        badge="Partner Governance"
        actions={
          <button
            onClick={handleOpenCreate}
            className="btn-primary cursor-pointer shadow-lg shadow-primary/20 active:scale-95"
          >
            <Plus className="size-4" />
            Onboard Official Partner
          </button>
        }
      />

      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-400 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              <span className="font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400/70 hover:text-emerald-400 cursor-pointer">
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="size-4 shrink-0 text-red-400" />
              <span className="font-medium">{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-red-400/70 hover:text-red-400 cursor-pointer">
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <motion.div
          {...fadeUp(0)}
          className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-5 relative overflow-hidden group hover:border-white/20 transition-all shadow-xl"
        >
          <div className="flex items-center justify-between text-white/50 text-xs mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Verified Partners</span>
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <p className="text-3xl font-display font-black text-white tabular-nums">
            {creators.filter((c) => c.status === 'active' || !c.status).length}
          </p>
          <p className="mt-1 text-[11px] text-white/40">{creators.length} total registered partners</p>
        </motion.div>

        <motion.div
          {...fadeUp(0.06)}
          className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-5 relative overflow-hidden group hover:border-white/20 transition-all shadow-xl"
        >
          <div className="flex items-center justify-between text-white/50 text-xs mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tournaments Hosted</span>
            <div className="size-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
              <Trophy className="size-4" />
            </div>
          </div>
          <p className="text-3xl font-display font-black text-amber-400 tabular-nums">
            {creators.reduce((acc, c) => acc + (c.totalTournaments || 0), 0)}
          </p>
          <p className="mt-1 text-[11px] text-white/40">Across all authorized partner portals</p>
        </motion.div>

        <motion.div
          {...fadeUp(0.12)}
          className="rounded-2xl border border-emerald-500/20 bg-[#0E0E0E] p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-xl"
        >
          <div className="flex items-center justify-between text-white/50 text-xs mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">RDK Fee Volume (10%)</span>
            <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Coins className="size-4" />
            </div>
          </div>
          <p className="text-3xl font-display font-black text-emerald-400 tabular-nums">
            ₹{totalRdkFees.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-white/40">From verified tournament gross volume</p>
        </motion.div>

        <motion.div
          {...fadeUp(0.18)}
          className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-5 relative overflow-hidden group hover:border-white/20 transition-all shadow-xl"
        >
          <div className="flex items-center justify-between text-white/50 text-xs mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Auditable Integrity</span>
            <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Activity className="size-4" />
            </div>
          </div>
          <p className="text-3xl font-display font-black text-white tabular-nums">100%</p>
          <p className="mt-1 text-[11px] text-white/40">Full audit logging & state preservation</p>
        </motion.div>
      </div>

      {/* Partners List & Filters */}
      <div className="rounded-2xl border border-white/10 bg-[#0D0D0D] overflow-hidden shadow-2xl">
        <div className="border-b border-white/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base text-white tracking-wide">Official Partner Directory</h2>
            <p className="text-xs text-white/40 mt-0.5">Authorized organizers managing tournaments & staff</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center rounded-xl border border-white/10 bg-[#141414] p-1 text-xs">
            {(['all', 'active', 'suspended', 'deactivated'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer ${
                  filterStatus === s
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {filteredCreators.length === 0 ? (
          <div className="p-16 text-center text-white/40">
            <Users className="size-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm text-white/80">No partners found</p>
            <p className="text-xs mt-1 text-white/40">Try switching the filter or onboard a new official partner.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-5">
            {filteredCreators.map((c) => {
              const status = c.status || 'active'
              const isSuspended = status === 'suspended'
              const isDeactivated = status === 'deactivated' || c.isDeleted

              return (
                <motion.div
                  key={c.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all relative overflow-hidden backdrop-blur-xl ${
                    isDeactivated
                      ? 'border-red-500/20 bg-red-500/[0.02]'
                      : isSuspended
                      ? 'border-amber-500/20 bg-amber-500/[0.02]'
                      : 'border-white/10 bg-[#111111] hover:border-primary/40 shadow-xl'
                  }`}
                >
                  <div>
                    {/* Header: Avatar, Name, Status Badge */}
                    <div className="flex items-start gap-3.5 mb-3.5">
                      <div className="relative size-13 rounded-2xl border border-white/10 overflow-hidden shrink-0 bg-black/60 shadow-md">
                        <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white truncate">{c.name}</span>
                          <span className="size-3.5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check className="size-2 text-white stroke-[3]" />
                          </span>
                        </div>
                        <p className="text-xs text-white/40 font-mono truncate">{c.handle}</p>
                        <p className="text-[11px] text-primary mt-0.5 font-medium truncate flex items-center gap-1">
                          <Building2 className="size-3 shrink-0" />
                          {c.organizationName}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 border ${
                          isDeactivated
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : isSuspended
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                      {c.bio || 'Official tournament partner for RDK Esports.'}
                    </p>

                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {c.games.map((g) => (
                        <span
                          key={g}
                          className="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-white/80 font-medium"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="mt-5 pt-3.5 border-t border-white/10 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">
                        Tournaments: <strong className="text-white">{c.totalTournaments || 0}</strong>
                      </span>
                      <div className="flex items-center gap-1 text-white/50">
                        {c.socials.youtube && (
                          <a
                            href={c.socials.youtube}
                            target="_blank"
                            rel="noreferrer"
                            className="size-7 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 flex items-center justify-center transition-colors"
                            title="YouTube"
                          >
                            <Play className="size-3" />
                          </a>
                        )}
                        {c.socials.instagram && (
                          <a
                            href={c.socials.instagram}
                            target="_blank"
                            rel="noreferrer"
                            className="size-7 rounded-lg bg-white/5 hover:bg-pink-500/20 text-white/60 hover:text-pink-400 flex items-center justify-center transition-colors"
                            title="Instagram"
                          >
                            <Share2 className="size-3" />
                          </a>
                        )}
                        {c.socials.discord && (
                          <a
                            href={c.socials.discord}
                            target="_blank"
                            rel="noreferrer"
                            className="size-7 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-white/60 hover:text-indigo-400 flex items-center justify-center transition-colors"
                            title="Discord"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(c)}
                        className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-white transition-all cursor-pointer"
                        title="View Full Profile & Financial Ledger"
                      >
                        <Eye className="size-3 text-primary" />
                        Details
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(c)}
                        className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-white transition-all cursor-pointer"
                        title="Edit Partner Profile"
                      >
                        <Pencil className="size-3" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResetAccess(c)}
                        className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-[11px] font-semibold text-amber-400 transition-all cursor-pointer"
                        title="Reset Partner Password"
                      >
                        <KeyRound className="size-3" />
                        Pass
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        className={`flex items-center justify-center gap-1 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                          isSuspended
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                        }`}
                        title={isSuspended ? 'Reactivate Partner' : 'Suspend Partner'}
                      >
                        {isSuspended ? <RotateCcw className="size-3" /> : <Ban className="size-3" />}
                        {isSuspended ? 'Resume' : 'Pause'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(c.id, c.name)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 mt-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold text-red-400 transition-all cursor-pointer"
                      title="Permanently Delete Official Partner"
                    >
                      <Trash2 className="size-3.5" />
                      Delete Partner
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Details & Financials Modal */}
      <AnimatePresence>
        {detailsModalPartner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-[#0E0E0E] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-5 bg-[#0E0E0E]">
                <div className="flex items-center gap-3.5">
                  <img
                    src={detailsModalPartner.avatar}
                    alt={detailsModalPartner.name}
                    className="size-11 rounded-xl border border-white/10 object-cover shadow"
                  />
                  <div>
                    <h3 className="font-display text-base text-white flex items-center gap-2">
                      {detailsModalPartner.name}
                      <span className="text-xs text-primary font-normal">({detailsModalPartner.organizationName})</span>
                    </h3>
                    <p className="text-xs text-white/40 font-mono mt-0.5">{detailsModalPartner.handle}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailsModalPartner(null)}
                  className="size-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Estimated Gross Volume</span>
                    <p className="text-xl font-display font-black text-white mt-1">
                      ₹{((detailsModalPartner.totalTournaments || 0) * 5000).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">RDK 10% Fee</span>
                    <p className="text-xl font-display font-black text-emerald-400 mt-1">
                      ₹{((detailsModalPartner.totalTournaments || 0) * 500).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Partner Net (90%)</span>
                    <p className="text-xl font-display font-black text-white mt-1">
                      ₹{((detailsModalPartner.totalTournaments || 0) * 4500).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Tournament History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">
                    Conducted Tournaments ({partnerTournaments.length})
                  </h4>

                  {isLoadingDetails ? (
                    <div className="p-8 text-center">
                      <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-white/40">Loading tournament records…</p>
                    </div>
                  ) : partnerTournaments.length === 0 ? (
                    <p className="text-xs text-white/40 py-6 text-center border border-white/5 rounded-xl">
                      No tournaments registered yet under this partner.
                    </p>
                  ) : (
                    <div className="divide-y divide-white/5 rounded-xl border border-white/10 overflow-hidden bg-[#111111]">
                      {partnerTournaments.map((t) => (
                        <div key={t.id} className="p-3.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{t.name}</span>
                              <span className="text-[10px] font-mono uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded text-primary">
                                {t.type || 'BR TOURNAMENT'}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/50 mt-1">
                              {t.game} • {t.teamCount || 0} teams registered • Status: <span className="capitalize font-semibold text-white">{t.status}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-white">₹{t.grossRevenue || 0}</span>
                            <p className="text-[10px] text-white/40 mt-0.5">
                              Settlement: <span className="text-emerald-400 font-medium">{t.settlementStatus || 'PENDING'}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-white/10 p-4 flex justify-end bg-[#0E0E0E]">
                <button
                  type="button"
                  onClick={() => setDetailsModalPartner(null)}
                  className="rounded-xl bg-white/10 hover:bg-white/15 px-5 py-2 text-xs font-bold text-white transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetModalData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#0E0E0E] p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center gap-2.5 mb-3 text-amber-400">
                <div className="size-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <KeyRound className="size-4" />
                </div>
                <h3 className="font-display text-base text-white">Credentials Reset</h3>
              </div>
              <p className="text-xs text-white/60 mb-4 leading-relaxed">
                A temporary password has been generated for <strong>{resetModalData.partner.name}</strong>. Share this securely with the partner organizer.
              </p>

              <div className="space-y-3 bg-[#141414] border border-white/10 rounded-xl p-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Partner Login Email</span>
                  <p className="text-xs font-mono font-medium text-white mt-0.5">{resetModalData.email || 'partner@creator.com'}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Temporary Password</span>
                  <div className="flex items-center justify-between mt-1 bg-[#1A1A1A] border border-white/10 rounded-xl px-3 py-2">
                    <span className="text-sm font-mono font-bold text-primary">{resetModalData.tempPassword}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(resetModalData.tempPassword)
                        setCopiedKey(true)
                        setTimeout(() => setCopiedKey(false), 2000)
                      }}
                      className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedKey ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                      <span className={copiedKey ? 'text-emerald-400 font-bold' : ''}>{copiedKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setResetModalData(null)}
                  className="btn-primary cursor-pointer px-5 py-2 text-xs"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Creator Modal (Create or Edit) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0E0E0E] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {editingCreator ? <Pencil className="size-4" /> : <Sparkles className="size-4" />}
                  </div>
                  <h3 className="font-display text-base text-white">
                    {editingCreator ? `Edit Partner: ${editingCreator.name}` : 'Onboard Official Partner'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="size-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50">
                    Partner / Channel Name *
                    <input
                      type="text"
                      required
                      placeholder="e.g. Clashers Live"
                      className={field}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </label>

                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50">
                    Handle / Username *
                    <input
                      type="text"
                      required
                      placeholder="e.g. @clasherslive"
                      className={field}
                      value={formData.handle}
                      onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50">
                    Organization Name *
                    <input
                      type="text"
                      required
                      placeholder="e.g. Clashers Esports Org"
                      className={field}
                      value={formData.organizationName}
                      onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    />
                  </label>

                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50">
                    Followers / Reach Tag
                    <input
                      type="text"
                      placeholder="e.g. 450K Subscribers"
                      className={field}
                      value={formData.subscribers}
                      onChange={(e) => setFormData({ ...formData, subscribers: e.target.value })}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50">
                    {editingCreator ? 'Partner Email (optional)' : 'Partner Email *'}
                    <input
                      type="email"
                      required={!editingCreator}
                      placeholder={editingCreator ? 'Leave blank to keep' : 'partner@creator.com'}
                      className={field}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </label>

                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50">
                    Partner Phone (Confidential)
                    <input
                      type="tel"
                      placeholder="+91 9876543210"
                      className={field}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </label>
                </div>

                {!editingCreator && (
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50">
                    Initial Password *
                    <input
                      type="text"
                      required
                      placeholder="e.g. secret123"
                      className={field}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </label>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50">
                    Partner Logo / Avatar
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="size-14 rounded-2xl overflow-hidden border border-white/10 bg-[#141414] shrink-0">
                      <img
                        src={
                          formData.avatar ||
                          'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=200&q=80'
                        }
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#141414] hover:bg-white/5 px-4 py-2 text-xs font-bold text-white cursor-pointer transition-all">
                        <Upload className="size-3.5 text-primary" />
                        <span>Upload DP Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFile}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="url"
                        placeholder="Or paste image URL (https://...)"
                        className={field}
                        value={formData.avatar}
                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50">
                  Bio / Specialization
                  <textarea
                    rows={2}
                    placeholder="Tell about their content, gaming tournaments, and community..."
                    className={field}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  />
                </label>

                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50">
                  Games Supported (comma-separated)
                  <input
                    type="text"
                    placeholder="Free Fire, BGMI, Valorant"
                    className={field}
                    value={formData.games}
                    onChange={(e) => setFormData({ ...formData, games: e.target.value })}
                  />
                </label>

                <div className="grid grid-cols-3 gap-2.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50">
                    YouTube URL
                    <input
                      type="url"
                      placeholder="https://youtube.com/..."
                      className={field}
                      value={formData.youtube}
                      onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                    />
                  </label>

                  <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50">
                    Instagram URL
                    <input
                      type="url"
                      placeholder="https://instagram.com/..."
                      className={field}
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    />
                  </label>

                  <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50">
                    Discord URL
                    <input
                      type="url"
                      placeholder="https://discord.gg/..."
                      className={field}
                      value={formData.discord}
                      onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                    />
                  </label>
                </div>

                <div className="pt-4 flex justify-end gap-2.5 border-t border-white/10 mt-5">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary cursor-pointer px-5 py-2 text-xs"
                  >
                    {isSubmitting
                      ? editingCreator
                        ? 'Saving Changes...'
                        : 'Onboarding...'
                      : editingCreator
                      ? 'Save Changes'
                      : 'Authorize Partner'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
