import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, Trash2, CheckCircle2, X,
  Mail, Trophy, Gavel, Shield, Phone, KeyRound,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/stores/authStore'

interface Ambassador {
  id: string; name: string; email: string
  tournamentId: string; tournamentName: string
  assignedTeamRange: string; phone?: string; createdAt: string
}
interface MiniTournament { id: string; name: string; game: string; format: string }

export default function AmbassadorManagementPage() {
  const { user } = useAuth()
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([])
  const [tournaments, setTournaments] = useState<MiniTournament[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [formData, setFormData] = useState({
    name: '', email: '', password: 'password123',
    tournamentId: '', phone: '',
  })

  useEffect(() => { loadAmbassadors(); loadTournaments() }, [])

  const loadTournaments = async () => {
    try {
      const res = await fetch('/api/tournaments')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setTournaments(data)
          const auctionList = data.filter((t: MiniTournament) => t.format === 'Auction Tournament' || t.format?.toLowerCase().includes('auction'))
          if (auctionList.length > 0) setFormData(prev => ({ ...prev, tournamentId: auctionList[0].id }))
        }
      }
    } catch {}
  }

  const loadAmbassadors = async () => {
    try {
      const res = await fetch('/api/creators/ambassadors')
      if (res.ok) setAmbassadors(await res.json())
    } catch {}
  }

  const auctionTournaments = tournaments.filter(t => t.format === 'Auction Tournament' || t.format?.toLowerCase().includes('auction'))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true); setErr(''); setMsg('')
    try {
      const selectedTourney = auctionTournaments.find(t => t.id === formData.tournamentId) || auctionTournaments[0]
      if (!selectedTourney) throw new Error('No Auction Tournament selected')
      const res = await fetch('/api/creators/ambassadors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password, tournamentId: selectedTourney.id, tournamentName: selectedTourney.name, assignedTeamRange: 'Live Auction Bidder', phone: formData.phone, creatorId: user?.organizationId || 'cr_creator' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create ambassador')
      setMsg(`Ambassador "${formData.name}" provisioned for "${selectedTourney.name}"! Login: ${formData.email}`)
      setIsOpen(false)
      loadAmbassadors()
      setFormData({ name: '', email: '', password: 'password123', tournamentId: selectedTourney.id, phone: '' })
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'An error occurred')
    } finally { setIsSubmitting(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Revoke access for ${name}?`)) return
    try {
      const res = await fetch(`/api/creators/ambassadors/${id}`, { method: 'DELETE' })
      if (res.ok) { setMsg(`Ambassador ${name} revoked.`); loadAmbassadors() }
    } catch { setErr('Failed to revoke ambassador') }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ambassador Desk"
        description="Official Creator Authority: Ambassadors manage franchise bidding in IPL-Style Auction tournaments only."
        badge="Staff Management"
        actions={
          auctionTournaments.length > 0 && (
            <button onClick={() => setIsOpen(true)} className="btn-primary cursor-pointer">
              <Plus className="size-4" />Provision Ambassador
            </button>
          )
        }
      />

      {/* Alerts */}
      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 rounded-xl p-3.5 text-xs font-body"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6EE7B7' }}>
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />{msg}
          </motion.div>
        )}
        {err && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 rounded-xl p-3.5 text-xs font-body"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>
            <X className="size-4 shrink-0 text-red-400" />{err}
          </motion.div>
        )}
      </AnimatePresence>

      {auctionTournaments.length === 0 ? (
        <div className="rdk-card p-16 text-center">
          <div className="size-14 rounded-2xl bg-amber-500/08 border border-amber-500/15 flex items-center justify-center mx-auto mb-4">
            <Gavel className="size-7 text-amber-500/50" />
          </div>
          <h3 className="font-heading font-bold text-base text-foreground mb-2">No Auction Tournaments Created</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6 font-body leading-relaxed">
            Ambassadors can only be provisioned for IPL-Style Auction tournaments to manage franchise bidding.
          </p>
          <Link to="/creator/tournaments/create" className="btn-primary">
            <Plus className="size-4" />Create Auction Tournament
          </Link>
        </div>
      ) : (
        <>
          {/* Info Notice */}
          <div className="rdk-card flex items-center gap-4 p-4"
            style={{ borderColor: 'rgba(245,26,26,0.2)', background: 'rgba(245,26,26,0.04)' }}>
            <div className="size-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Shield className="size-5" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-body">
              <span className="font-bold text-foreground">Exclusive Creator Privilege: </span>
              Only Official Creators can generate ambassador accounts to conduct franchise bidding in their auction tournaments.
            </p>
          </div>

          {/* Table */}
          <div className="rdk-card p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h2 className="font-heading font-bold text-sm text-foreground">Active Staff & Team Delegations</h2>
              </div>
              <span className="text-[11px] text-muted-foreground font-body px-2.5 py-1 rounded-lg bg-surface border border-border">
                {ambassadors.length} ambassadors
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Ambassador', 'Login Email', 'Tournament', 'Access / Role', 'Contact', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70 font-body">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ambassadors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-xs text-muted-foreground font-body">
                        No ambassadors yet. Click "Provision Ambassador" to add your first staff member.
                      </td>
                    </tr>
                  ) : ambassadors.map((a, idx) => (
                    <motion.tr key={a.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-xl bg-primary/12 border border-primary/20 text-primary flex items-center justify-center text-[11px] font-bold font-heading shrink-0">
                            {a.name[0]}
                          </div>
                          <span className="font-semibold text-foreground font-body">{a.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-muted-foreground font-mono text-[10px]">
                          <Mail className="size-3 shrink-0" />{a.email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 font-body text-foreground/80 font-medium">
                          <Trophy className="size-3 text-amber-500 shrink-0" />{a.tournamentName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold font-body text-[11px]">
                          {a.assignedTeamRange || 'Live Auction Bidder'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-body">{a.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(a.id, a.name)}
                          className="size-7 flex items-center justify-center rounded-lg bg-danger/08 border border-danger/20 text-danger/50 hover:text-danger hover:bg-danger/15 hover:border-danger/35 transition-all duration-200 cursor-pointer"
                          title="Revoke Ambassador">
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Provision Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div className="w-full max-w-md rounded-2xl overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #0E0C10, #0A080D)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(245,26,26,0.08)' }}
                initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 24 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                onClick={e => e.stopPropagation()}
              >
                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,26,26,0.6), transparent)' }} />
                <div className="relative z-10 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-heading font-bold text-base text-white">Provision Ambassador</h3>
                      <p className="text-[11px] font-body mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Create a staff account for auction tournament management</p>
                    </div>
                    <motion.button onClick={() => setIsOpen(false)} whileTap={{ scale: 0.9 }}
                      className="size-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                      <X className="size-4" />
                    </motion.button>
                  </div>

                  <form onSubmit={handleCreate} className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider font-body mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Full Name *</label>
                      <input type="text" required placeholder="e.g. Praveen Kumar" value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="rdk-input text-xs" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider font-body mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Login Email *</label>
                        <input type="email" required placeholder="amb@org.com" value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          className="rdk-input text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider font-body mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Temp Password *</label>
                        <input type="text" required value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          className="rdk-input text-xs" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider font-body mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Auction Tournament *</label>
                      <select value={formData.tournamentId} onChange={e => setFormData({ ...formData, tournamentId: e.target.value })} className="rdk-input text-xs">
                        {auctionTournaments.map(t => <option key={t.id} value={t.id}>{t.name} ({t.game})</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider font-body mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>WhatsApp Contact (Optional)</label>
                      <input type="tel" placeholder="+91 98765 43210" value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="rdk-input text-xs" />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setIsOpen(false)} className="btn-ghost text-xs cursor-pointer">Cancel</button>
                      <button type="submit" disabled={isSubmitting} className="btn-primary text-xs cursor-pointer disabled:opacity-60">
                        {isSubmitting ? (
                          <><span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating…</>
                        ) : (
                          <><KeyRound className="size-3.5" />Issue Account</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
