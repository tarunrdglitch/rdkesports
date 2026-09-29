import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RouteGuard } from '@/components/layout/RouteGuard'
import { Skeleton } from '@/components/common/Skeleton'
import { NotFoundPage, UnauthorizedPage } from '@/pages/misc/StatusPages'

const LandingPage = lazy(() => import('@/pages/public/LandingPage'))
const TournamentDetailPage = lazy(() => import('@/pages/public/TournamentDetailPage'))
const Login = lazy(() => import('@/pages/auth/LoginPage'))
const Register = lazy(() => import('@/pages/auth/RegisterPage'))
const OrgDash = lazy(() => import('@/pages/organization/DashboardPage'))
const CreatorsAdmin = lazy(() => import('@/pages/admin/CreatorsManagementPage'))
const AmbassadorDesk = lazy(() => import('@/pages/creator/AmbassadorManagementPage'))
const AuctionCredentials = lazy(() => import('@/pages/creator/AuctionCredentialsPage'))
const CreateTournament = lazy(() => import('@/pages/creator/CreateTournamentPage'))
const TournamentManage = lazy(() => import('@/pages/creator/TournamentManagePage'))
const PaymentsDesk = lazy(() => import('@/pages/creator/PaymentsManagementPage'))
const AmbassadorBidderPortal = lazy(() => import('@/pages/ambassador/AmbassadorBidderPortal'))
const PlayerDash = lazy(() => import('@/pages/player/PlayerDashboard'))
const Soon = lazy(() => import('@/pages/misc/ComingSoon'))

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
              { path: '/creator/*', element: S(<Soon />) },
              { path: '/organization/dashboard', element: S(<OrgDash />) },
              { path: '/organization/tournaments', element: S(<OrgDash />) },
              { path: '/organization/tournaments/create', element: S(<CreateTournament />) },
              { path: '/organization/tournaments/:id/manage', element: S(<TournamentManage />) },
              { path: '/organization/payments', element: S(<PaymentsDesk />) },
              { path: '/organization/ambassadors', element: S(<AmbassadorDesk />) },
              { path: '/organization/auctions', element: S(<AuctionCredentials />) },
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
