import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  warn?: boolean
  icon?: ReactNode
  accent?: 'red' | 'white' | 'success' | 'warning'
}

const accentStyles = {
  red:     { color: '#E53935', bg: 'rgba(229,57,53,0.08)', border: 'rgba(229,57,53,0.2)' },
  white:   { color: '#ffffff', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' },
  success: { color: '#66BB6A', bg: 'rgba(102,187,106,0.08)', border: 'rgba(102,187,106,0.2)' },
  warning: { color: '#FF8F00', bg: 'rgba(255,143,0,0.08)', border: 'rgba(255,143,0,0.2)' },
}

export const StatCard = ({
  label, value, hint, warn, icon, accent = 'red',
}: StatCardProps) => {
  const a = accentStyles[accent]
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] font-body"
          style={{ color: '#555' }}>
          {label}
        </p>
        {icon && (
          <div
            className="size-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: a.bg, border: `1px solid ${a.border}`, color: a.color }}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 text-3xl tabular-nums stat-number" style={{ color: a.color }}>
        {value}
      </p>
      {hint && (
        <p
          className={cn('mt-1.5 text-[11px] font-body')}
          style={{ color: warn ? '#FF8F00' : '#555' }}
        >
          {hint}
        </p>
      )}
    </div>
  )
}
