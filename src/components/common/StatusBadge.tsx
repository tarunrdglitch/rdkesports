import { cn } from '@/utils/cn'

const map: Record<string, string> = {
  live:              'badge-accent',
  registration_open: 'badge-success',
  draft:             'badge-primary',
  completed:         'text-muted-foreground bg-muted border border-border/30 text-[9px] font-display uppercase tracking-widest px-2 py-0.5 rounded-full inline-flex items-center gap-1',
  paused:            'badge-warning',
}

const labelMap: Record<string, string> = {
  live:              'Live',
  registration_open: 'Registration Open',
  draft:             'Draft',
  completed:         'Completed',
  paused:            'Paused',
}

export const StatusBadge = ({ status }: { status: string }) => (
  <span className={cn(map[status] ?? map.draft)}>
    {status === 'live' && <span className="live-dot" />}
    {labelMap[status] ?? status.replace(/_/g, ' ')}
  </span>
)
