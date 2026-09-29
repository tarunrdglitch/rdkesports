import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RouteGuard } from '@/components/layout/RouteGuard'
import { Skeleton } from '@/components/common/Skeleton'
import { NotFoundPage, UnauthorizedPage } from '@/pages/misc/StatusPages'

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.name === 'ChunkLoadError'

      if (isChunkError) {
        const lastReload = sessionStorage.getItem('chunk_reload_ts')
        const now = Date.now()
        if (!lastReload || now - Number(lastReload) > 8000) {
          sessionStorage.setItem('chunk_reload_ts', String(now))
          window.location.reload()
          return new Promise(() => {})
        }
      }
      throw error
    }
  })
}

const LandingPage = lazyWithRetry(() => import('@/pages/public/LandingPage'))
const TournamentDetailPage = lazyWithRetry(() => import('@/pages/public/TournamentDetailPage'))
const Login = lazyWithRetry(() => import('@/pages/auth/LoginPage'))
const Register = lazyWithRetry(() => import('@/pages/auth/RegisterPage'))
const OrgDash = lazyWithRetry(() => import('@/pages/organization/DashboardPage'))
const CreatorsAdmin = lazyWithRetry(() => import('@/pages/admin/CreatorsManagementPage'))
const AmbassadorDesk = lazyWithRetry(() => import('@/pages/creator/AmbassadorManagementPage'))
const AuctionCredentials = lazyWithRetry(() => import('@/pages/creator/AuctionCredentialsPage'))
const CreateTournament = lazyWithRetry(() => import('@/pages/creator/CreateTournamentPage'))
const TournamentManage = lazyWithRetry(() => import('@/pages/creator/TournamentManagePage'))
const PaymentsDesk = lazyWithRetry(() => import('@/pages/creator/PaymentsManagementPage'))
const AmbassadorBidderPortal = lazyWithRetry(() => import('@/pages/ambassador/AmbassadorBidderPortal'))
const PlayerDash = lazyWithRetry(() => import('@/pages/player/PlayerDashboard'))
const CreatorProfile = lazyWithRetry(() => import('@/pages/creator/CreatorProfilePage'))
const Soon = lazyWithRetry(() => import('@/pages/misc/ComingSoon'))

const S = (el: JSX.Element) => <Suspense fallback={<Skeleton className="m-6 h-40" />}>{el}</Suspense>

export const router = createBrowserRouter([
  // Public Portfolio & Tournament Showcase
  { path: '/', element: S(<LandingPage />) },
  { path: '/tournaments', element: S(<LandingPage />) },
  { path: '/tournaments/:id', element: S(<TournamentDetailPage />) },
  { path: '/tournament/:id', element: S(<TournamentDetailPage />) },
  { path: '/login', element: S(<Login />) },
  { path: '/register', element: S(<Register />) },
  { path: '/unauthorized', element: <UnauthorizedPage /> },

  // Protected Routes with Unified AppShell
  {
    element: (
      <RouteGuard
        allow={[
          'super_admin',
          'creator',
          'org_owner',
          'ambassador',
          'player',
        ]}
      />
    ),
    children: [
      {
        element: <AppShell />,
        children: [
          // 1. Head / Super Admin ONLY
          {
            element: <RouteGuard allow={['super_admin']} />,
            children: [
              { path: '/admin/dashboard', element: S(<OrgDash />) },
              { path: '/admin/creators', element: S(<CreatorsAdmin />) },
              { path: '/admin/tournaments', element: S(<OrgDash />) },
              { path: '/admin/tournaments/create', element: S(<CreateTournament />) },
              { path: '/admin/tournaments/:id/manage', element: S(<TournamentManage />) },
              { path: '/admin/payments', element: S(<PaymentsDesk />) },
              { path: '/admin/*', element: S(<Soon />) },
            ],
          },

          // 2. Official Creator / Organization (Ambassador strictly EXCLUDED)
          {
            element: (
              <RouteGuard
                allow={['super_admin', 'creator', 'org_owner']}
              />
            ),
            children: [
              { path: '/creator/dashboard', element: S(<OrgDash />) },
              { path: '/creator/tournaments', element: S(<OrgDash />) },
              { path: '/creator/tournaments/create', element: S(<CreateTournament />) },
              { path: '/creator/tournaments/:id/manage', element: S(<TournamentManage />) },
              { path: '/creator/payments', element: S(<PaymentsDesk />) },
              { path: '/creator/ambassadors', element: S(<AmbassadorDesk />) },
              { path: '/creator/auctions', element: S(<AuctionCredentials />) },
              { path: '/creator/profile', element: S(<CreatorProfile />) },
              { path: '/creator/*', element: S(<Soon />) },
              { path: '/organization/dashboard', element: S(<OrgDash />) },
              { path: '/organization/tournaments', element: S(<OrgDash />) },
              { path: '/organization/tournaments/create', element: S(<CreateTournament />) },
              { path: '/organization/tournaments/:id/manage', element: S(<TournamentManage />) },
              { path: '/organization/payments', element: S(<PaymentsDesk />) },
              { path: '/organization/ambassadors', element: S(<AmbassadorDesk />) },
              { path: '/organization/auctions', element: S(<AuctionCredentials />) },
              { path: '/organization/profile', element: S(<CreatorProfile />) },
              { path: '/organization/*', element: S(<Soon />) },
            ],
          },

          // 3. Ambassador & Franchise Bidder Desk (Strictly assigned auction bidding, squad roster, & live stream)
          {
            element: <RouteGuard allow={['ambassador', 'super_admin']} />,
            children: [
              { path: '/ambassador/dashboard', element: S(<AmbassadorBidderPortal />) },
              { path: '/ambassador/squad', element: S(<AmbassadorBidderPortal initialTab="squad" />) },
              { path: '/ambassador/live', element: S(<AmbassadorBidderPortal initialTab="live" />) },
              { path: '/ambassador/*', element: S(<AmbassadorBidderPortal />) },
            ],
          },

          // 4. Audience / Registered Gamer / Player
          {
            element: <RouteGuard allow={['player', 'super_admin']} />,
            children: [
              { path: '/player/dashboard', element: S(<PlayerDash />) },
              { path: '/player/*', element: S(<Soon />) },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
