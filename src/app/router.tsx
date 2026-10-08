import type { ReactElement, ReactNode } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import AppShell from '../components/AppShell';
import { AccessDeniedState, EmptyState, LoadingState } from '../components/states';
import { useI18n } from '../i18n/provider';
import AbsenPage from '../pages/AbsenPage';
import FirstLoginPage from '../pages/FirstLoginPage';
import LoginPage from '../pages/LoginPage';
import ProfilPage from '../pages/ProfilPage';
import ChangePasswordPage from '../pages/profile/ChangePasswordPage';
import ChangePhonePage from '../pages/profile/ChangePhonePage';
import ChangePhotoPage from '../pages/profile/ChangePhotoPage';
import SummaryPage from '../pages/SummaryPage';
import { useSession } from '../services/session';

/**
 * A single route entry kept as data (not JSX) so the table can be inspected
 * or extended programmatically, e.g. when routes become role-aware.
 */
export interface AppRoute {
  path: string;
  element: ReactElement;
}

/** Routes that own the whole viewport and never show the app chrome. */
export const standaloneRoutes: AppRoute[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/first-login', element: <FirstLoginPage /> },
];

/** Routes rendered inside the AppShell layout (nav bar + <Outlet/>). */
export const shellRoutes: AppRoute[] = [
  { path: '/profil', element: <ProfilPage /> },
  { path: '/profil/telepon', element: <ChangePhonePage /> },
  { path: '/profil/foto', element: <ChangePhotoPage /> },
  { path: '/profil/kata-sandi', element: <ChangePasswordPage /> },
  { path: '/absen', element: <AbsenPage /> },
  { path: '/summary', element: <SummaryPage /> },
];

/** Landing path for "/" and the destination of the default redirect. */
export const defaultPath = '/absen';

/** Centres full-viewport states on the page background, without app chrome. */
function FullPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      {children}
    </div>
  );
}

/** Shown for addresses that belong to no route of this app. */
function NotFoundPage() {
  const { t } = useI18n();
  return (
    <FullPage>
      <EmptyState
        title={t('route.notFound.title')}
        description={t('route.notFound.description')}
        action={
          <Link
            to={defaultPath}
            className="inline-flex min-h-[44px] items-center rounded-md bg-gray-800 px-4 text-sm font-medium text-white hover:bg-gray-900"
          >
            {t('route.notFound.back')}
          </Link>
        }
      />
    </FullPage>
  );
}

/**
 * The whole employee app is denied for an HRD session: this app only serves
 * employees, so an HRD cookie gets the access-denied state instead of any
 * screen.
 */
function HrdDeniedPage() {
  return (
    <FullPage>
      <AccessDeniedState />
    </FullPage>
  );
}

/**
 * Route guard around the whole route tree. It resolves one decision per
 * session state: still probing shows the loading state, anonymous visitors
 * may only open the sign-in screen, a pending forced password change owns
 * every address until it is done, HRD sessions are denied, and a signed-in
 * employee is routed away from the auth screens towards Absen.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const { status, session } = useSession();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <FullPage>
        <LoadingState />
      </FullPage>
    );
  }

  if (status === 'anon') {
    return location.pathname === '/login' ? (
      <>{children}</>
    ) : (
      <Navigate to="/login" replace />
    );
  }

  if (session?.role === 'hrd') {
    return <HrdDeniedPage />;
  }

  if (session?.mustChangePassword) {
    return location.pathname === '/first-login' ? (
      <>{children}</>
    ) : (
      <Navigate to="/first-login" replace />
    );
  }

  if (location.pathname === '/login' || location.pathname === '/first-login') {
    return <Navigate to={defaultPath} replace />;
  }

  return <>{children}</>;
}

/** Route tree without the router provider; exported for tests. */
export function AppRoutes() {
  return (
    <SessionGate>
      <Routes>
        {standaloneRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
        <Route element={<AppShell />}>
          {shellRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Route>
        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SessionGate>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
