import { cn } from '@/utils/cn'
const map:Record<string,string>={live:'bg-danger/15 text-danger',registration_open:'bg-success/15 text-success',draft:'bg-muted text-muted-foreground',completed:'bg-primary/15 text-primary',paused:'bg-warning/15 text-warning'}
export const StatusBadge=({status}:{status:string})=>(<span className={cn('inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold',map[status]??map.draft)}>{status==='live'&&<span className="size-1.5 rounded-full bg-danger animate-pulse"/>}{status.replace('_',' ')}</span>)
