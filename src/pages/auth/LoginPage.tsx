import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  motion,
  AnimatePresence,
} from 'framer-motion'
import {
  Eye, EyeOff, AlertCircle, Mail, Lock, ArrowRight,
  ShieldCheck, Zap, Trophy, Users, ChevronRight,
  User, Gamepad2, CheckCircle2, Crown, X,
} from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { authService } from '@/services/api/authService'
import { homeFor } from '@/app/config/roles'

/* ── Login Schema ───────────────────────────────────────── */
const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
  remember: z.boolean().optional(),
})
type LoginValues = z.infer<typeof loginSchema>

/* ── Register Schema ────────────────────────────────────── */
const registerSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  ign:      z.string().min(2, 'IGN must be at least 2 characters'),
  email:    z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .regex(/[A-Z]/, 'Add an uppercase letter')
    .regex(/\d/, 'Add a number'),
  terms: z.boolean().refine((v) => v, 'You must accept the terms'),
})
type RegisterValues = z.infer<typeof registerSchema>

/* ── Password strength ──────────────────────────────────── */
function getStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const levels = [
    { level: 0, label: '', color: '' },
    { level: 1, label: 'Weak',   color: '#E53935' },
    { level: 2, label: 'Fair',   color: '#FF8F00' },
    { level: 3, label: 'Good',   color: '#29B6F6' },
    { level: 4, label: 'Strong', color: '#66BB6A' },
  ]
  return levels[score]
}

/* ── Motion Variants ────────────────────────────────────── */
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 22, filter: 'blur(4px)' },
  show:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}
const slideLeft = {
  hidden: { opacity: 0, x: -50 },
  show:   { opacity: 1, x: 0,  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}
const slideRight = {
  hidden: { opacity: 0, x: 50 },
  show:   { opacity: 1, x: 0,  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

/* Modal animation variants */
const backdropVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.25 } },
  exit:   { opacity: 0, transition: { duration: 0.2 } },
}
const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 30, filter: 'blur(8px)' },
  show:   { opacity: 1, scale: 1,    y: 0,  filter: 'blur(0px)', transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit:   { opacity: 0, scale: 0.94, y: 20, filter: 'blur(4px)', transition: { duration: 0.25 } },
}

/* ── Feature List ───────────────────────────────────────── */
const features = [
  { icon: Trophy, label: 'IPL-style Player Auctions',  color: '#E53935' },
  { icon: Zap,    label: 'Live Tournament Tracking',   color: '#ffffff' },
  { icon: Users,  label: '12K+ Competitive Community', color: '#E53935' },
  { icon: ShieldCheck, label: 'Verified Creator Partners', color: '#ffffff' },
]

const benefits = [
  { icon: Trophy,       text: 'Join 200+ active tournaments',   color: '#E53935' },
  { icon: Crown,        text: 'Compete across Free Fire & BGMI', color: '#ffffff' },
  { icon: Gamepad2,     text: 'IPL auction draft system',        color: '#E53935' },
  { icon: CheckCircle2, text: 'Real-time bracket tracking',      color: '#ffffff' },
  { icon: Zap,          text: '₹8.75L+ in prizes distributed',  color: '#E53935' },
  { icon: ShieldCheck,  text: 'Verified creator-hosted events',  color: '#ffffff' },
]

/* ── Floating Particle ──────────────────────────────────── */
function Particle({ delay, x, duration }: { delay: number; x: number; duration: number }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: Math.random() * 3 + 1,
        height: Math.random() * 3 + 1,
        left: `${x}%`,
        bottom: '-10px',
        background: Math.random() > 0.5 ? '#E53935' : 'rgba(255,255,255,0.4)',
      }}
      animate={{
        y: [0, -(Math.random() * 200 + 100)],
        opacity: [0, 0.8, 0],
        scale: [0, 1, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  )
}

/* ── Animated Background Grid ───────────────────────────── */
function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-grid-pattern animate-grid-pulse opacity-60" />
      <div className="scan-line" style={{ top: '0%', animationDelay: '0s' }} />
      <div className="scan-line" style={{ top: '0%', animationDelay: '2s' }} />
      {Array.from({ length: 20 }).map((_, i) => (
        <Particle
          key={i}
          delay={i * 0.4}
          x={Math.random() * 100}
          duration={Math.random() * 4 + 3}
        />
      ))}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px]"
        style={{
          background: 'radial-gradient(ellipse, rgba(229,57,53,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
    </div>
  )
}



