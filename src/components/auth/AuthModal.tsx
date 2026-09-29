import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Gamepad2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Shield,
  Crown,
  Trophy,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { useAuthModal } from '@/stores/authModalStore'
import { authService } from '@/services/api/authService'
import { homeFor } from '@/app/config/roles'

const DEMO_ACCOUNTS = [
  { role: 'super_admin', label: 'Head Admin', email: 'head@rdk.com', icon: Crown, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { role: 'org_owner', label: 'Official Creator', email: 'creator@clashers.com', icon: Trophy, color: 'text-primary border-primary/30 bg-primary/10' },
  { role: 'ambassador', label: 'Ambassador', email: 'amb@x.com', icon: Shield, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { role: 'team_captain', label: 'Captain', email: 'captain@x.com', icon: Gamepad2, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { role: 'player', label: 'Audience / Gamer', email: 'player@x.com', icon: UserIcon, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
]

export function AuthModal() {
  const { isOpen, mode, setMode, close } = useAuthModal()
  const { login } = useAuth()
  const navigate = useNavigate()

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false)

  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regIgn, setRegIgn] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [regError, setRegError] = useState('')
  const [isRegSubmitting, setIsRegSubmitting] = useState(false)

  if (!isOpen) return null

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setIsLoginSubmitting(true)

    try {
      const data = await authService.login(loginEmail, loginPassword)
      login(data.user)
      close()
      navigate(homeFor(data.user.role))
    } catch (err: unknown) {
      if (err instanceof Error) setLoginError(err.message)
      else setLoginError('Login failed')
    } finally {
      setIsLoginSubmitting(false)
    }
  }

  const handleQuickDemoLogin = (email: string) => {
    setLoginEmail(email)
    setLoginPassword('password123')
    setLoginError('')
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
    setIsRegSubmitting(true)

    try {
      const data = await authService.register({
        name: regName,
        email: regEmail,
        ign: regIgn || regName,
        role: 'player',
        password: regPassword,
      })
      login(data.user)
      close()
      navigate('/player/dashboard')
    } catch (err: unknown) {
      if (err instanceof Error) setRegError(err.message)
      else setRegError('Registration failed')
    } finally {
      setIsRegSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-auto"
      >
        {/* Top Decorative Header */}
        <div className="relative p-6 pb-4 border-b border-border bg-gradient-to-b from-muted/40 to-transparent">
          <button
            onClick={close}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>

          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="RDK Esports"
              className="h-10 w-auto drop-shadow-[0_0_12px_rgba(255,180,0,0.5)]"
            />
            <div>
              <div className="font-heading font-black text-lg tracking-wider text-foreground">
                RDK ESPORTS
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                Tournament Operating System
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-muted/40 p-1 rounded-lg border border-border mt-4">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setLoginError('')
              }}
              className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-primary text-background shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register')
                setRegError('')
              }}
              className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-primary text-background shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 pt-5">
          {mode === 'login' ? (
            /* ═══ LOGIN TAB ═══ */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Email or Identifier
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="name@rdk.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Password
                  </label>
                  <span className="text-[10px] text-muted-foreground">Demo: password123</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-9 pr-9 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoginSubmitting}
                className="w-full py-2.5 rounded-lg font-heading font-black text-xs text-background bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(255,46,0,0.3)] flex items-center justify-center gap-2"
              >
                {isLoginSubmitting ? (
                  <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>SIGN IN TO PORTAL</span>
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>

              {/* 1-Click Demo Accounts Selector */}
              <div className="pt-3 border-t border-border space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block text-center">
                  Quick Demo Access (1-Click)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEMO_ACCOUNTS.map((d) => {
                    const Icon = d.icon
                    const isSelected = loginEmail === d.email
                    return (
                      <button
                        key={d.role}
                        type="button"
                        onClick={() => handleQuickDemoLogin(d.email)}
                        className={`p-2 rounded-lg border text-left transition-all flex items-center gap-2 text-[11px] ${
                          isSelected ? `${d.color} ring-1 ring-primary` : 'border-border bg-muted/20 hover:bg-muted/50 text-foreground'
                        }`}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <div className="truncate">
                          <span className="font-bold block truncate">{d.label}</span>
                          <span className="text-[9px] text-muted-foreground block truncate">{d.email}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </form>
          ) : (
            /* ═══ REGISTER TAB ═══ */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {regError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="Praveen Kumar"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    placeholder="praveen@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  In-Game Name (IGN) / Gamer Tag
                </label>
                <div className="relative">
                  <Gamepad2 className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="e.g. VIPER_OP"
                    value={regIgn}
                    onChange={(e) => setRegIgn(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Create Password (min 8 chars)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-9 pr-9 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showRegPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isRegSubmitting}
                className="w-full py-2.5 rounded-lg font-heading font-black text-xs text-background bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(255,46,0,0.3)] flex items-center justify-center gap-2"
              >
                {isRegSubmitting ? (
                  <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>CREATE FREE ACCOUNT</span>
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer toggle note */}
          <div className="mt-4 text-center text-xs text-muted-foreground">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register')
                    setRegError('')
                  }}
                  className="font-bold text-primary hover:underline"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setLoginError('')
                  }}
                  className="font-bold text-primary hover:underline"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default AuthModal
