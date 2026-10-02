import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Trophy, Home, ArrowLeft, Rocket } from 'lucide-react'

export default function ComingSoon() {
  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="size-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(229,57,53,0.2)]">
          <Rocket className="size-8 text-primary animate-pulse" />
        </div>

        <div className="space-y-2 mb-6">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary flex items-center justify-center gap-1.5">
            <Sparkles className="size-3.5" /> Pipeline Feature
          </span>
          <h1 className="font-display text-3xl font-black text-white tracking-wide">
            Coming Soon
          </h1>
          <p className="text-xs sm:text-sm text-white/50 leading-relaxed font-body">
            This module is currently being finalized in the RDK competitive engine rollout. Check back shortly for updates.
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
          RDK Esports Platform · Powered by RDK Technologies
        </p>
      </motion.div>
    </div>
  )
}