/* ═══ Register Modal ════════════════════════════════════════ */
function RegisterModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [showPw, setShowPw] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const { login } = useAuth()
  const nav = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', ign: '', email: '', password: '', terms: false },
  })

  const pwValue    = watch('password')
  const strength   = getStrength(pwValue)
  const nameFilled  = watch('name')
  const ignFilled   = watch('ign')
  const emailFilled = watch('email')

  const onSubmit = async (data: RegisterValues) => {
    setServerError('')
    try {
      const response = await authService.register({
        name: data.name,
        ign: data.ign,
        email: data.email,
        password: data.password,
        role: 'player',
      })
      setIsSuccess(true)
      setTimeout(() => {
        login(response.user)
        nav(homeFor(response.user.role))
        onSuccess()
      }, 700)
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    }
  }

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      variants={backdropVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 cursor-pointer"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      {/* Modal Panel */}
      <motion.div
        className="relative w-full max-w-lg z-10 rounded-2xl overflow-hidden"
        variants={modalVariants}
        style={{
          background: '#0D0D0D',
          border: '1px solid #1E1E1E',
          boxShadow: '0 0 60px rgba(229,57,53,0.1), 0 40px 80px rgba(0,0,0,0.9)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Top accent line */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #E53935, transparent)' }} />

        {/* Ambient glow top-right */}
        <div
          className="absolute top-0 right-0 w-60 h-60 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(229,57,53,0.08) 0%, transparent 60%)' }}
        />

        <div className="relative z-10 p-6 sm:p-8">
          {/* Close button */}
          <motion.button
            onClick={onClose}
            className="absolute top-5 right-5 size-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            style={{ background: '#1A1A1A', color: '#666' }}
            whileHover={{ background: '#2A2A2A', color: '#ffffff' }}
            whileTap={{ scale: 0.9 }}
            aria-label="Close"
          >
            <X className="size-4" />
          </motion.button>

          {/* Header */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="badge-red inline-flex mb-3 text-[10px]">
              <Zap className="size-3" />
              Free to Join
            </div>
            <h2 className="font-display text-2xl text-white tracking-wide">Create account.</h2>
            <p className="mt-1.5 text-sm font-body" style={{ color: '#666' }}>
              Compete, win, and claim your spot on the leaderboard.
            </p>
            <div className="red-line mt-3" />
          </motion.div>

          {/* Server error */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                className="alert-box alert-danger mb-5"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Name + IGN */}
            <motion.div
              className="grid grid-cols-2 gap-3"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <div className="space-y-1.5">
                <label className="rdk-label">Full Name</label>
                <div className="input-icon-wrap">
                  <User className="input-icon size-4" />
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="John Doe"
                    className="rdk-input"
                    {...register('name')}
                    aria-invalid={!!errors.name}
                  />
                </div>
                <AnimatePresence>
                  {errors.name && (
                    <motion.span
                      role="alert"
                      className="block text-[11px] font-body"
                      style={{ color: '#ff6b6b' }}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {errors.name.message}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="space-y-1.5">
                <label className="rdk-label">
                  <span>IGN</span>
                  <span className="ml-1 normal-case font-body text-[10px]" style={{ color: '#555' }}>(in-game)</span>
                </label>
                <div className="input-icon-wrap">
                  <Gamepad2 className="input-icon size-4" />
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="DragonSlayer"
                    className="rdk-input"
                    {...register('ign')}
                    aria-invalid={!!errors.ign}
                  />
                </div>
                <AnimatePresence>
                  {errors.ign && (
                    <motion.span
                      role="alert"
                      className="block text-[11px] font-body"
                      style={{ color: '#ff6b6b' }}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {errors.ign.message}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Email */}
            <motion.div
              className="space-y-1.5"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <label className="rdk-label">Email Address</label>
              <div className="input-icon-wrap">
                <Mail className="input-icon size-4" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="name@organization.com"
                  className="rdk-input"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                />
              </div>
              <AnimatePresence>
                {errors.email && (
                  <motion.span role="alert" className="block text-[11px] font-body" style={{ color: '#ff6b6b' }}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {errors.email.message}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Password + strength */}
            <motion.div
              className="space-y-1.5"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <label className="rdk-label">Password</label>
              <div className="input-icon-wrap">
                <Lock className="input-icon size-4" />
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 chars, A-Z, 0-9"
                  className="rdk-input pr-12"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                  style={{ color: '#555' }}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ color: '#ffffff' }}
                  aria-label="Toggle password"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </motion.button>
              </div>
              <AnimatePresence>
                {pwValue && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((seg) => (
                        <motion.div
                          key={seg}
                          className="h-1 flex-1 rounded-full"
                          animate={{ backgroundColor: seg <= strength.level ? strength.color : '#1A1A1A' }}
                          transition={{ duration: 0.3 }}
                        />
                      ))}
                    </div>
                    {strength.label && (
                      <p className="text-[11px] font-body" style={{ color: strength.color }}>
                        {strength.label} password
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {errors.password && (
                  <motion.span role="alert" className="block text-[11px] font-body" style={{ color: '#ff6b6b' }}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {errors.password.message}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Progress dots */}
            <AnimatePresence>
              {(nameFilled || ignFilled || emailFilled) && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 py-1"
                >
                  <div className="flex gap-1.5">
                    {[nameFilled, ignFilled, emailFilled, pwValue && strength.level >= 3].map((done, i) => (
                      <motion.div
                        key={i}
                        className="size-1.5 rounded-full"
                        animate={{ backgroundColor: done ? '#E53935' : '#1E1E1E' }}
                        transition={{ duration: 0.3 }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-body" style={{ color: '#444' }}>Profile completion</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Terms */}
            <motion.div
              className="space-y-1.5"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input type="checkbox" className="rdk-checkbox mt-0.5" {...register('terms')} />
                <span className="text-xs font-body leading-relaxed" style={{ color: '#555' }}>
                  I agree to RDK Esports{' '}
                  <a href="#" className="underline transition-colors hover:text-white" style={{ color: '#E53935' }}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="underline transition-colors hover:text-white" style={{ color: '#E53935' }}>Privacy Policy</a>
                </span>
              </label>
              <AnimatePresence>
                {errors.terms && (
                  <motion.span role="alert" className="block text-[11px] font-body" style={{ color: '#ff6b6b' }}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {errors.terms.message}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <motion.button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="btn-primary w-full justify-center"
                whileHover={!isSubmitting ? { scale: 1.01 } : {}}
                whileTap={!isSubmitting ? { scale: 0.98 } : {}}
              >
                <AnimatePresence mode="wait">
                  {isSuccess ? (
                    <motion.span key="s" className="flex items-center gap-2"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <CheckCircle2 className="size-4" /> Setting up your profile…
                    </motion.span>
                  ) : isSubmitting ? (
                    <motion.span key="l" className="flex items-center gap-2"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Creating account…
                    </motion.span>
                  ) : (
                    <motion.span key="i" className="flex items-center gap-2"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      Create Free Account <ArrowRight className="size-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </form>

          {/* Benefits strip */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid #1A1A1A' }}>
            <p className="text-[10px] font-body tracking-widest uppercase mb-3" style={{ color: '#333' }}>What you get</p>
            <div className="grid grid-cols-2 gap-2">
              {benefits.slice(0, 4).map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-2">
                  <div
                    className="size-5 rounded flex items-center justify-center shrink-0"
                    style={{
                      background: color === '#E53935' ? 'rgba(229,57,53,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${color === '#E53935' ? 'rgba(229,57,53,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <Icon className="size-2.5" style={{ color }} />
                  </div>
                  <span className="text-[10px] font-body" style={{ color: '#666' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ═══ Inline Register Form ═════════════════════════════════ */
function InlineRegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [showPw, setShowPw] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const { login } = useAuth()
  const nav = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', ign: '', email: '', password: '', terms: false },
  })

  const pwValue = watch('password')
  const strength = getStrength(pwValue)

  const onSubmit = async (data: RegisterValues) => {
    setServerError('')
    try {
      const response = await authService.register({
        name: data.name,
        ign: data.ign,
        email: data.email,
        password: data.password,
        role: 'player',
      })
      setIsSuccess(true)
      setTimeout(() => {
        login(response.user)
        nav(homeFor(response.user.role))
      }, 700)
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {serverError && (
          <motion.div
            className="alert-box alert-danger mb-4"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="rdk-label">Full Name</label>
            <div className="input-icon-wrap">
              <User className="input-icon size-4" />
              <input
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                className="rdk-input"
                {...register('name')}
                aria-invalid={!!errors.name}
              />
            </div>
            {errors.name && (
              <span className="block text-[11px] text-red-400 font-body">{errors.name.message}</span>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="rdk-label">
              <span>IGN</span>
              <span className="ml-1 normal-case text-[10px] text-white/40">(in-game)</span>
            </label>
            <div className="input-icon-wrap">
              <Gamepad2 className="input-icon size-4" />
              <input
                type="text"
                autoComplete="username"
                placeholder="DragonSlayer"
                className="rdk-input"
                {...register('ign')}
                aria-invalid={!!errors.ign}
              />
            </div>
            {errors.ign && (
              <span className="block text-[11px] text-red-400 font-body">{errors.ign.message}</span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="rdk-label">Email Address</label>
          <div className="input-icon-wrap">
            <Mail className="input-icon size-4" />
            <input
              type="email"
              autoComplete="email"
              placeholder="player@gamers.com"
              className="rdk-input"
              {...register('email')}
              aria-invalid={!!errors.email}
            />
          </div>
          {errors.email && (
            <span className="block text-[11px] text-red-400 font-body">{errors.email.message}</span>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="rdk-label">Create Password</label>
          <div className="input-icon-wrap">
            <Lock className="input-icon size-4" />
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              className="rdk-input pr-12"
              {...register('password')}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-white/40 hover:text-white"
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {pwValue && (
            <div className="space-y-1 pt-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((seg) => (
                  <div
                    key={seg}
                    className="h-1 flex-1 rounded-full transition-colors"
                    style={{ backgroundColor: seg <= strength.level ? strength.color : '#1A1A1A' }}
                  />
                ))}
              </div>
              {strength.label && (
                <p className="text-[10px] font-body" style={{ color: strength.color }}>
                  {strength.label} password
                </p>
              )}
            </div>
          )}
          {errors.password && (
            <span className="block text-[11px] text-red-400 font-body">{errors.password.message}</span>
          )}
        </div>

        <div className="space-y-1 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" className="rdk-checkbox mt-0.5" {...register('terms')} />
            <span className="text-xs text-white/50 leading-relaxed font-body">
              I agree to RDK Esports <span className="text-primary hover:underline">Terms</span> and{' '}
              <span className="text-primary hover:underline">Privacy Policy</span>
            </span>
          </label>
          {errors.terms && (
            <span className="block text-[11px] text-red-400 font-body">{errors.terms.message}</span>
          )}
        </div>

        <motion.button
          type="submit"
          disabled={isSubmitting || isSuccess}
          className="btn-primary w-full justify-center shadow-lg shadow-primary/25 cursor-pointer mt-2"
          whileHover={!isSubmitting ? { scale: 1.01 } : {}}
          whileTap={!isSubmitting ? { scale: 0.98 } : {}}
        >
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.span key="s" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CheckCircle2 className="size-4" /> Setting up your profile…
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

      <div className="mt-5 pt-4 border-t border-white/10 text-center">
        <p className="text-xs text-white/50">
          Already registered?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-primary font-bold hover:underline cursor-pointer ml-1"
          >
            Sign in instead →
          </button>
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Main LoginPage
═══════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')
  const { user, login, checkAuth, isInitialized } = useAuth()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()

  // Open register tab automatically if ?mode=register is in the URL
  useEffect(() => {
    if (searchParams.get('mode') === 'register') {
      setAuthTab('register')
    }
  }, [searchParams])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  })

  useEffect(() => {
    if (!isInitialized) checkAuth()
  }, [isInitialized, checkAuth])

  useEffect(() => {
    if (user) nav(homeFor(user.role), { replace: true })
  }, [user, nav])

  const onSubmit = async (data: LoginValues) => {
    setServerError('')
    try {
      const response = await authService.login(data.email, data.password)
      setIsSuccess(true)
      setTimeout(() => {
        login(response.user)
        nav(homeFor(response.user.role))
      }, 600)
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    }
  }

  const closeRegister = useCallback(() => setShowRegister(false), [])

  return (
    <>
      {/* ── Register Modal ── */}
      <AnimatePresence>
        {showRegister && (
          <RegisterModal
            onClose={closeRegister}
            onSuccess={closeRegister}
          />
        )}
      </AnimatePresence>

      <div
        className="min-h-screen grid lg:grid-cols-2"
        style={{ backgroundColor: '#0A0A0A' }}
      >
        {/* ══ LEFT — Hero Panel ══ */}
        <motion.div
          className="hidden lg:flex flex-col justify-between relative overflow-hidden p-12"
          style={{ backgroundColor: '#0D0D0D', borderRight: '1px solid #1A1A1A' }}
          variants={slideLeft}
          initial="hidden"
          animate="show"
        >
          <AnimatedGrid />

          {/* Content — sits above grid */}
          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-3 group w-fit">
              <img
                src="/logo.png"
                alt="RDK Esports"
                className="h-12 w-auto logo-glow group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col leading-none">
                <span className="font-display text-lg tracking-[0.15em] text-white">
                  RDK ESPORTS
                </span>
                <span className="text-[9px] font-body tracking-[0.1em] mt-0.5"
                  style={{ color: '#555' }}>
                  Powered by RDK Technologies
                </span>
              </div>
            </Link>
          </div>

          {/* Middle: headline + features */}
          <motion.div
            className="relative z-10 space-y-8 my-auto max-w-lg"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={itemVariants}>
              <h1 className="font-display text-4xl xl:text-5xl text-white leading-[1.1]">
                Run Every
                <br />
                <span className="gradient-text-red">Tournament.</span>
                <br />
                <span style={{ color: '#444' }}>From Reg to Final.</span>
              </h1>
              <motion.div
                className="red-line mt-4"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-3.5">
              {features.map(({ icon: Icon, label, color }) => (
                <motion.div
                  key={label}
                  className="flex items-center gap-3.5"
                  whileHover={{ x: 4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div
                    className="size-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: color === '#E53935'
                        ? 'rgba(229,57,53,0.1)'
                        : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${color === '#E53935'
                        ? 'rgba(229,57,53,0.25)'
                        : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    <Icon className="size-4" style={{ color }} />
                  </div>
                  <span className="text-sm font-body" style={{ color: '#999' }}>{label}</span>
                  <ChevronRight className="size-3 ml-auto" style={{ color: '#333' }} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>


          {/* Bottom note */}
          <div className="relative z-10 text-[10px] font-body mt-4 tracking-wider uppercase" style={{ color: '#444' }}>
            Powered by RDK Technologies
          </div>

        </motion.div>

        {/* ══ RIGHT — Login Form ══ */}
        <motion.div
          className="flex items-center justify-center p-6 lg:p-12 relative overflow-hidden"
          style={{ backgroundColor: '#0A0A0A' }}
          variants={slideRight}
          initial="hidden"
          animate="show"
        >
          {/* Subtle top-right glow */}
          <div className="absolute top-0 right-0 w-72 h-72 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at top right, rgba(229,57,53,0.06) 0%, transparent 70%)',
            }}
          />

          <motion.div
            className="w-full max-w-sm relative z-10"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* Mobile logo */}
            <motion.div variants={itemVariants} className="lg:hidden flex items-center gap-3 mb-6">
              <img src="/logo.png" alt="RDK Esports" className="h-9 w-auto logo-glow" />
              <span className="font-display text-base tracking-widest text-white">RDK ESPORTS</span>
            </motion.div>

            {/* Glowing Segmented Auth Tab Switcher */}
            <motion.div variants={itemVariants} className="mb-7">
              <div
                className="relative rounded-2xl p-1.5 flex items-center bg-[#111111] border border-white/10 shadow-inner"
              >
                <motion.div
                  className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-primary to-[#C62828] shadow-[0_0_20px_rgba(229,57,53,0.4)] pointer-events-none"
                  style={{
                    width: 'calc(50% - 6px)',
                    left: authTab === 'login' ? 6 : 'calc(50%)',
                  }}
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className={`relative z-10 flex-1 py-2.5 text-xs font-bold font-body transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    authTab === 'login' ? 'text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="size-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('register')}
                  className={`relative z-10 flex-1 py-2.5 text-xs font-bold font-body transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    authTab === 'register' ? 'text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  <Zap className="size-3.5" />
                  <span>Create Account</span>
                </button>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {authTab === 'login' ? (
                <motion.div
                  key="login-tab"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Headline */}
                  <div className="mb-6">
                    <h2 className="font-display text-3xl text-white tracking-wide">
                      Welcome back.
                    </h2>
                    <p className="mt-2 text-sm font-body text-white/50">
                      Sign in — we'll route you to the right station.
                    </p>
                    <div className="red-line mt-3" />
                  </div>

                  {/* Server error */}
                  <AnimatePresence>
                    {serverError && (
                      <motion.div
                        className="alert-box alert-danger mb-6"
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.25 }}
                      >
                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                        <span>{serverError}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Form */}
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="rdk-label">Email Address</label>
                      <div className="input-icon-wrap">
                        <Mail className="input-icon size-4" />
                        <input
                          type="email"
                          autoComplete="email"
                          placeholder="name@organization.com"
                          className="rdk-input"
                          {...register('email')}
                          aria-invalid={!!errors.email}
                        />
                      </div>
                      <AnimatePresence>
                        {errors.email && (
                          <motion.span
                            role="alert"
                            className="block text-xs font-body text-red-400"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                          >
                            {errors.email.message}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label className="rdk-label">Password</label>
                      <div className="input-icon-wrap">
                        <Lock className="input-icon size-4" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="rdk-input pr-12"
                          {...register('password')}
                          aria-invalid={!!errors.password}
                        />
                        <button
                          type="button"
                          aria-label={showPass ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPass((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors text-white/40 hover:text-white"
                        >
                          {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      <AnimatePresence>
                        {errors.password && (
                          <motion.span
                            role="alert"
                            className="block text-xs font-body text-red-400"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                          >
                            {errors.password.message}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Remember + Forgot */}
                    <div className="flex items-center justify-between text-xs font-body pt-1">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="rdk-checkbox"
                          {...register('remember')}
                        />
                        <span className="transition-colors group-hover:text-white text-white/60">
                          Remember me
                        </span>
                      </label>
                      <a
                        href="#forgot"
                        onClick={(e) => { e.preventDefault(); alert('Password recovery is managed by RDK Technologies.') }}
                        className="transition-colors hover:underline text-primary font-medium"
                      >
                        Forgot password?
                      </a>
                    </div>

                    {/* Submit */}
                    <div className="pt-2">
                      <motion.button
                        type="submit"
                        disabled={isSubmitting || isSuccess}
                        className="btn-primary w-full justify-center shadow-lg shadow-primary/25 cursor-pointer"
                        whileHover={!isSubmitting ? { scale: 1.01 } : {}}
                        whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                      >
                        <AnimatePresence mode="wait">
                          {isSuccess ? (
                            <motion.span
                              key="success"
                              className="flex items-center gap-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <ShieldCheck className="size-4" />
                              Routing you in…
                            </motion.span>
                          ) : isSubmitting ? (
                            <motion.span
                              key="loading"
                              className="flex items-center gap-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                              Authenticating…
                            </motion.span>
                          ) : (
                            <motion.span
                              key="idle"
                              className="flex items-center gap-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              Sign In
                              <ArrowRight className="size-4" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </form>

                  {/* Switch to Register */}
                  <div className="mt-7 pt-5 border-t border-white/10 text-center">
                    <p className="text-xs text-white/50">
                      New to RDK Esports?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthTab('register')}
                        className="text-primary font-bold hover:underline cursor-pointer ml-1"
                      >
                        Create an account →
                      </button>
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="register-tab"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Headline */}
                  <div className="mb-6">
                    <h2 className="font-display text-3xl text-white tracking-wide">
                      Join the Arena.
                    </h2>
                    <p className="mt-2 text-sm font-body text-white/50">
                      Compete, win, and claim your spot on the leaderboard.
                    </p>
                    <div className="red-line mt-3" />
                  </div>

                  <InlineRegisterForm onSwitchToLogin={() => setAuthTab('login')} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <motion.p
              variants={itemVariants}
              className="text-center text-[10px] font-mono mt-8 tracking-wider uppercase text-white/20"
            >
              RDK Esports · Powered by RDK Technologies
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}

