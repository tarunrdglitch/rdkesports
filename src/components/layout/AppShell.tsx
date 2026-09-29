import { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogOut, ExternalLink } from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { adminNav, creatorNav, ambassadorNav, playerNav, NavItem } from '@/app/config/roles'
import { cn } from '@/utils/cn'

export const AppShell = () => {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)

  // Dynamically select menu based on active role
  const isOwner = user?.role === 'super_admin' || user?.email?.toLowerCase() === 'auraxtremezofficial@gmail.com'
  const displayName = isOwner ? 'Tarun' : (user?.name || 'User')

  const getNavItems = (): NavItem[] => {
    if (!user) return []
    if (isOwner) return adminNav
    if (['org_owner', 'org_admin', 'tournament_manager'].includes(user.role)) return creatorNav
    if (user.role === 'ambassador') return ambassadorNav
    return playerNav
  }

  const items = getNavItems()

  const getRoleLabel = () => {
    if (isOwner) return 'Owner'
    switch (user?.role) {
      case 'super_admin':
        return 'Owner'
      case 'org_owner':
        return 'Official Creator'
      case 'org_admin':
        return 'Org Admin'
      case 'ambassador':
        return 'Ambassador'
      case 'team_captain':
        return 'Team Captain'
      case 'player':
        return 'Player'
      default:
        return 'Member'
    }
  }

  const Links = () => (
    <nav aria-label="Primary Navigation" className="flex flex-col gap-1 p-3">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between rounded px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              isActive && 'bg-muted text-foreground border-l-2 border-primary font-bold'
            )
          }
        >
          <span>{i.label}</span>
          {i.badge && (
            <span className="rounded bg-primary/20 text-primary px-1.5 py-0.5 text-[10px] font-bold">
              {i.badge}
            </span>
          )}
        </NavLink>
      ))}

      <div className="pt-4 mt-2 border-t border-border">
        <Link
          to="/"
          className="flex items-center gap-2 rounded px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ExternalLink className="size-3.5" />
          <span>Public Tournament Hub</span>
        </Link>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {/* Desktop Sidebar */}
      <aside className="hidden border-r border-border bg-card lg:flex lg:flex-col">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="RDK Esports"
              className="h-9 w-auto drop-shadow-[0_0_8px_rgba(255,180,0,0.4)]"
            />
            <div className="flex flex-col leading-none">
              <span className="font-heading font-black text-sm tracking-widest text-foreground">RDK ESPORTS</span>
              <span className="text-[9px] text-muted-foreground font-medium">Tournament OS</span>
            </div>
          </Link>
        </div>

        <Links />

        <div className="mt-auto p-4 border-t border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
              {displayName?.[0] || 'T'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
              <span className="inline-block text-[9px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                {getRoleLabel()}
              </span>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground text-center">Powered by RDK Technologies</p>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-card lg:hidden flex flex-col"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="RDK Esports" className="h-7 w-auto" />
                  <span className="font-heading font-black text-sm tracking-widest">RDK ESPORTS</span>
                </div>
                <button onClick={() => setOpen(false)}><X className="size-5" /></button>
              </div>
              <Links />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="min-w-0 flex flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:px-8 bg-card/40 backdrop-blur sticky top-0 z-30">
          <button
            className="lg:hidden p-1.5 rounded hover:bg-muted"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-semibold text-foreground">{displayName}</span>
              <span className="text-[10px] text-primary font-medium">{getRoleLabel()}</span>
            </div>

            <button
              aria-label="Sign out"
              onClick={async () => {
                await logout()
                nav('/?auth=login')
              }}
              className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
