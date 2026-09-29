import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  badge?: string
}

export const PageHeader = ({ title, description, actions, badge }: PageHeaderProps) => (
  <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
    <div className="space-y-1.5">
      {badge && (
        <div className="badge-primary inline-flex mb-1">{badge}</div>
      )}
      <h1 className="text-2xl text-foreground font-display tracking-wide leading-tight">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-muted-foreground font-body leading-relaxed">
          {description}
        </p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
)
