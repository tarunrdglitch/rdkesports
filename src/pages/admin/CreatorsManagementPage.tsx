import { useState, useEffect } from 'react'
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

  const handleStartEdit = (c: OfficialPartner) => {
    setEditingCreator(c)
    setFormData({
      name: c.name || '',
      handle: c.handle || '',
      organizationName: c.organizationName || '',
      email: '',
      phone: c.phone || '',
      password: '',
      avatar: c.avatar || '',
      subscribers: c.subscribers || '',
      bio: c.bio || '',
      games: Array.isArray(c.games) ? c.games.join(', ') : '',
      youtube: c.socials?.youtube || '',
      instagram: c.socials?.instagram || '',
      discord: c.socials?.discord || '',
    })
    setErrorMsg('')
    setIsOpen(true)
  }

  const handleOpenCreate = () => {
    setEditingCreator(null)
    setFormData(initialForm)
    setErrorMsg('')
    setIsOpen(true)
  }

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressImageFile(file, 500, 500, 0.82)
      setFormData((prev) => ({ ...prev, avatar: dataUrl }))
    } catch {
      const reader = new FileReader()
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, avatar: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleToggleStatus = async (partner: OfficialPartner) => {
    const newStatus = partner.status === 'active' ? 'suspended' : 'active'
    try {
      await creatorService.updateStatus(partner.id, newStatus)
      setSuccessMsg(`Partner ${partner.name} status updated to ${newStatus.toUpperCase()}`)
      loadCreators()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleResetAccess = async (partner: OfficialPartner) => {
    try {
      const res = await creatorService.resetAccess(partner.id)
      setResetModalData({
        partner,
        tempPassword: res.temporaryPassword,
        email: res.email,
      })
      setCopiedKey(false)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reset access credentials')
    }
  }

  const handleViewDetails = async (partner: OfficialPartner) => {
    setDetailsModalPartner(partner)
    setIsLoadingDetails(true)
    try {
      const res = await creatorService.getDetails(partner.id)
      setPartnerTournaments(res.tournaments || [])
    } catch {
      setPartnerTournaments([])
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to decommission Official Partner "${name}"?\n\nNOTE: Historical tournaments, teams, and financial settlement records will be permanently preserved for audits (Soft Deletion).`
      )
    )
      return
    try {
      await creatorService.delete(id)
      setSuccessMsg(`Official Partner "${name}" decommissioned. Historical audit data preserved.`)
      loadCreators()
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message)
      else setErrorMsg('Failed to decommission partner')
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
    'mt-1 w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Official Partners & Tournament Organizers"
        description="Head Authority: Review, onboard, and manage verified partners who conduct tournaments powered by RDK Technologies."
        actions={
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-background shadow hover:opacity-90 transition"
          >
            <Plus className="size-4" />
            Onboard Official Partner
          </button>
        }
      />

      {successMsg && (
        <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 p-3 text-xs text-success">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-success/70 hover:text-success">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-danger/70 hover:text-danger">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Verified Partners</span>
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">
            {creators.filter((c) => c.status === 'active' || !c.status).length}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{creators.length} total recorded</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Tournaments Hosted</span>
            <Trophy className="size-4 text-warning" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">
            {creators.reduce((acc, c) => acc + (c.totalTournaments || 0), 0)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Across all partner portals</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>RDK Platform Fee (10%)</span>
            <Coins className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">
            ₹{totalRdkFees.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">From verified tournament gross</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Auditable Integrity</span>
            <Activity className="size-4 text-success" />
          </div>
          <p className="mt-2 text-2xl font-bold text-success tabular-nums">100%</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Soft deletion & logged actions</p>
        </div>
      </div>

      {/* Partners List & Filters */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-sm text-foreground">Official Partner Directory</h2>
            <p className="text-[11px] text-muted-foreground">Authorized organizers managing tournaments & staff</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            {(['all', 'active', 'suspended', 'deactivated'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition capitalize ${
                  filterStatus === s
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {filteredCreators.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="size-8 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm text-foreground">No partners found in this filter</p>
            <p className="text-xs mt-1">Try switching to "all" or onboard a new partner.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {filteredCreators.map((c) => {
              const status = c.status || 'active'
              const isSuspended = status === 'suspended'
              const isDeactivated = status === 'deactivated' || c.isDeleted

              return (
                <div
                  key={c.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition ${
                    isDeactivated
                      ? 'border-danger/30 bg-danger/5 opacity-80'
                      : isSuspended
                      ? 'border-warning/30 bg-warning/5'
                      : 'border-border bg-muted/20 hover:border-primary/40'
                  }`}
                >
                  <div>
                    {/* Header: Avatar, Name, Status Badge */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="relative size-12 rounded-full border border-border overflow-hidden shrink-0 bg-muted">
                        <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-foreground truncate">{c.name}</span>
                          <span className="size-3.5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check className="size-2.5 text-background stroke-[3]" />
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">{c.handle}</p>
                        <p className="text-[10px] text-primary mt-0.5 font-medium truncate flex items-center gap-1">
                          <Building2 className="size-3" />
                          {c.organizationName}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isDeactivated
                            ? 'bg-danger/20 text-danger border border-danger/30'
                            : isSuspended
                            ? 'bg-warning/20 text-warning border border-warning/30'
                            : 'bg-success/20 text-success border border-success/30'
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">{c.bio || 'Official tournament partner for RDK Esports.'}</p>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {c.games.map((g) => (
                        <span
                          key={g}
                          className="rounded bg-card border border-border px-1.5 py-0.5 text-[10px] text-foreground font-medium"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="mt-4 pt-3 border-t border-border/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        Tournaments: <strong className="text-foreground">{c.totalTournaments || 0}</strong>
                      </span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {c.socials.youtube && (
                          <a
                            href={c.socials.youtube}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 hover:text-danger"
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
                            className="p-1 hover:text-purple-400"
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
                            className="p-1 hover:text-indigo-400"
                            title="Discord"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="grid grid-cols-4 gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(c)}
                        className="flex items-center justify-center gap-1 py-1 rounded bg-muted/60 hover:bg-muted text-[10px] font-medium text-foreground transition"
                        title="View Full Profile & Financial Ledger"
                      >
                        <Eye className="size-3 text-primary" />
                        Details
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(c)}
                        className="flex items-center justify-center gap-1 py-1 rounded bg-muted/60 hover:bg-muted text-[10px] font-medium text-foreground transition"
                        title="Edit Partner Profile"
                      >
                        <Pencil className="size-3" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResetAccess(c)}
                        className="flex items-center justify-center gap-1 py-1 rounded bg-muted/60 hover:bg-muted text-[10px] font-medium text-warning transition"
                        title="Reset Partner Password"
                      >
                        <KeyRound className="size-3" />
                        Pass
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        className={`flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium transition ${
                          isSuspended
                            ? 'bg-success/10 text-success hover:bg-success/20'
                            : 'bg-warning/10 text-warning hover:bg-warning/20'
                        }`}
                        title={isSuspended ? 'Reactivate Partner' : 'Suspend Partner'}
                      >
                        {isSuspended ? <RotateCcw className="size-3" /> : <Ban className="size-3" />}
                        {isSuspended ? 'Active' : 'Pause'}
                      </button>
                    </div>

                    {!isDeactivated && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id, c.name)}
                        className="w-full text-center text-[10px] text-danger/70 hover:text-danger pt-1 transition"
                      >
                        Decommission Partner (Preserve History)
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Details & Financials Modal */}
      {detailsModalPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-3">
                <img
                  src={detailsModalPartner.avatar}
                  alt={detailsModalPartner.name}
                  className="size-10 rounded-full border border-border object-cover"
                />
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-1.5">
                    {detailsModalPartner.name}
                    <span className="text-xs text-primary font-normal">({detailsModalPartner.organizationName})</span>
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">{detailsModalPartner.handle}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalPartner(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Financial Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <span className="text-[11px] text-muted-foreground">Estimated Gross Volume</span>
                  <p className="text-lg font-bold text-foreground mt-1">
                    ₹{((detailsModalPartner.totalTournaments || 0) * 5000).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                  <span className="text-[11px] text-primary">RDK 10% Fee</span>
                  <p className="text-lg font-bold text-primary mt-1">
                    ₹{((detailsModalPartner.totalTournaments || 0) * 500).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-lg border border-success/30 bg-success/10 p-3">
                  <span className="text-[11px] text-success">Partner Net (90%)</span>
                  <p className="text-lg font-bold text-success mt-1">
                    ₹{((detailsModalPartner.totalTournaments || 0) * 4500).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Tournament History */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Conducted Tournaments ({partnerTournaments.length})
                </h4>

                {isLoadingDetails ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Loading tournament records...</p>
                ) : partnerTournaments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No tournaments registered yet under this partner.</p>
                ) : (
                  <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                    {partnerTournaments.map((t) => (
                      <div key={t.id} className="p-3 bg-card flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{t.name}</span>
                            <span className="text-[10px] font-mono uppercase bg-muted px-1.5 py-0.5 rounded text-primary">
                              {t.type || 'BR TOURNAMENT'}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {t.game} • {t.teamCount || 0} teams registered • Status: <span className="capitalize font-medium text-foreground">{t.status}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-foreground">₹{t.grossRevenue || 0}</span>
                          <p className="text-[10px] text-muted-foreground">
                            Settlement: {t.settlementStatus || 'PENDING'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border p-3 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailsModalPartner(null)}
                className="rounded bg-muted px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-3 text-warning">
              <KeyRound className="size-5" />
              <h3 className="font-bold text-base text-foreground">Partner Access Credentials Reset</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              A temporary password has been generated for <strong>{resetModalData.partner.name}</strong>. Share this securely with the partner organizer.
            </p>

            <div className="space-y-3 bg-muted/40 border border-border rounded-lg p-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Partner Login Email</span>
                <p className="text-xs font-mono font-medium text-foreground">{resetModalData.email || 'partner@creator.com'}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Temporary Password</span>
                <div className="flex items-center justify-between mt-1 bg-background border border-border rounded px-2.5 py-1.5">
                  <span className="text-sm font-mono font-bold text-primary">{resetModalData.tempPassword}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resetModalData.tempPassword)
                      setCopiedKey(true)
                      setTimeout(() => setCopiedKey(false), 2000)
                    }}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {copiedKey ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setResetModalData(null)}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-background hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creator Modal (Create or Edit) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                {editingCreator ? (
                  <Pencil className="size-4 text-primary" />
                ) : (
                  <Sparkles className="size-4 text-primary" />
                )}
                <h3 className="font-bold text-base text-foreground">
                  {editingCreator ? `Edit Partner: ${editingCreator.name}` : 'Onboard Official Partner'}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {errorMsg && (
              <p className="mb-3 rounded border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
                {errorMsg}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-foreground">
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

                <label className="block text-xs font-medium text-foreground">
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
                <label className="block text-xs font-medium text-foreground">
                  Organization / Clan Name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clashers Esports Org"
                    className={field}
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  />
                </label>

                <label className="block text-xs font-medium text-foreground">
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
                <label className="block text-xs font-medium text-foreground">
                  {editingCreator ? 'Partner Login Email (optional)' : 'Partner Login Email *'}
                  <input
                    type="email"
                    required={!editingCreator}
                    placeholder={editingCreator ? 'Leave blank to keep current' : 'partner@creator.com'}
                    className={field}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </label>

                <label className="block text-xs font-medium text-foreground">
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
                <label className="block text-xs font-medium text-foreground">
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
                <label className="block text-xs font-medium text-foreground">
                  Partner Logo / DP (Avatar)
                </label>
                <div className="flex items-center gap-3">
                  <div className="size-14 rounded-xl overflow-hidden border border-border bg-muted shrink-0">
                    <img
                      src={
                        formData.avatar ||
                        'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=200&q=80'
                      }
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 px-3 py-1.5 text-xs font-semibold text-foreground cursor-pointer transition">
                      <Upload className="size-3.5 text-primary" />
                      <span>Upload DP File</span>
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

              <label className="block text-xs font-medium text-foreground">
                Bio / Specialization
                <textarea
                  rows={2}
                  placeholder="Tell about their content, gaming tournaments, and community..."
                  className={field}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </label>

              <label className="block text-xs font-medium text-foreground">
                Games Supported (comma-separated)
                <input
                  type="text"
                  placeholder="Free Fire, BGMI, Valorant"
                  className={field}
                  value={formData.games}
                  onChange={(e) => setFormData({ ...formData, games: e.target.value })}
                />
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="block text-xs font-medium text-foreground">
                  YouTube URL
                  <input
                    type="url"
                    placeholder="https://youtube.com/..."
                    className={field}
                    value={formData.youtube}
                    onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                  />
                </label>

                <label className="block text-xs font-medium text-foreground">
                  Instagram URL
                  <input
                    type="url"
                    placeholder="https://instagram.com/..."
                    className={field}
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  />
                </label>

                <label className="block text-xs font-medium text-foreground">
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

              <div className="pt-3 flex justify-end gap-2 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-background hover:opacity-90 disabled:opacity-60"
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
          </div>
        </div>
      )}
    </div>
  )
}
