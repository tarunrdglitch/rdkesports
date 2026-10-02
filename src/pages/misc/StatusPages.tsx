import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldAlert, Compass, ArrowLeft, Home, Radio } from 'lucide-react'

interface StatusBoxProps {
  code: string
  title: string
  subtitle: string
  description: string
  icon: React.ElementType
}

function StatusBox({ code, title, subtitle, description, icon: Icon }: StatusBoxProps) {
  return (
    <div className="relative min-h-[85vh] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Decorative grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-md w-full bg-[#0E0E0E] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl"
      >
        {/* Top glowing accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="size-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(229,57,53,0.2)]">
          <Icon className="size-8 text-primary" />
        </div>

        <div className="space-y-2 mb-6">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            {code} · {subtitle}
          </span>
          <h1 className="font-display text-3xl font-black text-white tracking-wide">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-white/50 leading-relaxed font-body">
            {description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="btn-primary w-full sm:w-auto justify-center cursor-pointer shadow-lg shadow-primary/20 text-xs px-6 py-2.5"
          >
            <Home className="size-4" />
            <span>Return to Arena</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="size-4" />
            <span>Go Back</span>
          </button>
        </div>

        <p className="mt-8 text-[10px] font-mono text-white/20 uppercase tracking-widest">
          RDK Esports Platform · Security Protocol
        </p>
      </motion.div>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <StatusBox
      code="404"
      subtitle="Waypoint Lost"
      title="Sector Not Found"
      description="The competitive coordinate or tournament link you are attempting to access does not exist or has been relocated."
      icon={Compass}
    />
  )
}

export function UnauthorizedPage() {
  return (
    <StatusBox
      code="403"
      subtitle="Access Restricted"
      title="Restricted Sector"
      description="Your credentials lack the authorization tier required for this station. Please sign in with an authorized role."
      icon={ShieldAlert}
    />
  )
}
