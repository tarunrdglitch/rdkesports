import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Eye, EyeOff, AlertCircle,
  Mail, Lock, User, Gamepad2,
  ArrowRight, CheckCircle2,
  Shield, Zap, Trophy, Star,
} from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { useAuthModal } from '@/stores/authModalStore'
import { authService } from '@/services/api/authService'
import { homeFor } from '@/app/config/roles'

/* ── Schemas ─────────────────────────────────────────────── */
const loginSchema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
})
const registerSchema = z.object({
  name:     z.string().min(2, 'At least 2 characters'),
  ign:      z.string().min(2, 'At least 2 characters'),
  email:    z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Add an uppercase letter')
    .regex(/\d/, 'Add a number'),
})
type LoginForm    = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

/* ── Password strength ───────────────────────────────────── */
function strength(pw: string) {
  let s = 0
  if (pw.length >= 8)            s++
  if (/[A-Z]/.test(pw))         s++
  if (/\d/.test(pw))            s++
  if (/[^A-Za-z0-9]/.test(pw))  s++
  const colors = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981']
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  return { level: s, color: colors[s], label: labels[s] }
}

/* ── Field Component ──────────────────────────────────────── */
function Field({
  icon: Icon,
  type = 'text',
  placeholder,
  register,
  error,
  showToggle,
  showPassword,
  onToggle,
  hint,
  label,
}: {
  icon: React.ElementType
  type?: string
  placeholder: string
  register: object
  error?: string
  showToggle?: boolean
  showPassword?: boolean
  onToggle?: () => void
  hint?: React.ReactNode
  label?: string
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider font-body"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        {/* Icon left */}
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          <Icon className="size-4" />
        </div>
        <input
          type={showToggle ? (showPassword ? 'text' : 'password') : type}
          placeholder={placeholder}
          className="w-full rounded-xl pl-10 pr-10 py-3 text-sm font-body text-white outline-none transition-all duration-200 placeholder:text-white/25"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: error ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.08)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = error
              ? '1px solid rgba(239,68,68,0.7)'
              : '1px solid rgba(245,26,26,0.5)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
            e.currentTarget.style.boxShadow = error
              ? '0 0 0 3px rgba(239,68,68,0.08)'
              : '0 0 0 3px rgba(245,26,26,0.08)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = error ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.08)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          aria-invalid={!!error}
          {...(register as React.InputHTMLAttributes<HTMLInputElement>)}
        />
        {showToggle && (
          <motion.button
            type="button"
            onClick={onToggle}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            whileTap={{ scale: 0.85 }}
            whileHover={{ color: 'rgba(255,255,255,0.8)' }}
            aria-label="Toggle password"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </motion.button>
        )}
      </div>
      {hint}
      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            className="text-[11px] font-body flex items-center gap-1.5"
            style={{ color: '#EF4444' }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle className="size-3 shrink-0" />{error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Login Panel ─────────────────────────────────────────── */
function LoginPanel({ onSwitch }: { onSwitch: () => void }) {
  const [showPw, setShowPw] = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [done, setDone] = useState(false)
  const { login } = useAuth()
  const { close } = useAuthModal()
  const nav = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setServerErr('')
    try {
      const res = await authService.login(data.email, data.password)
      setDone(true)
      setTimeout(() => { close(); login(res.user); nav(homeFor(res.user.role)) }, 600)
    } catch (e: unknown) {
      setServerErr(e instanceof Error ? e.message : 'Login failed')
    }
  }

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      {/* Title */}
      <div className="mb-1">
        <h2 className="font-heading text-2xl font-bold text-white">Welcome back</h2>
        <p className="text-xs font-body mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Sign in to access your tournament dashboard
        </p>
      </div>

      <AnimatePresence>
        {serverErr && (
          <motion.div
            className="flex items-center gap-2.5 rounded-xl p-3 text-xs font-body"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <AlertCircle className="size-4 shrink-0 text-red-400" />{serverErr}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field
          icon={Mail}
          type="email"
          placeholder="your@email.com"
          label="Email"
          register={register('email')}
          error={errors.email?.message}
        />
        <Field
          icon={Lock}
          placeholder="Min. 8 characters"
          label="Password"
          register={register('password')}
          error={errors.password?.message}
          showToggle
          showPassword={showPw}
          onToggle={() => setShowPw(s => !s)}
        />

        <div className="flex justify-end -mt-1">
          <button
            type="button"
            className="text-xs font-body font-semibold transition-colors cursor-pointer"
            style={{ color: 'rgba(245,26,26,0.85)' }}
            onClick={() => alert('Password recovery managed by RDK Technologies.')}
          >
            Forgot password?
          </button>
        </div>

        <motion.button
          type="submit"
          disabled={isSubmitting || done}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold font-body transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: done
              ? 'linear-gradient(135deg, #10B981, #059669)'
              : 'linear-gradient(135deg, #F51A1A, #C62828)',
            boxShadow: done
              ? '0 0 24px rgba(16,185,129,0.35)'
              : '0 0 24px rgba(245,26,26,0.35), 0 4px 16px rgba(0,0,0,0.4)',
            color: '#fff',
          }}
          whileHover={!isSubmitting ? { scale: 1.01, boxShadow: '0 0 32px rgba(245,26,26,0.5)' } : {}}
          whileTap={!isSubmitting ? { scale: 0.98 } : {}}
        >
          <AnimatePresence mode="wait">
            {done ? (
              <motion.span key="d" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CheckCircle2 className="size-4" /> Signed in!
              </motion.span>
            ) : isSubmitting ? (
              <motion.span key="l" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Verifying…
              </motion.span>
            ) : (
              <motion.span key="i" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Sign In <ArrowRight className="size-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </form>

      <p className="text-center text-xs font-body" style={{ color: 'rgba(255,255,255,0.35)' }}>
        New to RDK Esports?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="font-bold transition-colors hover:text-white cursor-pointer"
          style={{ color: '#F51A1A' }}
        >
          Create an account →
        </button>
      </p>
    </motion.div>
  )
}

/* ── Register Panel ──────────────────────────────────────── */
function RegisterPanel({ onSwitch }: { onSwitch: () => void }) {
  const [showPw, setShowPw] = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [done, setDone] = useState(false)
  const { login } = useAuth()
  const { close } = useAuthModal()
  const nav = useNavigate()

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const pw = watch('password') || ''
  const str = strength(pw)

  const onSubmit = async (data: RegisterForm) => {
    setServerErr('')
    try {
      const res = await authService.register({ ...data, role: 'player' })
      setDone(true)
      setTimeout(() => { close(); login(res.user); nav(homeFor(res.user.role)) }, 700)
    } catch (e: unknown) {
      setServerErr(e instanceof Error ? e.message : 'Registration failed')
    }
  }

  return (
    <motion.div
      key="register"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      {/* Title */}
      <div className="mb-1">
        <h2 className="font-heading text-2xl font-bold text-white">Join the Arena</h2>
        <p className="text-xs font-body mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Create your free player account in seconds
        </p>
      </div>

      <AnimatePresence>
        {serverErr && (
          <motion.div
            className="flex items-center gap-2.5 rounded-xl p-3 text-xs font-body"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <AlertCircle className="size-4 shrink-0 text-red-400" />{serverErr}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
        {/* Name + IGN */}
        <div className="grid grid-cols-2 gap-3">
          <Field icon={User} placeholder="Full name" label="Name" register={register('name')} error={errors.name?.message} />
          <Field icon={Gamepad2} placeholder="IGN / Tag" label="In-Game Name" register={register('ign')} error={errors.ign?.message} />
        </div>

        <Field
          icon={Mail}
          type="email"
          placeholder="your@email.com"
          label="Email"
          register={register('email')}
          error={errors.email?.message}
        />

        <Field
          icon={Lock}
          placeholder="Min. 8 chars + uppercase + number"
          label="Password"
          register={register('password')}
          error={errors.password?.message}
          showToggle
          showPassword={showPw}
          onToggle={() => setShowPw(s => !s)}
          hint={
            pw ? (
              <div className="space-y-1 mt-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(seg => (
                    <motion.div
                      key={seg}
                      className="h-1 flex-1 rounded-full"
                      animate={{ backgroundColor: seg <= str.level ? str.color : 'rgba(255,255,255,0.06)' }}
                      transition={{ duration: 0.2 }}
                    />
                  ))}
                </div>
                {str.label && (
                  <p className="text-[10px] font-body font-semibold" style={{ color: str.color }}>
                    {str.label} password
                  </p>
                )}
              </div>
            ) : null
          }
        />

        <motion.button
          type="submit"
          disabled={isSubmitting || done}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold font-body transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: done
              ? 'linear-gradient(135deg, #10B981, #059669)'
              : 'linear-gradient(135deg, #F51A1A, #C62828)',
            boxShadow: done
              ? '0 0 24px rgba(16,185,129,0.35)'
              : '0 0 24px rgba(245,26,26,0.35), 0 4px 16px rgba(0,0,0,0.4)',
            color: '#fff',
          }}
          whileHover={!isSubmitting ? { scale: 1.01, boxShadow: '0 0 32px rgba(245,26,26,0.5)' } : {}}
          whileTap={!isSubmitting ? { scale: 0.98 } : {}}
        >
          <AnimatePresence mode="wait">
            {done ? (
              <motion.span key="d" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CheckCircle2 className="size-4" /> Account created!
              </motion.span>
            ) : isSubmitting ? (
              <motion.span key="l" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Creating account…
              </motion.span>
            ) : (
              <motion.span key="i" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Create Free Account <ArrowRight className="size-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </form>

      {/* Benefits row */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { icon: Trophy, label: 'Join Tournaments' },
          { icon: Zap, label: 'Track Progress' },
          { icon: Star, label: 'Win Prizes' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 py-2 rounded-xl text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Icon className="size-3.5" style={{ color: 'rgba(245,26,26,0.8)' }} />
            <span className="text-[9px] font-body font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
          </div>
        ))}
      </div>

      <p className="text-center text-xs font-body" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="font-bold transition-colors hover:text-white cursor-pointer"
          style={{ color: '#F51A1A' }}
        >
          Sign in instead →
        </button>
      </p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Main AuthModal
═══════════════════════════════════════════════════════════ */
export function AuthModal() {
  const { isOpen, mode, setMode, close } = useAuthModal()

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px) saturate(1.4)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={close}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="modal"
              className="relative w-full max-w-[440px] overflow-hidden rounded-2xl"
              style={{
                background: 'linear-gradient(160deg, #0E0C10 0%, #0A080D 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 0 0 1px rgba(245,26,26,0.1), 0 32px 100px rgba(0,0,0,0.85), 0 0 80px rgba(245,26,26,0.05)',
              }}
              initial={{ opacity: 0, scale: 0.94, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 28 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top red line */}
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(245,26,26,0.8) 50%, transparent 100%)' }} />

              {/* Background grid */}
              <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(rgba(245,26,26,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,26,26,0.03) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }} />

              {/* Glow orb top */}
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-60 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse, rgba(245,26,26,0.09) 0%, transparent 70%)' }} />

              <div className="relative z-10 p-7">

                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-7">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src="/logo.png" alt="RDK Esports" className="h-10 w-auto logo-glow" />
                    </div>
                    <div>
                      <p className="font-display text-sm tracking-[0.18em] text-white leading-tight">
                        RDK ESPORTS
                      </p>
                      <p className="text-[9px] font-body tracking-[0.12em] uppercase mt-0.5"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>
                        Tournament OS · Powered by RDK Technologies
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={close}
                    className="size-8 flex items-center justify-center rounded-xl cursor-pointer transition-colors"
                    style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
                    whileHover={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </motion.button>
                </div>

                {/* ── Tab Switcher ── */}
                <div className="relative mb-7 rounded-xl p-1 flex"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* Sliding pill */}
                  <motion.div
                    className="absolute top-1 bottom-1 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, #F51A1A, #C62828)',
                      boxShadow: '0 0 16px rgba(245,26,26,0.4)',
                      width: 'calc(50% - 4px)',
                    }}
                    animate={{ x: mode === 'login' ? 4 : 'calc(100% + 4px)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                  {[
                    { id: 'login', icon: Shield, label: 'Sign In' },
                    { id: 'register', icon: Zap, label: 'Create Account' },
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMode(id as 'login' | 'register')}
                      className="relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-body font-bold transition-colors cursor-pointer"
                      style={{ color: mode === id ? '#ffffff' : 'rgba(255,255,255,0.35)' }}
                    >
                      <Icon className="size-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* ── Panel ── */}
                <AnimatePresence mode="wait">
                  {mode === 'login' ? (
                    <LoginPanel key="login" onSwitch={() => setMode('register')} />
                  ) : (
                    <RegisterPanel key="register" onSwitch={() => setMode('login')} />
                  )}
                </AnimatePresence>

                {/* ── Security footnote ── */}
                <div className="mt-6 pt-5 flex items-center justify-center gap-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <Shield className="size-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <span className="text-[10px] font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Secured by RDK Technologies · Data encrypted in transit
                  </span>
                </div>

              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export default AuthModal
