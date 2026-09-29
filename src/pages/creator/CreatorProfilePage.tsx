import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Trophy,
  ShieldCheck,
  Users,
  Gamepad2,
  Share2,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Plus,
  Calendar,
  Coins,
  Play,
  Lock,
  Camera,
  Upload,
  X,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { creatorService } from '@/services/api/creatorService'
import { tournamentService } from '@/services/api/tournamentService'
import type { OfficialCreator, Tournament } from '@/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { compressImageFile } from '@/utils/imageCompressor'

export default function CreatorProfilePage() {
  const { user, updateUser } = useAuth()
  const [creator, setCreator] = useState<OfficialCreator | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)

  // DP (Avatar) modal state
  const [isChangeDpOpen, setIsChangeDpOpen] = useState(false)
  const [newAvatarUrl, setNewAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [isSavingDp, setIsSavingDp] = useState(false)
  const [dpMsg, setDpMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadProfileAndTournaments()
  }, [user])

  const loadProfileAndTournaments = async () => {
    setLoading(true)
    try {
      const [creatorsList, allTournaments] = await Promise.all([
        creatorService.list(),
        tournamentService.list(),
      ])

      // Match current logged in creator
      const matched =
        creatorsList.find(
          (c) =>
            c.id === user?.organizationId ||
            c.handle.toLowerCase().replace('@', '') === user?.email?.toLowerCase().replace('@', '') ||
            c.handle.toLowerCase().replace('@', '') === user?.email?.toLowerCase().split('@')[0] ||
            c.name.toLowerCase() === user?.name?.toLowerCase() ||
            user?.email?.toLowerCase().includes('aurazoner') ||
            user?.name?.toLowerCase().includes('aurazoner')
        ) ||
        (user?.creatorProfile as OfficialCreator) ||
        null

      // Fallback default for Tamil Aura Zoner
      const activeCreator: OfficialCreator = matched || {
        id: 'cr_tamil_aura_zoner',
        name: user?.name || 'Tamil Aura Zoner',
        handle: '@tamilaurazonerofficial',
        organizationName: user?.organizationName || 'Tamil Aura Zoner Esports',
        avatar:
          'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80',
        bio: 'Official verified esports creator, tournament broadcaster, and community partner conducting competitive Free Fire & BGMI championships on RDK Esports.',
        subscribers: 'Official Partner',
        verified: true,
        games: ['Free Fire', 'BGMI'],
        socials: {
          youtube: 'https://youtube.com',
          instagram: 'https://instagram.com',
          discord: 'https://discord.gg',
        },
        activeTournaments: 0,
        totalTournaments: 0,
      }

      setCreator(activeCreator)

      // Filter tournaments hosted by this creator
      const myTourneys = allTournaments.filter(
        (t) =>
          t.creatorId === activeCreator.id ||
          t.creatorHandle?.toLowerCase().replace('@', '') ===
            activeCreator.handle?.toLowerCase().replace('@', '') ||
          t.creatorName?.toLowerCase() === activeCreator.name?.toLowerCase() ||
          t.creatorName?.toLowerCase() === user?.name?.toLowerCase()
      )
      setTournaments(myTourneys)
    } catch (err) {
      console.error('Failed to load creator profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyShareLink = () => {
    const handleClean = (creator?.handle || 'creator').replace('@', '')
    const url = `${window.location.origin}/#creators`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleOpenDpModal = () => {
    const current = creator?.avatar || ''
    setNewAvatarUrl(current)
    setAvatarPreview(current)
    setDpMsg(null)
    setIsChangeDpOpen(true)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      setDpMsg({ text: 'Image file size must be under 8MB', type: 'error' })
      return
    }
    try {
      const dataUrl = await compressImageFile(file, 500, 500, 0.82)
      setAvatarPreview(dataUrl)
      setNewAvatarUrl(dataUrl)
      setDpMsg(null)
    } catch {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        setAvatarPreview(dataUrl)
        setNewAvatarUrl(dataUrl)
        setDpMsg(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveDp = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetUrl = newAvatarUrl.trim()
    if (!targetUrl) {
      setDpMsg({ text: 'Please select an image file or provide an image link', type: 'error' })
      return
    }
    setIsSavingDp(true)
    setDpMsg(null)
    try {
      const creatorId = creator?.id || 'cr_tamil_aura_zoner'
      await creatorService.update(creatorId, { avatar: targetUrl })
      setCreator((prev) => (prev ? { ...prev, avatar: targetUrl } : null))
      updateUser({ avatar: targetUrl })
      setDpMsg({ text: 'Display Picture (DP) updated successfully!', type: 'success' })
      setTimeout(() => {
        setIsChangeDpOpen(false)
        setDpMsg(null)
      }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update DP'
      setDpMsg({ text: msg, type: 'error' })
    } finally {
      setIsSavingDp(false)
    }
  }

  // Calculate dynamic stats
  const totalTourneys = tournaments.length
  const activeTourneys = tournaments.filter(
    (t) => t.status === 'registration_open' || t.status === 'live'
  ).length
  const totalTeams = tournaments.reduce(
    (acc, t) => acc + (t.registeredTeamsCount || t.teams || 0),
    0
  )
  const totalPrizePool = tournaments.reduce((acc, t) => {
    const numeric = parseInt((t.prizePool || '0').replace(/[^0-9]/g, ''), 10)
    return acc + (isNaN(numeric) ? 0 : numeric)
  }, 0)

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground text-xs">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading creator profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ── 1. HERO BRAND & IDENTITY BANNER (COMMON CREATOR INFO) ── */}
      <div className="relative rounded-2xl border border-border/80 bg-gradient-to-b from-card via-card/90 to-background overflow-hidden shadow-2xl">
        {/* Esports ambient backdrop */}
        <div className="h-44 md:h-56 w-full relative overflow-hidden bg-gradient-to-r from-primary/30 via-amber-600/20 to-primary/10">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md border border-primary/40 px-3 py-1 text-[11px] font-bold text-primary shadow">
              <Sparkles className="size-3 text-primary animate-pulse" />
              Verified Official Partner
            </span>
          </div>
        </div>

        {/* Profile Card Overlay */}
        <div className="relative px-6 pb-6 pt-0 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 -mt-16 md:-mt-20">
            {/* Avatar & Main Titles */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              <div className="flex flex-col items-center sm:items-start gap-2 shrink-0">
                <div className="group/avatar relative size-28 md:size-32 rounded-2xl overflow-hidden border-4 border-card bg-muted shadow-2xl shrink-0 ring-2 ring-primary/40">
                  <img
                    src={
                      creator?.avatar ||
                      'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80'
                    }
                    alt={creator?.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleOpenDpModal}
                    className="absolute inset-0 bg-black/65 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[11px] font-bold cursor-pointer"
                    title="Change Profile Picture (DP)"
                  >
                    <Camera className="size-5 text-primary" />
                    <span>Change DP</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpenDpModal}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/90 transition cursor-pointer bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg px-2.5 py-1"
                >
                  <Camera className="size-3" />
                  <span>Change DP</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-heading font-black text-2xl md:text-3xl text-foreground tracking-tight">
                    {creator?.name || 'Creator Name'}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    <ShieldCheck className="size-3" /> Official Creator
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono text-primary font-bold">{creator?.handle}</span>
                  <span>•</span>
                  <span className="text-foreground font-semibold">{creator?.organizationName}</span>
                  <span>•</span>
                  <span className="rounded bg-muted px-2 py-0.5 font-medium text-[11px] text-muted-foreground">
                    {creator?.subscribers || 'Official Partner'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted transition shadow-sm"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Profile Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="size-3.5" />
                    <span>Share Public Profile</span>
                  </>
                )}
              </button>

              <Link
                to="/"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted transition shadow-sm"
              >
                <ExternalLink className="size-3.5" />
                <span>View on Landing Page</span>
              </Link>

              <Link
                to="/creator/tournaments/create"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-black text-background hover:opacity-90 transition shadow-md"
              >
                <Plus className="size-4" />
                <span>Host Tournament</span>
              </Link>
            </div>
          </div>

          {/* Admin Managed Note */}
          <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-primary shrink-0" />
              <span>
                <strong>Official Partner Profile:</strong> Managed by Platform Authority (Super Admin) & showcased on the RDK Esports Landing Page.
              </span>
            </div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded">
              Verified Partner
            </span>
          </div>

          {/* Creator Bio Description */}
          {creator?.bio && (
            <div className="mt-5 pt-4 border-t border-border/60">
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-4xl">
                {creator.bio}
              </p>
            </div>
          )}

          {/* Socials & Supported Games Bar */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/40">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
                Games:
              </span>
              {(creator?.games || ['Free Fire', 'BGMI']).map((game) => (
                <span
                  key={game}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground border border-border"
                >
                  <Gamepad2 className="size-3 text-primary" />
                  {game}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {creator?.socials?.youtube && (
                <a
                  href={creator.socials.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition"
                >
                  <Play className="size-3.5 fill-current" />
                  YouTube Channel
                </a>
              )}
              {creator?.socials?.instagram && (
                <a
                  href={creator.socials.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-1.5 text-xs font-bold text-pink-400 hover:bg-pink-500/20 transition"
                >
                  <Share2 className="size-3.5" />
                  Instagram
                </a>
              )}
              {creator?.socials?.discord && (
                <a
                  href={creator.socials.discord}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-400 hover:bg-indigo-500/20 transition"
                >
                  <ExternalLink className="size-3.5" />
                  Discord Community
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. PORTFOLIO KEY METRICS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tournaments Hosted</span>
            <Trophy className="size-4 text-primary" />
          </div>
          <div className="font-heading font-black text-2xl text-foreground">
            {totalTourneys}
          </div>
          <p className="text-[11px] text-muted-foreground">{activeTourneys} currently ongoing</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Teams Registered</span>
            <Users className="size-4 text-emerald-400" />
          </div>
          <div className="font-heading font-black text-2xl text-emerald-400">
            {totalTeams}
          </div>
          <p className="text-[11px] text-muted-foreground">Across all hosted leagues</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Prize Pool</span>
            <Coins className="size-4 text-amber-400" />
          </div>
          <div className="font-heading font-black text-2xl text-amber-400">
            ₹{totalPrizePool.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {totalTourneys === 0 ? 'No tournaments hosted yet' : 'Committed rewards & pools'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Creator Authority</span>
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <div className="font-heading font-black text-2xl text-primary">
            Tier-1 Host
          </div>
          <p className="text-[11px] text-muted-foreground">Verified Broadcast Rights</p>
        </div>
      </div>

      {/* ── 3. TOURNAMENTS HOSTED BY THIS CREATOR ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-black text-base text-foreground uppercase tracking-wide flex items-center gap-2">
              <Trophy className="size-4 text-primary" />
              Championships & Tournaments Hosted ({tournaments.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              All tournaments created and conducted under your creator authority.
            </p>
          </div>

          <Link
            to="/creator/tournaments/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-background shadow hover:opacity-90 transition"
          >
            <Plus className="size-3.5" />
            Host New Tournament
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Trophy className="size-12 text-muted-foreground/40 mx-auto" />
            <h3 className="font-heading font-bold text-sm text-foreground">No Tournaments Hosted Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Start building your competitive esports portfolio by hosting your first championship on RDK Esports.
            </p>
            <Link
              to="/creator/tournaments/create"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-background shadow hover:opacity-90 transition"
            >
              <Plus className="size-4" />
              Launch First Tournament
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="size-14 rounded-xl overflow-hidden bg-muted border border-border shrink-0">
                    <img
                      src={
                        t.banner ||
                        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=300&q=80'
                      }
                      alt={t.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-extrabold text-sm text-foreground">{t.name}</h4>
                      <StatusBadge status={t.status} />
                      <span className="rounded bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5">
                        {t.format}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <Gamepad2 className="size-3 text-primary" /> {t.game}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-bold text-amber-400">
                        <Coins className="size-3" /> {t.prizePool}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3 text-emerald-400" />
                        {t.registeredTeamsCount || t.teams || 0} / {t.maxTeams} Teams
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" /> {t.startDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <Link
                    to={`/tournaments/${t.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  >
                    <ExternalLink className="size-3" /> Public Page
                  </Link>

                  <Link
                    to={`/creator/tournaments/${t.id}/manage`}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/30 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-background transition"
                  >
                    Manage Control Room
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CHANGE DP MODAL ── */}
      {isChangeDpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Camera className="size-5 text-primary" />
                <h3 className="font-heading font-black text-lg text-foreground">
                  Update Profile Picture (DP)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeDpOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {dpMsg && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                  dpMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {dpMsg.type === 'success' ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}
                <span>{dpMsg.text}</span>
              </div>
            )}

            {/* Live Preview */}
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="size-24 rounded-2xl overflow-hidden border-2 border-primary/50 shadow-lg bg-muted relative">
                <img
                  src={
                    avatarPreview ||
                    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80'
                  }
                  alt="Avatar Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">Live Preview</span>
            </div>

            <form onSubmit={handleSaveDp} className="space-y-4 text-xs">
              {/* Option A: File Upload */}
              <div className="space-y-1.5">
                <label className="block font-bold text-foreground">
                  1. Upload from Device (Photo / Logo)
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-4 cursor-pointer bg-muted/30 hover:bg-muted/60 transition group">
                  <Upload className="size-6 text-muted-foreground group-hover:text-primary transition mb-1" />
                  <span className="text-xs font-semibold text-foreground">Click to browse file</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Supports PNG, JPG, WEBP (Max 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Option B: Direct Image URL */}
              <div className="space-y-1.5">
                <label className="block font-bold text-foreground">
                  2. Or Paste Image URL
                </label>
                <input
                  type="url"
                  value={newAvatarUrl}
                  onChange={(e) => {
                    setNewAvatarUrl(e.target.value)
                    setAvatarPreview(e.target.value)
                  }}
                  placeholder="https://images.unsplash.com/... or cloud image link"
                  className="w-full rounded-lg border border-border bg-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsChangeDpOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDp}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-background shadow hover:opacity-90 transition disabled:opacity-50"
                >
                  <Camera className="size-3.5" />
                  {isSavingDp ? 'Saving DP...' : 'Save Profile Picture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
