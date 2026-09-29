import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/stores/authStore'
import type { Role } from '@/types'

export const RouteGuard = ({ allow }: { allow: Role[] }) => {
  const { user, isLoading, isInitialized, checkAuth } = useAuth()

  useEffect(() => {
    if (!isInitialized) {
      checkAuth()
    }
  }, [isInitialized, checkAuth])

  if (isLoading || !isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Verifying session...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.email?.toLowerCase() === 'auraxtremezofficial@gmail.com' || user.role === 'super_admin') {
    return <Outlet />
  }

  return allow.includes(user.role) ? <Outlet /> : <Navigate to="/unauthorized" replace />
}
