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
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { creatorService } from '@/services/api/creatorService'
import type { OfficialCreator } from '@/types'

const initialForm = {
  name: '',
  handle: '',
  organizationName: '',
  email: '',
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
  const [creators, setCreators] = useState<OfficialCreator[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingCreator, setEditingCreator] = useState<OfficialCreator | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Form State
  const [formData, setFormData] = useState(initialForm)

  useEffect(() => {
    loadCreators()
  }, [])

  const loadCreators = () => {
    creatorService.list().then(setCreators)
  }

  const handleStartEdit = (c: OfficialCreator) => {
    setEditingCreator(c)
    setFormData({
      name: c.name || '',
      handle: c.handle || '',
      organizationName: c.organizationName || '',
      email: '',
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

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove creator "${name}"?`)) return
    try {
      await creatorService.delete(id)
      setSuccessMsg(`Creator "${name}" removed successfully.`)
      loadCreators()
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message)
      else setErrorMsg('Failed to remove creator')
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
        setSuccessMsg(`Official Creator "${formData.name}" updated successfully!`)
      } else {
        await creatorService.create(payload)
        setSuccessMsg(`Official Creator "${formData.name}" onboarded successfully! Partner credentials generated.`)
      }

      setIsOpen(false)
      setEditingCreator(null)
      loadCreators()
      setFormData(initialForm)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message)
      } else {
        setErrorMsg(editingCreator ? 'Failed to update creator' : 'Failed to onboard creator')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const field =
    'mt-1 w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Official Creators & Verified Partners"
        description="Head Authority: Review, onboard, and manage authorized esports creators who conduct tournaments on RDK Esports."
        actions={
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-xs font-semibold text-background shadow hover:opacity-90 transition"
          >
            <Plus className="size-4" />
            Onboard Official Creator
          </button>
        }
      />

      {successMsg && (
        <div className="flex items-center gap-2 rounded border border-success/30 bg-success/10 p-3 text-xs text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Verified Partners</span>
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">{creators.length}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Authorized tournament hosts</p>
        </div>

        <div className="rounded border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Total Tournaments Conducted</span>
            <Trophy className="size-4 text-warning" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">
            {creators.reduce((acc, c) => acc + (c.totalTournaments || 0), 0)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Across partner creators</p>
        </div>

        <div className="rounded border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Creator Reach</span>
            <Users className="size-4 text-success" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">1.0M+</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Combined follower base</p>
        </div>
      </div>

      {/* Creators List */}
      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="border-b border-border p-4 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-foreground">Verified Creator Directory</h2>
          <span className="text-xs text-muted-foreground">{creators.length} active partners</span>
        </div>

        {creators.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="size-8 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm text-foreground">No creators onboarded yet</p>
            <p className="text-xs mt-1">Use the "Onboard Official Creator" button above to add authorized tournament organizers.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {creators.map((c) => (
              <div
                key={c.id}
                className="rounded border border-border bg-muted/30 p-4 flex flex-col justify-between hover:border-primary/40 transition"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="size-12 rounded-full border border-border object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-foreground truncate">{c.name}</span>
                        <span className="size-3.5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check className="size-2.5 text-background stroke-[3]" />
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{c.handle}</p>
                      <p className="text-[10px] text-primary mt-0.5 font-medium truncate">{c.organizationName}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">{c.bio}</p>

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

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Tournaments: <strong className="text-foreground">{c.totalTournaments}</strong></span>
                  <div className="flex items-center gap-1.5">
                    {c.socials.youtube && (
                      <a
                        href={c.socials.youtube}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1 text-muted-foreground hover:text-danger hover:bg-muted"
                        title="YouTube"
                      >
                        <Play className="size-3.5" />
                      </a>
                    )}
                    {c.socials.instagram && (
                      <a
                        href={c.socials.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1 text-muted-foreground hover:text-purple-400 hover:bg-muted"
                        title="Instagram"
                      >
                        <Share2 className="size-3.5" />
                      </a>
                    )}
                    {c.socials.discord && (
                      <a
                        href={c.socials.discord}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1 text-muted-foreground hover:text-indigo-400 hover:bg-muted"
                        title="Discord"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleStartEdit(c)}
                      className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-muted transition-colors ml-1"
                      title={`Edit ${c.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id, c.name)}
                      className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title={`Remove ${c.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Creator Modal (Create or Edit) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                {editingCreator ? (
                  <Pencil className="size-4 text-primary" />
                ) : (
                  <Sparkles className="size-4 text-primary" />
                )}
                <h3 className="font-bold text-base text-foreground">
                  {editingCreator ? `Edit Partner: ${editingCreator.name}` : 'Onboard Official Creator Partner'}
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
                  Creator / Channel Name *
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
                  Subscribers / Followers Tag
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
                  {editingCreator ? 'Update Password (optional)' : 'Temporary Password *'}
                  <input
                    type="text"
                    required={!editingCreator}
                    placeholder={editingCreator ? 'Leave blank to keep current' : 'e.g. secret123'}
                    className={field}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </label>
              </div>

              <label className="block text-xs font-medium text-foreground">
                Avatar Image URL (optional)
                <input
                  type="url"
                  placeholder="https://... (image URL)"
                  className={field}
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                />
              </label>

              <label className="block text-xs font-medium text-foreground">
                Bio / Tournament Focus
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
                  className="rounded bg-primary px-4 py-1.5 text-xs font-bold text-background hover:opacity-90 disabled:opacity-60"
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
