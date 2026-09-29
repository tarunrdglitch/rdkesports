import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Mail,
  Trophy,
  Gavel,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/stores/authStore'

interface Ambassador {
  id: string
  name: string
  email: string
  tournamentId: string
  tournamentName: string
  assignedTeamRange: string
  phone?: string
  createdAt: string
}

interface MiniTournament {
  id: string
  name: string
  game: string
  format: string
}

export default function AmbassadorManagementPage() {
  const { user } = useAuth()
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([])
  const [tournaments, setTournaments] = useState<MiniTournament[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'password123',
    tournamentId: '',
    assignedTeamRange: 'Teams 1 to 16',
    phone: '',
  })

  useEffect(() => {
    loadAmbassadors()
    loadTournaments()
  }, [])

  const loadTournaments = async () => {
    try {
      const res = await fetch('/api/tournaments')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setTournaments(data)
          const auctionList = data.filter(
            (t: MiniTournament) =>
              t.format === 'Auction Tournament' || t.format?.toLowerCase().includes('auction')
          )
          if (auctionList.length > 0) {
            setFormData((prev) => ({ ...prev, tournamentId: auctionList[0].id }))
          }
        }
      }
    } catch {}
  }

  const loadAmbassadors = async () => {
    try {
      const res = await fetch('/api/creators/ambassadors')
      if (res.ok) {
        const data = await res.json()
        setAmbassadors(data)
      }
    } catch {
      // Fallback
    }
  }

  const auctionTournaments = tournaments.filter(
    (t) => t.format === 'Auction Tournament' || t.format?.toLowerCase().includes('auction')
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErr('')
    setMsg('')

    try {
      const selectedTourney =
        auctionTournaments.find((t) => t.id === formData.tournamentId) || auctionTournaments[0]

      if (!selectedTourney) {
        throw new Error('No Auction Tournament selected')
      }

      const res = await fetch('/api/creators/ambassadors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          tournamentId: selectedTourney.id,
          tournamentName: selectedTourney.name,
          assignedTeamRange: formData.assignedTeamRange,
          phone: formData.phone,
          creatorId: user?.organizationId || 'cr_creator',
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create ambassador')
      }

      setMsg(`Ambassador "${formData.name}" provisioned for "${selectedTourney.name}"! Login email: ${formData.email}`)
      setIsOpen(false)
      loadAmbassadors()
      setFormData({
        name: '',
        email: '',
        password: 'password123',
        tournamentId: selectedTourney.id,
        assignedTeamRange: 'Teams 1 to 16',
        phone: '',
      })
    } catch (e: unknown) {
      if (e instanceof Error) setErr(e.message)
      else setErr('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Revoke ambassador access for ${name}? Their login will be immediately disabled.`)) return

    try {
      const res = await fetch(`/api/creators/ambassadors/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMsg(`Ambassador ${name} revoked.`)
        loadAmbassadors()
      }
    } catch {
      setErr('Failed to revoke ambassador')
    }
  }

  const field =
    'mt-1 w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creator Ambassador Desk"
        description="Official Creator Authority: Ambassadors can ONLY be created by you for IPL-Style Auction tournaments to manage franchise bidding."
        actions={
          auctionTournaments.length > 0 && (
            <button
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-xs font-semibold text-background shadow hover:opacity-90 transition"
            >
              <Plus className="size-4" />
              Provision Ambassador
            </button>
          )
        }
      />

      {msg && (
        <div className="flex items-center gap-2 rounded border border-success/30 bg-success/10 p-3 text-xs text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {err && (
        <div className="rounded border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          <span>{err}</span>
        </div>
      )}

      {/* When no auction tournaments exist */}
      {auctionTournaments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Gavel className="size-12 text-amber-500/60 mx-auto mb-3" />
          <h3 className="font-heading font-black text-base text-foreground uppercase tracking-wide">
            No Auction Tournaments Created
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-5">
            Ambassadors can ONLY be provisioned for IPL-Style Auction tournaments to manage franchise bidding. You currently do not have any auction-based tournaments created.
          </p>
          <Link
            to="/creator/tournaments/create"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-background shadow hover:opacity-90 transition"
          >
            <Plus className="size-4" />
            Create Auction Tournament
          </Link>
        </div>
      ) : (
        <>
          {/* Info Notice */}
          <div className="rounded border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
            <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Users className="size-5" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Exclusive Creator Privilege:</strong> Normal public users cannot register as ambassadors.
              Only Official Creators can generate temporary ambassador accounts to conduct franchise bidding in their respected auction tournament.
            </p>
          </div>

          {/* Active Ambassadors Table */}
          <div className="rounded border border-border bg-card overflow-hidden">
            <div className="border-b border-border p-4 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-foreground">Active Staff & Team Delegations</h2>
              <span className="text-xs text-muted-foreground">{ambassadors.length} active ambassadors</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-3 font-semibold">Ambassador Name</th>
                    <th className="p-3 font-semibold">Login Email</th>
                    <th className="p-3 font-semibold">Assigned Tournament</th>
                    <th className="p-3 font-semibold">Assigned Teams</th>
                    <th className="p-3 font-semibold">Contact</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ambassadors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No ambassadors created yet. Click "Provision Ambassador" to add your first staff member.
                      </td>
                    </tr>
                  ) : (
                    ambassadors.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/30 transition">
                        <td className="p-3 font-medium text-foreground flex items-center gap-2">
                          <div className="size-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                            {a.name[0]}
                          </div>
                          {a.name}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Mail className="size-3 text-muted-foreground" />
                            {a.email}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Trophy className="size-3 text-warning" />
                            {a.tournamentName}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-primary font-semibold text-[11px]">
                            {a.assignedTeamRange}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{a.phone || '—'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDelete(a.id, a.name)}
                            className="rounded p-1 text-muted-foreground hover:text-danger hover:bg-danger/10 transition"
                            title="Revoke Ambassador"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Provision Ambassador Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="font-bold text-base text-foreground">Provision Tournament Ambassador</h3>
              <button onClick={() => setIsOpen(false)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <label className="block text-xs font-medium text-foreground">
                Ambassador Full Name *
                <input
                  type="text"
                  required
                  placeholder="e.g. Praveen Kumar"
                  className={field}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-foreground">
                  Login Email Address *
                  <input
                    type="email"
                    required
                    placeholder="amb.praveen@org.com"
                    className={field}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </label>

                <label className="block text-xs font-medium text-foreground">
                  Temporary Password *
                  <input
                    type="text"
                    required
                    className={field}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </label>
              </div>

              <label className="block text-xs font-medium text-foreground">
                Assigned Auction Tournament *
                <select
                  className={field}
                  value={formData.tournamentId}
                  onChange={(e) => setFormData({ ...formData, tournamentId: e.target.value })}
                >
                  {auctionTournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.game})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-foreground">
                  Team / Franchise Delegation *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tamil Titans or Team 1"
                    className={field}
                    value={formData.assignedTeamRange}
                    onChange={(e) => setFormData({ ...formData, assignedTeamRange: e.target.value })}
                  />
                </label>

                <label className="block text-xs font-medium text-foreground">
                  Phone (WhatsApp)
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    className={field}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                  {isSubmitting ? 'Creating...' : 'Issue Ambassador Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
