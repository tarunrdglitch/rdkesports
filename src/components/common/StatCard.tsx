import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  warn?: boolean
  icon?: ReactNode
  accent?: 'red' | 'white' | 'success' | 'warning' | 'gold' | 'purple'
}

const accentStyles = {
  red:     { value: 'text-primary',    icon: { bg: 'rgba(245,26,26,0.1)',    border: 'rgba(245,26,26,0.22)',    color: '#F51A1A'  } },
  white:   { value: 'text-foreground', icon: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)', color: '#ffffff'  } },
  success: { value: 'text-emerald-400',icon: { bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.22)',  color: '#34d399'  } },
  warning: { value: 'text-amber-400',  icon: { bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.22)',  color: '#fbbf24'  } },
  gold:    { value: 'gradient-text-gold', icon: { bg: 'rgba(255,170,0,0.1)', border: 'rgba(255,170,0,0.22)',  color: '#FFB800'  } },
  purple:  { value: 'text-purple-400', icon: { bg: 'rgba(168,85,247,0.1)',   border: 'rgba(168,85,247,0.22)', color: '#a855f7'  } },
}

export const StatCard = ({
  label, value, hint, warn, icon, accent = 'red',
}: StatCardProps) => {
  const a = accentStyles[accent]
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] font-body text-muted-foreground/70">
          {label}
        </p>
        {icon && (
          <div
            className="size-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: a.icon.bg,
              border: `1px solid ${a.icon.border}`,
              color: a.icon.color,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <p className={cn('mt-3 text-3xl font-bold tabular-nums stat-number', a.value)}>
        {value}
      </p>
      {hint && (
        <p
          className="mt-1.5 text-[11px] font-body"
          style={{ color: warn ? '#fbbf24' : 'hsl(240 4% 46%)' }}
        >
          {hint}
        </p>
      )}
    </div>
  )
}
