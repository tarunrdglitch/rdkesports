import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  badge?: string
}

export const PageHeader = ({ title, description, actions, badge }: PageHeaderProps) => (
  <div className="mb-7">
    {/* Top bar with badge and actions */}
    <div className="flex flex-wrap items-start justify-between gap-4 mb-0">
      <div className="space-y-2">
        {badge && (
          <span className="section-eyebrow text-[10px]">{badge}</span>
        )}
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground font-body leading-relaxed mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {actions}
        </div>
      )}
    </div>
    {/* Decorative divider */}
    <div className="mt-5 rdk-divider-glow" />
  </div>
)
