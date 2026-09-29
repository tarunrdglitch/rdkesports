import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldCheck, Eye, EyeOff, AlertCircle, UserCheck } from 'lucide-react'
import { authService } from '@/services/api/authService'
import { useAuth } from '@/stores/authStore'
import { homeFor } from '@/app/config/roles'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  ign: z.string().min(2, 'In-game Name (IGN) is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['player', 'team_captain']),
})

type RegisterFormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const [show, setShow] = useState(false)
  const [serverError, setServerError] = useState('')
  const { user, login } = useAuth()
  const nav = useNavigate()

  useEffect(() => {
    if (user) {
      nav(homeFor(user.role), { replace: true })
    } else {
      nav('/?auth=register', { replace: true })
    }
  }, [user, nav])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'player',
    },
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError('')
    try {
      const response = await authService.register({
        name: data.name,
        ign: data.ign,
        email: data.email,
        password: data.password,
        role: data.role,
      })
      login(response.user)
      nav(homeFor(response.user.role))
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message)
      } else {
        setServerError('An error occurred during account registration.')
      }
    }
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
            Competitive Gamer Portal
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground">
            Join the Esports Arena.
            <br />
            Register, Compete, Win.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground leading-relaxed">
            Create your player profile, register squads in official creator tournaments, get auction drafted, and track your competitive rankings across South Asia.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Powered by RDK Technologies</span>
          <span className="flex items-center gap-1.5">
            <UserCheck className="size-3.5 text-success" />
            Instant Player Activation
          </span>
        </div>
      </div>

      {/* Registration Form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Create your gamer account</h2>
            <p className="text-xs text-muted-foreground">
              Sign up as a competitive player or team captain to register for live tournaments.
            </p>
          </div>

          {serverError && (
            <div className="flex items-center gap-2 rounded border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              <AlertCircle className="size-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-foreground">
                Full Name
                <input
                  type="text"
                  placeholder="Rahul Sharma"
                  className={field}
                  {...register('name')}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <span role="alert" className="mt-1 block text-xs text-danger">
                    {errors.name.message}
                  </span>
                )}
              </label>

              <label className="block text-xs font-medium text-foreground">
                In-Game Name (IGN)
                <input
                  type="text"
                  placeholder="Viper_99"
                  className={field}
                  {...register('ign')}
                  aria-invalid={!!errors.ign}
                />
                {errors.ign && (
                  <span role="alert" className="mt-1 block text-xs text-danger">
                    {errors.ign.message}
                  </span>
                )}
              </label>
            </div>

            <label className="block text-xs font-medium text-foreground">
              Email Address
              <input
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
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
                  autoComplete="new-password"
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



            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded bg-primary py-2.5 text-sm font-semibold text-background shadow transition hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? 'Creating Player Account…' : 'Create Free Account'}
            </button>

            <div className="text-center pt-2 text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Sign in here
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
