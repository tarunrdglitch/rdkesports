import React, { useState, useEffect } from 'react'
import { Trophy, Plus, Trash2, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Award } from 'lucide-react'

export interface PrizeRankItem {
  rank: number
  label: string
  badgeIcon: string
  amount: number
}

interface PrizePoolDividerProps {
  totalPrize: number | string
  initialBreakdown?: string
  onChange: (total: number, breakdownString: string, ranks: PrizeRankItem[]) => void
}

const DEFAULT_RANKS: PrizeRankItem[] = [
  { rank: 1, label: 'Champions (1st Place)', badgeIcon: '🥇', amount: 6000 },
  { rank: 2, label: 'Runner Up (2nd Place)', badgeIcon: '🥈', amount: 3500 },
  { rank: 3, label: '2nd Runner Up (3rd Place)', badgeIcon: '🥉', amount: 2500 },
]

export const PrizePoolDivider: React.FC<PrizePoolDividerProps> = ({
  totalPrize,
  initialBreakdown = '',
  onChange,
}) => {
  const [total, setTotal] = useState<number>(() => {
    const num = Number(String(totalPrize).replace(/[^0-9.]/g, ''))
    return isNaN(num) || num <= 0 ? 12000 : num
  })

  const [ranks, setRanks] = useState<PrizeRankItem[]>(() => {
    // Attempt parsing from initialBreakdown if available
    if (initialBreakdown && initialBreakdown.includes(':')) {
      const parts = initialBreakdown.split(/[|•\n,]/).map((s) => s.trim()).filter(Boolean)
      const parsed: PrizeRankItem[] = []
      let r = 1
      for (const p of parts) {
        const match = p.match(/(\d+)(?:st|nd|rd|th)?.*?[:=-]\s*(?:₹|Rs\.?)?\s*([0-9kK,]+)/i)
        if (match) {
          let amtStr = match[2].replace(/,/g, '').toLowerCase()
          let amt = 0
          if (amtStr.endsWith('k')) {
            amt = parseFloat(amtStr) * 1000
          } else {
            amt = parseFloat(amtStr)
          }
          parsed.push({
            rank: r,
            label: r === 1 ? 'Champions (1st Place)' : r === 2 ? 'Runner Up (2nd Place)' : r === 3 ? '2nd Runner Up (3rd Place)' : `Rank ${r}`,
            badgeIcon: r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : '🎖️',
            amount: amt || 0,
          })
          r++
        }
      }
      if (parsed.length > 0) return parsed
    }
    return DEFAULT_RANKS
  })

  // Sync total when external prop changes
  useEffect(() => {
    const num = Number(String(totalPrize).replace(/[^0-9.]/g, ''))
    if (!isNaN(num) && num > 0 && num !== total) {
      setTotal(num)
    }
  }, [totalPrize])

  // Total allocated sum
  const allocatedSum = ranks.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const remaining = total - allocatedSum
  const allocatedPct = total > 0 ? Math.round((allocatedSum / total) * 100) : 0

  // Format formatted breakdown string and fire onChange
  useEffect(() => {
    const breakdownStr = ranks
      .map((r) => `${r.badgeIcon} ${r.rank === 1 ? '1st' : r.rank === 2 ? '2nd' : r.rank === 3 ? '3rd' : `${r.rank}th`}: ₹${r.amount.toLocaleString('en-IN')}`)
      .join(' | ')
    onChange(total, breakdownStr, ranks)
  }, [total, ranks])

  // Presets Handlers
  const applyPreset = (presetType: 'tnbbl' | '50_30_20' | '60_25_15' | 'winner_takes_all' | 'equal') => {
    if (presetType === 'tnbbl') {
      setTotal(12000)
      setRanks([
        { rank: 1, label: 'Champions (1st Place)', badgeIcon: '🥇', amount: 6000 },
        { rank: 2, label: 'Runner Up (2nd Place)', badgeIcon: '🥈', amount: 3500 },
        { rank: 3, label: '2nd Runner Up (3rd Place)', badgeIcon: '🥉', amount: 2500 },
      ])
      return
    }

    if (presetType === 'winner_takes_all') {
      setRanks([
        { rank: 1, label: 'Grand Champion (100%)', badgeIcon: '🥇', amount: total },
      ])
      return
    }

    if (presetType === '50_30_20') {
      setRanks([
        { rank: 1, label: '1st Place (50%)', badgeIcon: '🥇', amount: Math.round(total * 0.5) },
        { rank: 2, label: '2nd Place (30%)', badgeIcon: '🥈', amount: Math.round(total * 0.3) },
        { rank: 3, label: '3rd Place (20%)', badgeIcon: '🥉', amount: Math.round(total * 0.2) },
      ])
      return
    }

    if (presetType === '60_25_15') {
      setRanks([
        { rank: 1, label: '1st Place (60%)', badgeIcon: '🥇', amount: Math.round(total * 0.6) },
        { rank: 2, label: '2nd Place (25%)', badgeIcon: '🥈', amount: Math.round(total * 0.25) },
        { rank: 3, label: '3rd Place (15%)', badgeIcon: '🥉', amount: Math.round(total * 0.15) },
      ])
      return
    }

    if (presetType === 'equal') {
      const count = Math.max(1, ranks.length)
      const each = Math.floor(total / count)
      setRanks(
        ranks.map((r, i) => ({
          ...r,
          amount: i === count - 1 ? total - each * (count - 1) : each,
        }))
      )
    }
  }

  // Update specific rank amount
  const handleAmountChange = (index: number, val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '')
    const num = cleaned === '' ? 0 : Number(cleaned)
    setRanks((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, amount: num } : item))
    )
  }

  // Set number of prize places
  const setTierCount = (count: number) => {
    const targetCount = Math.max(1, Math.min(10, count))
    const badges = ['🥇', '🥈', '🥉', '🎖️', '🎖️', '🎖️', '🎖️', '🎖️', '🎖️', '🎖️']
    const labels = [
      'Champions (1st Place)',
      'Runner Up (2nd Place)',
      '2nd Runner Up (3rd Place)',
      '4th Place',
      '5th Place',
      '6th Place',
      '7th Place',
      '8th Place',
      '9th Place',
      '10th Place',
    ]

    const newRanks: PrizeRankItem[] = []
    const each = Math.floor(total / targetCount)

    for (let i = 0; i < targetCount; i++) {
      const existing = ranks[i]
      newRanks.push({
        rank: i + 1,
        label: labels[i] || `Rank ${i + 1}`,
        badgeIcon: badges[i] || '🎖️',
        amount: existing ? existing.amount : i === targetCount - 1 ? total - each * (targetCount - 1) : each,
      })
    }
    setRanks(newRanks)
  }

  // Add individual rank
  const handleAddRank = () => {
    if (ranks.length >= 10) return
    const nextRank = ranks.length + 1
    setRanks((prev) => [
      ...prev,
      {
        rank: nextRank,
        label: nextRank === 2 ? 'Runner Up (2nd Place)' : nextRank === 3 ? '2nd Runner Up (3rd Place)' : `Rank ${nextRank}`,
        badgeIcon: nextRank === 2 ? '🥈' : nextRank === 3 ? '🥉' : '🎖️',
        amount: remaining > 0 ? remaining : 0,
      },
    ])
  }

  // Remove individual rank
  const handleRemoveRank = (idx: number) => {
    if (ranks.length <= 1) return
    const updated = ranks.filter((_, i) => i !== idx).map((r, i) => ({
      ...r,
      rank: i + 1,
      badgeIcon: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎖️',
    }))
    setRanks(updated)
  }

  return (
    <div className="rounded-xl border border-blue-900/40 bg-[#070b19] p-4 sm:p-5 text-foreground space-y-4 shadow-xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-900/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Trophy className="size-4" />
          </div>
          <div>
            <h4 className="font-heading text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              Prize Pool & Rank-Wise Distribution
              <Sparkles className="size-3.5 text-amber-400" />
            </h4>
            <p className="text-[11px] text-blue-300/70">
              Define total prize pool and how it divides into 1st, 2nd, 3rd places
            </p>
          </div>
        </div>

        {/* Total Prize Input */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-muted-foreground uppercase">
            Total Prize:
          </label>
          <div className="relative w-36">
            <span className="absolute left-2.5 top-1.5 text-xs text-amber-400 font-bold">₹</span>
            <input
              type="number"
              min="0"
              value={total}
              onChange={(e) => setTotal(Math.max(0, Number(e.target.value) || 0))}
              placeholder="12000"
              className="w-full bg-[#0d1636] border border-blue-900 rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-mono font-black text-amber-300 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 text-[11px] text-blue-300 font-bold">
          <Award className="size-3.5 text-amber-400" />
          <span>Quick Splits:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset('tnbbl')}
            className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-[11px] font-bold transition flex items-center gap-1"
          >
            ⚡ TNBBL (₹6K / ₹3.5K / ₹2.5K)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('50_30_20')}
            className="px-2 py-1 rounded bg-blue-950 border border-blue-900 text-blue-200 hover:bg-blue-900/50 text-[11px] font-medium transition"
          >
            50% / 30% / 20%
          </button>
          <button
            type="button"
            onClick={() => applyPreset('60_25_15')}
            className="px-2 py-1 rounded bg-blue-950 border border-blue-900 text-blue-200 hover:bg-blue-900/50 text-[11px] font-medium transition"
          >
            60% / 25% / 15%
          </button>
          <button
            type="button"
            onClick={() => applyPreset('winner_takes_all')}
            className="px-2 py-1 rounded bg-blue-950 border border-blue-900 text-blue-200 hover:bg-blue-900/50 text-[11px] font-medium transition"
          >
            Winner Takes 100%
          </button>
          <button
            type="button"
            onClick={() => applyPreset('equal')}
            className="px-2 py-1 rounded bg-blue-950 border border-blue-900 text-blue-200 hover:bg-blue-900/50 text-[11px] font-medium transition"
          >
            Split Equally
          </button>
        </div>
      </div>

      {/* Prize Places Count Selector */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[11px] font-bold text-muted-foreground uppercase">
          Top Places Awarded:
        </span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5, 8].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setTierCount(c)}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition ${
                ranks.length === c
                  ? 'bg-primary text-background border-primary'
                  : 'bg-muted/30 text-muted-foreground border-border hover:text-white'
              }`}
            >
              Top {c}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Rank Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ranks.map((item, idx) => {
          const rankPct = total > 0 ? Math.round((item.amount / total) * 100) : 0
          return (
            <div
              key={item.rank}
              className={`relative rounded-xl border p-3.5 space-y-2 transition shadow-md ${
                idx === 0
                  ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-[#0a1026] to-[#070b19]'
                  : idx === 1
                  ? 'border-slate-400/30 bg-gradient-to-br from-slate-400/10 via-[#0a1026] to-[#070b19]'
                  : idx === 2
                  ? 'border-amber-700/30 bg-gradient-to-br from-amber-700/10 via-[#0a1026] to-[#070b19]'
                  : 'border-blue-900/50 bg-[#0d1636]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.badgeIcon}</span>
                  <div>
                    <span className="text-xs font-black uppercase text-white tracking-wide block">
                      {item.label}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {rankPct}% of total prize
                    </span>
                  </div>
                </div>

                {ranks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRank(idx)}
                    className="p-1 text-muted-foreground hover:text-red-400 transition"
                    title="Remove rank"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Amount Input */}
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-black text-amber-400">₹</span>
                <input
                  type="text"
                  value={item.amount || ''}
                  onChange={(e) => handleAmountChange(idx, e.target.value)}
                  placeholder="e.g. 6000"
                  className="w-full bg-[#070b19] border border-blue-900/80 rounded-lg pl-6 pr-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )
        })}

        {ranks.length < 10 && (
          <button
            type="button"
            onClick={handleAddRank}
            className="rounded-xl border-2 border-dashed border-blue-900/60 hover:border-amber-500/50 bg-blue-950/20 hover:bg-blue-950/40 p-4 flex flex-col items-center justify-center gap-1 text-blue-300 hover:text-white transition group"
          >
            <Plus className="size-5 text-amber-400 group-hover:scale-110 transition" />
            <span className="text-xs font-bold uppercase tracking-wider">Add Prize Rank</span>
          </button>
        )}
      </div>

      {/* Allocation Progress & Summary Bar */}
      <div className="rounded-xl border border-blue-900/60 bg-blue-950/30 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Prize Allocation:</span>
            <span className="font-mono text-blue-200">
              ₹{allocatedSum.toLocaleString('en-IN')} / ₹{total.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] font-bold text-muted-foreground">({allocatedPct}%)</span>
          </div>

          <div>
            {remaining === 0 ? (
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="size-3.5" /> 100% Fully Allocated
              </span>
            ) : remaining > 0 ? (
              <span className="text-amber-300 font-bold text-xs flex items-center gap-1">
                <AlertCircle className="size-3.5" /> ₹{remaining.toLocaleString('en-IN')} Unallocated
              </span>
            ) : (
              <span className="text-rose-400 font-bold text-xs flex items-center gap-1">
                <AlertCircle className="size-3.5" /> Over-allocated by ₹{Math.abs(remaining).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-blue-950 overflow-hidden border border-blue-900/40">
          <div
            className={`h-full transition-all duration-300 ${
              remaining === 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : remaining > 0
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, allocatedPct)}%` }}
          />
        </div>

        {/* Formatted Output Preview */}
        <div className="text-[11px] font-mono text-blue-300/80 bg-[#070b19]/80 rounded p-2 border border-blue-950 flex items-center justify-between gap-2 overflow-x-auto">
          <span className="text-muted-foreground uppercase text-[10px] shrink-0 font-sans font-bold">
            Public Display Format:
          </span>
          <span className="text-amber-200 truncate">
            {ranks
              .map((r) => `${r.badgeIcon} ${r.rank === 1 ? '1st' : r.rank === 2 ? '2nd' : r.rank === 3 ? '3rd' : `${r.rank}th`}: ₹${r.amount.toLocaleString('en-IN')}`)
              .join(' | ')}
          </span>
        </div>
      </div>
    </div>
  )
}
