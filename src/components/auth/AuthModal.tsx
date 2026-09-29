import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from 'framer-motion'
import {
  X, Eye, EyeOff, AlertCircle,
  Mail, Lock, User, Gamepad2,
  ArrowRight, CheckCircle2,
  LogIn, UserPlus,
} from 'lucide-react'

import { useAuth } from '@/stores/authStore'
import { useAuthModal } from '@/stores/authModalStore'
import { authService } from '@/services/api/authService'
import { homeFor } from '@/app/config/roles'

/* ── Schemas ────────────────────────────────────────────── */
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

/* ── Password strength ──────────────────────────────────── */
function strength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const colors = ['', '#E53935', '#FF8F00', '#29B6F6', '#66BB6A']
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  return { level: s, color: colors[s], label: labels[s] }
}

/* ── Input with icon ─────────────────────────────────────── */
function Field({
  icon: Icon, type = 'text', placeholder, register, error,
  showToggle, showPassword, onToggle, hint,
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
}) {
  return (
    <div className="space-y-1">
      <div className="input-icon-wrap">
        <Icon className="input-icon size-4" />
        <input
          type={showToggle ? (showPassword ? 'text' : 'password') : type}
          placeholder={placeholder}
          className="rdk-input"
          style={{ paddingRight: showToggle ? '3rem' : undefined }}
          {...(register as React.InputHTMLAttributes<HTMLInputElement>)}
          aria-invalid={!!error}
        />
        {showToggle && (
          <motion.button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            style={{ color: '#555' }}
            whileTap={{ scale: 0.85 }}
            whileHover={{ color: '#fff' }}
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
            className="text-[11px] font-body flex items-center gap-1"
            style={{ color: '#ff6b6b' }}
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

/* ── Login Panel ────────────────────────────────────────── */
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
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      <AnimatePresence>
        {serverErr && (
          <motion.div
            className="alert-box alert-danger"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <AlertCircle className="size-4 shrink-0" />{serverErr}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field
          icon={Mail}
          type="email"
          placeholder="Email address"
          register={register('email')}
          error={errors.email?.message}
        />
        <Field
          icon={Lock}
          placeholder="Password"
          register={register('password')}
          error={errors.password?.message}
          showToggle
          showPassword={showPw}
          onToggle={() => setShowPw(s => !s)}
        />

        <div className="flex justify-end">
          <button
            type="button"
            className="text-xs font-body transition-colors hover:text-white"
            style={{ color: '#E53935' }}
            onClick={() => alert('Password recovery managed by RDK Technologies.')}
          >
            Forgot password?
          </button>
        </div>

        <motion.button
          type="submit"
          disabled={isSubmitting || done}
          className="btn-primary w-full justify-center"
          whileHover={!isSubmitting ? { scale: 1.01 } : {}}
          whileTap={!isSubmitting ? { scale: 0.98 } : {}}
        >
          <AnimatePresence mode="wait">
            {done ? (
              <motion.span key="d" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CheckCircle2 className="size-4" /> Signing you in…
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

      <p className="text-center text-xs font-body" style={{ color: '#555' }}>
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold transition-colors hover:text-white cursor-pointer"
          style={{ color: '#E53935' }}
        >
          Create one now
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
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      <AnimatePresence>
        {serverErr && (
          <motion.div
            className="alert-box alert-danger"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <AlertCircle className="size-4 shrink-0" />{serverErr}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        {/* Name + IGN row */}
        <div className="grid grid-cols-2 gap-3">
          <Field icon={User} placeholder="Full name" register={register('name')} error={errors.name?.message} />
          <Field icon={Gamepad2} placeholder="IGN (in-game)" register={register('ign')} error={errors.ign?.message} />
        </div>

        <Field icon={Mail} type="email" placeholder="Email address" register={register('email')} error={errors.email?.message} />

        <Field
          icon={Lock}
          placeholder="Password (min 8 chars)"
          register={register('password')}
          error={errors.password?.message}
          showToggle
          showPassword={showPw}
          onToggle={() => setShowPw(s => !s)}
          hint={
            pw ? (
              <div className="space-y-1 mt-1">
                <div className="flex gap-1">
                  {[1,2,3,4].map(seg => (
                    <motion.div
                      key={seg}
                      className="h-0.5 flex-1 rounded-full"
                      animate={{ backgroundColor: seg <= str.level ? str.color : '#1E1E1E' }}
                      transition={{ duration: 0.25 }}
                    />
                  ))}
                </div>
                {str.label && (
                  <p className="text-[10px] font-body" style={{ color: str.color }}>
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
          className="btn-primary w-full justify-center mt-1"
          whileHover={!isSubmitting ? { scale: 1.01 } : {}}
          whileTap={!isSubmitting ? { scale: 0.98 } : {}}
        >
          <AnimatePresence mode="wait">
            {done ? (
              <motion.span key="d" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CheckCircle2 className="size-4" /> Setting up profile…
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

      <p className="text-center text-xs font-body" style={{ color: '#555' }}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold transition-colors hover:text-white cursor-pointer"
          style={{ color: '#E53935' }}
        >
          Sign in instead
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

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
          />

          {/* ── Modal ── */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="modal"
              className="relative w-full max-w-md overflow-hidden"
              style={{
                background: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '16px',
                boxShadow: '0 0 0 1px rgba(229,57,53,0.15), 0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(229,57,53,0.06)',
              }}
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Red top accent line */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, #E53935, transparent)' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              />

              {/* Subtle grid background */}
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(rgba(229,57,53,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(229,57,53,0.04) 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />

              {/* Glow orb */}
              <div
                className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse, rgba(229,57,53,0.08) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                }}
              />

              <div className="relative z-10 p-6">
                {/* ── Header ── */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="RDK Esports" className="h-9 w-auto logo-glow" />
                    <div>
                      <p className="font-display text-sm tracking-[0.15em] text-white">
                        RDK ESPORTS
                      </p>
                      <p className="text-[9px] font-body tracking-widest mt-0.5"
                        style={{ color: '#444' }}>
                        TOURNAMENT OPERATING SYSTEM
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={close}
                    className="p-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{ color: '#555', background: '#1A1A1A' }}
                    whileHover={{ background: '#222', color: '#fff' }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </motion.button>
                </div>

                {/* ── Tab switcher ── */}
                <div
                  className="flex items-center mb-6 relative"
                  style={{
                    background: '#0D0D0D',
                    border: '1px solid #1E1E1E',
                    borderRadius: '10px',
                    padding: '3px',
                  }}
                >
                  {/* Sliding indicator */}
                  <motion.div
                    className="absolute top-[3px] bottom-[3px] rounded-lg"
                    style={{ background: '#E53935', width: 'calc(50% - 3px)' }}
                    animate={{ x: mode === 'login' ? 3 : 'calc(100% + 3px)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-body font-semibold transition-colors cursor-pointer"
                    style={{ color: mode === 'login' ? '#ffffff' : '#555' }}
                  >
                    <LogIn className="size-3.5" />
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-body font-semibold transition-colors cursor-pointer"
                    style={{ color: mode === 'register' ? '#ffffff' : '#555' }}
                  >
                    <UserPlus className="size-3.5" />
                    Create Account
                  </button>
                </div>

                {/* ── Panel ── */}
                <AnimatePresence mode="wait">
                  {mode === 'login' ? (
                    <LoginPanel key="login" onSwitch={() => setMode('register')} />
                  ) : (
                    <RegisterPanel key="register" onSwitch={() => setMode('login')} />
                  )}
                </AnimatePresence>


              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export default AuthModal
