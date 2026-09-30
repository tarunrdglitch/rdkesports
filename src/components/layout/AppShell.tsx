import { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogOut, ExternalLink, ChevronRight, Shield } from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { adminNav, creatorNav, ambassadorNav, playerNav, NavItem } from '@/app/config/roles'
import { cn } from '@/utils/cn'

const sidebarVariants = {
  hidden: { x: -260, opacity: 0 },
  show: {
    x: 0, opacity: 1,
    transition: { type: 'spring', damping: 28, stiffness: 300 },
  },
  exit: {
    x: -260, opacity: 0,
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
    if (
      user.role === 'official_partner' ||
      user.role === 'creator' ||
      user.role === 'org_owner'
    ) {
      return creatorNav
    }
    if (user.role === 'ambassador') return ambassadorNav
    return playerNav
  }

  const items = getNavItems()

  const getRoleLabel = () => {
    if (isOwner) return 'Super Admin (RDK)'
    switch (user?.role) {
      case 'super_admin':
        return 'Super Admin (RDK)'
      case 'official_partner':
      case 'creator':
      case 'org_owner':
        return 'Official Partner'
      case 'ambassador':
        return 'Tournament Ambassador'
      case 'normal_user':
      case 'player':
      default:
        return 'Normal User'
    }
  }

  const getRoleBadgeColor = () => {
    if (isOwner) return '#E53935'
    switch (user?.role) {
      case 'official_partner':
      case 'creator':
      case 'org_owner':
        return '#E53935'
      case 'ambassador':
        return '#FF8F00'
      default:
        return '#22c55e'
    }
  }

  const avatarLetter = displayName?.[0]?.toUpperCase() || 'R'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid #1A1A1A' }}>
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/logo.png"
            alt="RDK Esports"
            className="h-10 w-auto logo-glow transition-transform duration-300 group-hover:scale-105"
          />
          <div className="flex flex-col leading-none">
            <span className="font-display text-sm tracking-[0.15em] text-white">
              RDK ESPORTS
            </span>
            <span className="text-[9px] tracking-[0.1em] mt-0.5 font-body uppercase"
              style={{ color: '#444' }}>
              Tournament OS
            </span>
          </div>
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav
        aria-label="Primary Navigation"
        className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto"
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn('nav-item group cursor-pointer', isActive && 'active')
            }
          >
            {({ isActive }) => (
              <>
                <span className="flex-1 truncate text-xs">{item.label}</span>
                {item.badge && (
                  <span className="badge-red text-[9px] px-1.5 py-0.5">{item.badge}</span>
                )}
                {isActive && (
                  <ChevronRight className="size-3 shrink-0 ml-1" style={{ color: '#E53935' }} />
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="rdk-divider my-3" />

        <Link
          to="/"
          className="nav-item group cursor-pointer"
          onClick={() => setOpen(false)}
        >
          <ExternalLink className="size-3.5 transition-colors"
            style={{ color: '#444' }} />
          <span className="flex-1 text-xs">Public Tournament Hub</span>
        </Link>
      </nav>

      {/* ── User Footer ── */}
      <div className="p-3" style={{ borderTop: '1px solid #1A1A1A' }}>
        <motion.div
          className="flex items-center gap-3 p-2.5 rounded-xl"
          style={{ background: '#111', border: '1px solid #1E1E1E' }}
          whileHover={{ borderColor: 'rgba(229,57,53,0.3)' }}
          transition={{ duration: 0.2 }}
        >
          {/* Avatar */}
          <div
            className="size-9 rounded-lg flex items-center justify-center text-white font-display text-sm shrink-0"
            style={{
              background: 'linear-gradient(135deg, #E53935, #C62828)',
              boxShadow: '0 0 10px rgba(229,57,53,0.3)',
            }}
          >
            {avatarLetter}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate font-body">{displayName}</p>
            <div
              className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-body"
              style={{ color: getRoleBadgeColor() }}
            >
              <Shield className="size-2.5" />
              {getRoleLabel()}
            </div>
          </div>
        </motion.div>
        <p className="text-[9px] text-center mt-2 tracking-wider font-body uppercase" style={{ color: '#2A2A2A' }}>
          Powered by RDK Technologies
        </p>
      </div>
    </div>
  )

  return (
    <div
      className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      {/* ─── Desktop Sidebar ─── */}
      <aside
        className="hidden lg:flex lg:flex-col relative overflow-hidden"
        style={{ backgroundColor: '#0D0D0D', borderRight: '1px solid #1A1A1A' }}
      >
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        {/* Red glow at top */}
        <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top, rgba(229,57,53,0.06) 0%, transparent 70%)' }}
        />
        <div className="relative z-10 flex flex-col h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* ─── Mobile Drawer ─── */}
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
              style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              key="drawer"
              variants={sidebarVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col lg:hidden overflow-hidden"
              style={{ backgroundColor: '#0D0D0D', borderRight: '1px solid #1A1A1A' }}
            >
              <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full">
                {/* Close */}
                <div className="absolute top-4 right-4 z-20">
                  <motion.button
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="p-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{ background: '#1A1A1A' }}
                    whileHover={{ background: '#222' }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="size-4" style={{ color: '#666' }} />
                  </motion.button>
                </div>
                <SidebarContent />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── Main ─── */}
      <div className="min-w-0 flex flex-col">
        {/* ── Header ── */}
        <header
          className="flex h-14 items-center justify-between px-4 lg:px-6 sticky top-0 z-30"
          style={{
            backgroundColor: 'rgba(10,10,10,0.9)',
            backdropFilter: 'blur(20px) saturate(1.5)',
            borderBottom: '1px solid #1A1A1A',
          }}
        >
          {/* Mobile toggle */}
          <motion.button
            className="lg:hidden p-2 rounded-lg cursor-pointer"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait">
              {open ? (
                <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X className="size-5 text-white" />
                </motion.div>
              ) : (
                <motion.div key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Menu className="size-5 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Breadcrumb */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-body tracking-wider"
            style={{ color: '#444' }}>
            <span style={{ color: '#E53935' }} className="font-semibold">RDK</span>
            <ChevronRight className="size-3" />
            <span className="capitalize" style={{ color: '#666' }}>{getRoleLabel()}</span>
          </div>

          {/* Right */}
          <div className="ml-auto flex items-center gap-3">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-body"
              style={{ color: '#444' }}>
              <span className="live-dot" />
              <span style={{ color: '#555' }}>System Online</span>
            </div>

            {/* User chip */}
            <div
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background: '#111', border: '1px solid #1E1E1E' }}
            >
              <div
                className="size-6 rounded flex items-center justify-center text-white text-[10px] font-display"
                style={{ background: 'linear-gradient(135deg, #E53935, #C62828)' }}
              >
                {avatarLetter}
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-white font-body leading-none">
                  {displayName}
                </span>
                <span className="text-[9px] font-body" style={{ color: '#E53935' }}>
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
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </motion.button>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="p-4 lg:p-6 flex-1 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
