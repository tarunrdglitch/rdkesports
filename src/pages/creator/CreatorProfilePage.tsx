import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Trophy,
  ShieldCheck,
  Users,
  Gamepad2,
  Share2,
  Copy,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Sparkles,
  Plus,
  Calendar,
  Coins,
  Radio,
  X,
  AlertCircle,
  Play,
  Save,
} from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { creatorService } from '@/services/api/creatorService'
import { tournamentService } from '@/services/api/tournamentService'
import type { OfficialCreator, Tournament } from '@/types'
import { StatusBadge } from '@/components/common/StatusBadge'

export default function CreatorProfilePage() {
  const { user } = useAuth()
  const [creator, setCreator] = useState<OfficialCreator | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Edit form state
  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    organizationName: '',
    avatar: '',
    bio: '',
    subscribers: '',
    games: '',
    youtube: '',
    instagram: '',
    discord: '',
  })

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
      setFormData({
        name: activeCreator.name,
        handle: activeCreator.handle,
        organizationName: activeCreator.organizationName,
        avatar: activeCreator.avatar || '',
        bio: activeCreator.bio || '',
        subscribers: activeCreator.subscribers || 'Official Partner',
        games: Array.isArray(activeCreator.games) ? activeCreator.games.join(', ') : '',
        youtube: activeCreator.socials?.youtube || '',
        instagram: activeCreator.socials?.instagram || '',
        discord: activeCreator.socials?.discord || '',
      })

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
    const url = `${window.location.origin}/tournaments?creator=${encodeURIComponent(handleClean)}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!creator) return

    setIsSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const gamesList = formData.games
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean)

      const payload: Partial<OfficialCreator> = {
        name: formData.name.trim(),
        handle: formData.handle.startsWith('@') ? formData.handle.trim() : `@${formData.handle.trim()}`,
        organizationName: formData.organizationName.trim(),
        avatar: formData.avatar.trim() || undefined,
        bio: formData.bio.trim(),
        subscribers: formData.subscribers.trim() || 'Official Partner',
        games: gamesList.length > 0 ? gamesList : ['Free Fire', 'BGMI'],
        socials: {
          youtube: formData.youtube.trim() || undefined,
          instagram: formData.instagram.trim() || undefined,
          discord: formData.discord.trim() || undefined,
        },
      }

      const updated = await creatorService.update(creator.id, payload)
      setCreator(updated)
      setIsEditing(false)
      setSuccessMsg('Creator portfolio updated successfully!')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update portfolio')
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate dynamic stats
  const totalTourneys = tournaments.length
  const activeTourneys = tournaments.filter((t) => t.status === 'registration_open' || t.status === 'live').length
  const totalTeams = tournaments.reduce((acc, t) => acc + (t.registeredTeamsCount || t.teams || 0), 0)
  const totalPrizePool = tournaments.reduce((acc, t) => {
    const numeric = parseInt((t.prizePool || '0').replace(/[^0-9]/g, ''), 10)
    return acc + (isNaN(numeric) ? 0 : numeric)
  }, 0)

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground text-xs">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading creator portfolio...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── 1. HERO BRAND & IDENTITY BANNER ── */}
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
              <div className="relative group size-28 md:size-32 rounded-2xl overflow-hidden border-4 border-card bg-muted shadow-2xl shrink-0 ring-2 ring-primary/40">
                <img
                  src={
                    creator?.avatar ||
                    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80'
                  }
                  alt={creator?.name}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                />
                <button
                  onClick={() => setIsEditing(true)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1 cursor-pointer"
                >
                  <Edit3 className="size-4 text-primary" />
                  Change
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-heading font-black text-2xl md:text-3xl text-foreground tracking-tight">
                    {creator?.name || 'Creator Name'}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    <ShieldCheck className="size-3" /> Partner
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
                    <span className="text-emerald-400">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="size-3.5" />
                    <span>Share Portfolio</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition shadow-sm"
              >
                <Edit3 className="size-3.5" />
                <span>Edit Portfolio</span>
              </button>

              <Link
                to="/creator/tournaments/create"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-black text-background hover:opacity-90 transition shadow-md"
              >
                <Plus className="size-4" />
                <span>Host Tournament</span>
              </Link>
            </div>
          </div>

          {/* Creator Bio Description */}
          {creator?.bio && (
            <div className="mt-6 pt-5 border-t border-border/60">
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
                  Discord
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
            ₹{totalPrizePool > 0 ? totalPrizePool.toLocaleString() : '50,000+'}
          </div>
          <p className="text-[11px] text-muted-foreground">Committed rewards & pools</p>
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

      {/* ── 3. TOURNAMENTS PORTFOLIO GRID ── */}
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

      {/* ── 4. EDIT PROFILE & SOCIALS MODAL ── */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
              <div className="flex items-center gap-2">
                <Edit3 className="size-5 text-primary" />
                <h3 className="font-heading font-black text-lg text-foreground">
                  Edit Creator Portfolio & Brand
                </h3>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-foreground mb-1">Creator / Channel Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-muted p-2.5 text-foreground font-semibold focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">Public Handle *</label>
                  <input
                    type="text"
                    required
                    value={formData.handle}
                    onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                    className="w-full rounded-lg border border-border bg-muted p-2.5 text-foreground font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-foreground mb-1">Organization / Clan Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    className="w-full rounded-lg border border-border bg-muted p-2.5 text-foreground font-semibold focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">Community Tag / Subscribers</label>
                  <input
                    type="text"
                    value={formData.subscribers}
                    onChange={(e) => setFormData({ ...formData, subscribers: e.target.value })}
                    placeholder="e.g. 50K Subscribers or Official Partner"
                    className="w-full rounded-lg border border-border bg-muted p-2.5 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Avatar Image URL</label>
                <input
                  type="url"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-muted p-2.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Bio / Channel Overview</label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell tournament participants and brands about your channel and tournaments..."
                  className="w-full rounded-lg border border-border bg-muted p-2.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Supported Games (comma-separated)</label>
                <input
                  type="text"
                  value={formData.games}
                  onChange={(e) => setFormData({ ...formData, games: e.target.value })}
                  placeholder="Free Fire, BGMI, Valorant"
                  className="w-full rounded-lg border border-border bg-muted p-2.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-border space-y-3">
                <span className="font-bold text-foreground text-xs uppercase tracking-wider block">
                  Connected Social Links
                </span>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-muted-foreground font-semibold">YouTube URL:</span>
                    <input
                      type="url"
                      value={formData.youtube}
                      onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                      placeholder="https://youtube.com/@channel"
                      className="flex-1 rounded-lg border border-border bg-muted p-2 text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-24 text-muted-foreground font-semibold">Instagram URL:</span>
                    <input
                      type="url"
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                      placeholder="https://instagram.com/handle"
                      className="flex-1 rounded-lg border border-border bg-muted p-2 text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-24 text-muted-foreground font-semibold">Discord URL:</span>
                    <input
                      type="url"
                      value={formData.discord}
                      onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                      placeholder="https://discord.gg/invite"
                      className="flex-1 rounded-lg border border-border bg-muted p-2 text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-background shadow hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="size-3.5" />
                  {isSaving ? 'Saving...' : 'Save Portfolio Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
