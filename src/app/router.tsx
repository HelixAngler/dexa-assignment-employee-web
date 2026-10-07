import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../components/AppShell';
import AbsenPage from '../pages/AbsenPage';
import FirstLoginPage from '../pages/FirstLoginPage';
import LoginPage from '../pages/LoginPage';
import ProfilPage from '../pages/ProfilPage';
import SummaryPage from '../pages/SummaryPage';

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
  { path: '/absen', element: <AbsenPage /> },
  { path: '/summary', element: <SummaryPage /> },
];

/** Landing path for "/" and for any unmatched path. */
export const defaultPath = '/absen';

/** Route tree without the router provider; exported for tests. */
export function AppRoutes() {
  return (
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
      <Route path="*" element={<Navigate to={defaultPath} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
