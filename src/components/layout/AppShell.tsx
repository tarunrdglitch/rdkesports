import { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  LogOut,
  ExternalLink,
  ChevronRight,
  Shield,
  Bell,
  Activity,
} from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { adminNav, creatorNav, ambassadorNav, playerNav, NavItem } from '@/app/config/roles'
import { cn } from '@/utils/cn'

const sidebarVariants = {
  hidden: { x: -268, opacity: 0 },
  show: {
    x: 0, opacity: 1,
    transition: { type: 'spring', damping: 28, stiffness: 300 },
  },
  exit: {
    x: -268, opacity: 0,
    transition: { duration: 0.22, ease: 'easeIn' },
  },
}

export const AppShell = () => {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)

  const isOwner =
    user?.role === 'super_admin' ||
    user?.email?.toLowerCase() === 'auraxtremezofficial@gmail.com'
  const displayName = isOwner ? 'Tarun (RDK)' : (user?.name || 'User')

  const getNavItems = (): NavItem[] => {
    if (!user) return []
    if (isOwner) return adminNav
    if (user.role === 'official_partner' || user.role === 'creator' || user.role === 'org_owner') return creatorNav
    if (user.role === 'ambassador') return ambassadorNav
    return playerNav
  }

  const items = getNavItems()

  const getRoleLabel = () => {
    if (isOwner) return 'Super Admin'
    switch (user?.role) {
      case 'super_admin':     return 'Super Admin'
      case 'official_partner':
      case 'creator':
      case 'org_owner':       return 'Official Partner'
      case 'ambassador':      return 'Ambassador'
      default:                return 'Player'
    }
  }

  const getRoleColor = () => {
    if (isOwner) return { text: 'text-primary', bg: 'bg-primary/12', border: 'border-primary/25' }
    switch (user?.role) {
      case 'official_partner':
      case 'creator':
      case 'org_owner':  return { text: 'text-primary', bg: 'bg-primary/12', border: 'border-primary/25' }
      case 'ambassador': return { text: 'text-amber-400', bg: 'bg-amber-500/12', border: 'border-amber-500/25' }
      default:           return { text: 'text-emerald-400', bg: 'bg-emerald-500/12', border: 'border-emerald-500/25' }
    }
  }

  const roleColor = getRoleColor()
  const avatarLetter = displayName?.[0]?.toUpperCase() || 'R'

  // Group nav items by section
  const navGroups = [
    { label: 'Main', items: items.slice(0, Math.ceil(items.length / 2)) },
    { label: 'Management', items: items.slice(Math.ceil(items.length / 2)) },
  ].filter((g) => g.items.length > 0)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className="px-4 pt-5 pb-4 relative overflow-hidden"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Subtle glow behind logo */}
        <div
          className="absolute -top-4 -left-4 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,26,26,0.08) 0%, transparent 70%)' }}
        />
        <Link to="/" className="relative flex items-center gap-3 group">
          <img
            src="/logo.png"
            alt="RDK Esports"
            className="h-9 w-auto logo-glow transition-transform duration-300 group-hover:scale-105"
          />
          <div className="flex flex-col leading-none">
            <span className="font-display text-sm tracking-[0.18em] text-white">RDK ESPORTS</span>
            <span className="text-[9px] tracking-[0.1em] mt-0.5 font-body uppercase text-muted-foreground">
              Tournament OS
            </span>
          </div>
        </Link>
      </div>

      {/* User chip (compact) */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <motion.div
          className="flex items-center gap-3 p-2.5 rounded-xl cursor-default"
          style={{
            background: 'linear-gradient(135deg, rgba(245,26,26,0.06), rgba(255,170,0,0.03))',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          whileHover={{ borderColor: 'rgba(245,26,26,0.2)' }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="size-8 rounded-lg flex items-center justify-center text-white font-display text-sm shrink-0 font-bold"
            style={{
              background: 'linear-gradient(135deg, #F51A1A, #C62828)',
              boxShadow: '0 0 12px rgba(245,26,26,0.35)',
            }}
          >
            {avatarLetter}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate font-body leading-tight">
              {displayName}
            </p>
            <div className={`inline-flex items-center gap-1 mt-0.5 text-[9px] font-body font-bold px-1.5 py-0.5 rounded-full ${roleColor.text} ${roleColor.bg} border ${roleColor.border}`}>
              <Shield className="size-2.5" />
              {getRoleLabel()}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Nav */}
      <nav aria-label="Primary Navigation" className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) => cn('nav-item group cursor-pointer', isActive && 'active')}
          >
            {({ isActive }) => (
              <>
                <span className="flex-1 truncate text-xs font-body">{item.label}</span>
                {item.badge && (
                  <span className="badge-red text-[9px] px-1.5 py-0.5">{item.badge}</span>
                )}
                {isActive && (
                  <ChevronRight className="size-3 shrink-0 ml-1 text-primary" />
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="rdk-divider-glow my-3" />

        <Link
          to="/"
          className="nav-item group cursor-pointer"
          onClick={() => setOpen(false)}
        >
          <ExternalLink className="size-3.5 text-muted-foreground/60" />
          <span className="flex-1 text-xs font-body">Public Tournament Hub</span>
        </Link>
      </nav>

      {/* Bottom watermark */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="text-[9px] text-center tracking-widest font-body uppercase text-border-glow">
          Powered by RDK Technologies
        </p>
      </div>
    </div>
  )

  return (
    <div
      className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]"
      style={{ backgroundColor: 'hsl(10 8% 4%)' }}
    >
      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden lg:flex lg:flex-col relative overflow-hidden"
        style={{
          backgroundColor: 'hsl(240 6% 6%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
        <div
          className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top, rgba(245,26,26,0.05) 0%, transparent 70%)' }}
        />
        <div className="relative z-10 flex flex-col h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              key="drawer"
              variants={sidebarVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col lg:hidden overflow-hidden pt-safe pb-safe"
              style={{
                backgroundColor: 'hsl(240 6% 6%)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full">
                {/* Close button */}
                <div className="absolute top-4 right-4 z-20">
                  <motion.button
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="p-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                    whileHover={{ background: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="size-4 text-muted-foreground" />
                  </motion.button>
                </div>
                <SidebarContent />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content Area ── */}
      <div className="min-w-0 flex flex-col">

        {/* Top Header */}
        <header
          className="flex min-h-14 items-center justify-between px-4 lg:px-6 sticky top-0 z-30 pt-safe"
          style={{
            backgroundColor: 'rgba(8,7,10,0.92)',
            backdropFilter: 'blur(24px) saturate(1.6)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Mobile hamburger */}
          <motion.button
            className="lg:hidden p-2 rounded-lg cursor-pointer"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
            whileTap={{ scale: 0.9 }}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <AnimatePresence mode="wait">
              {open ? (
                <motion.div
                  key="x"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="size-4 text-foreground" />
                </motion.div>
              ) : (
                <motion.div
                  key="m"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="size-4 text-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Breadcrumb (desktop) */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-body tracking-wider text-muted-foreground/60">
            <span className="text-primary font-bold text-xs">RDK</span>
            <ChevronRight className="size-3" />
            <span className="capitalize text-muted-foreground">{getRoleLabel()}</span>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">

            {/* System status indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-body">
              <Activity className="size-3 text-emerald-400" />
              <span className="text-muted-foreground/60">System Online</span>
            </div>

            {/* Notification bell placeholder */}
            <motion.button
              className="hidden sm:flex size-8 items-center justify-center rounded-lg cursor-pointer text-muted-foreground/60 hover:text-foreground transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              whileHover={{ borderColor: 'rgba(245,26,26,0.25)' }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="size-3.5" />
            </motion.button>

            {/* User chip */}
            <div
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="size-6 rounded-md flex items-center justify-center text-white text-[10px] font-display font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #F51A1A, #C62828)' }}
              >
                {avatarLetter}
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-white font-body leading-tight">
                  {displayName}
                </span>
                <span className={`text-[9px] font-bold font-body ${getRoleColor().text}`}>
                  {getRoleLabel()}
                </span>
              </div>
            </div>

            {/* Sign out */}
            <motion.button
              aria-label="Sign out"
              onClick={async () => {
                await logout()
                nav('/?auth=login')
              }}
              className="btn-ghost text-xs gap-1.5 px-2.5 py-1.5 cursor-pointer"
              title="Sign Out"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </motion.button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6 flex-1 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
