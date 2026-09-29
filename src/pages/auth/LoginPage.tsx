import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, ShieldCheck, AlertCircle, Crown, Star, Gavel, Gamepad2 } from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { authService } from '@/services/api/authService'
import { homeFor } from '@/app/config/roles'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
  remember: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const [show, setShow] = useState(false)
  const [serverError, setServerError] = useState('')
  const { user, login, checkAuth, isInitialized } = useAuth()
  const nav = useNavigate()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'head@rdk.com',
      password: 'password123',
      remember: true,
    },
  })

  useEffect(() => {
    if (!isInitialized) {
      checkAuth()
    }
  }, [isInitialized, checkAuth])

  useEffect(() => {
    if (user) {
      nav(homeFor(user.role), { replace: true })
    } else {
      nav('/?auth=login', { replace: true })
    }
  }, [user, nav])

  const onSubmit = async (data: FormValues) => {
    setServerError('')
    try {
      const response = await authService.login(data.email, data.password)
      login(response.user)
      nav(homeFor(response.user.role))
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message)
      } else {
        setServerError('An unexpected error occurred while signing in.')
      }
    }
  }

  const setPreset = (email: string, pass = 'password123') => {
    setValue('email', email, { shouldValidate: true })
    setValue('password', pass, { shouldValidate: true })
    setServerError('')
  }

  const field =
    'mt-1 w-full rounded border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none transition-colors'

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand & Hero Side */}
      <div className="hidden flex-col justify-between border-r border-border bg-card p-12 lg:flex">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="RDK Esports Logo"
            className="h-14 w-auto drop-shadow-[0_0_12px_rgba(255,180,0,0.45)]"
          />
          <div className="flex flex-col leading-none">
            <span className="font-heading font-black text-xl tracking-widest text-foreground">RDK ESPORTS</span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wider">Powered by RDK Technologies</span>
          </div>
        </Link>

        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-primary mb-6">
            <ShieldCheck className="size-3.5" />
            Universal Single-Login Hub
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground">
            Run every tournament.
            <br />
            From registration to grand final.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground leading-relaxed">
            One single login automatically routes you to your exact station: Platform Owner, Official Partner Creator, Ambassador, or Tournament Player.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Powered by RDK Technologies</span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success animate-pulse" />
            Backend Online
          </span>
        </div>
      </div>

      {/* Login Form Side */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Sign in to your station</h2>
            <p className="text-xs text-muted-foreground">
              Sign in with your credentials or click any station preset below.
            </p>
          </div>

          {serverError && (
            <div className="flex items-center gap-2 rounded border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              <AlertCircle className="size-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <label className="block text-xs font-medium text-foreground">
              Email Address
              <input
                type="email"
                autoComplete="email"
                placeholder="name@organization.com"
                className={field}
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <span role="alert" className="mt-1 block text-xs text-danger">
                  {errors.email.message}
                </span>
              )}
            </label>

            <label className="block text-xs font-medium text-foreground">
              Password
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={field}
                  {...register('password')}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  aria-label={show ? 'Hide password' : 'Show password'}
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-3 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <span role="alert" className="mt-1 block text-xs text-danger">
                  {errors.password.message}
                </span>
              )}
            </label>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-border bg-muted accent-primary"
                  {...register('remember')}
                />
                Remember me
              </label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password recovery is managed by RDK Technologies.') }} className="text-primary hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded bg-primary py-2.5 text-sm font-semibold text-background shadow transition hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? 'Authenticating & Routing…' : 'Sign In'}
            </button>
          </form>

          {/* New account registration CTA */}
          <div className="text-center text-xs text-muted-foreground pt-1">
            New player or squad leader?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Create a free account
            </Link>
          </div>

          {/* Quick preset account switcher */}
          <div className="pt-2 border-t border-border">
            <p className="text-[11px] font-medium text-muted-foreground mb-2">1-Click Station Presets:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPreset('head@rdk.com')}
                className="rounded border border-primary/40 bg-primary/5 p-2 text-left hover:border-primary hover:bg-primary/10 transition-colors"
              >
                <div className="font-bold text-primary flex items-center gap-1.5">
                  <Crown className="size-3.5" />
                  <span>Project Head</span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">head@rdk.com</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('creator@clashers.com')}
                className="rounded border border-border bg-card p-2 text-left hover:border-primary/50 hover:bg-muted transition-colors"
              >
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Star className="size-3.5 text-yellow-400" />
                  <span>Official Creator</span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">creator@clashers.com</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('aura_xtremez@auction.rdk', 'AUCTION#AURA26')}
                className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-left hover:border-amber-500 hover:bg-amber-500/20 transition-colors"
              >
                <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <Gavel className="size-3.5" />
                  <span>Auction Ambassador</span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">aura_xtremez@auction.rdk</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('captain@x.com')}
                className="rounded border border-border bg-card p-2 text-left hover:border-primary/50 hover:bg-muted transition-colors"
              >
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Gamepad2 className="size-3.5 text-muted-foreground" />
                  <span>Captain / Gamer</span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">captain@x.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
