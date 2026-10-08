import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import { SessionContext, type SessionValue } from '../services/session';
import { AppRoutes } from './router';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeSession(overrides: Partial<SessionValue> = {}): SessionValue {
  return {
    session: null,
    status: 'anon',
    refresh: vi.fn().mockResolvedValue(undefined),
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

function authedSession(overrides: Partial<SessionValue> = {}): SessionValue {
  return makeSession({
    ...overrides,
    status: 'authed',
    session: {
      role: 'employee',
      mustChangePassword: false,
      name: 'Worker',
      email: 'worker@corp.test',
      ...overrides.session,
    },
  });
}

function renderAt(path: string, value: SessionValue) {
  return render(
    <SessionContext.Provider value={value}>
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </I18nProvider>
    </SessionContext.Provider>,
  );
}

describe('router guards', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse({ status: 'belum_masuk' }));
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('holds the whole app on the loading state while the session is probed', () => {
    renderAt('/absen', makeSession({ status: 'loading' }));

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.queryByTestId('login')).not.toBeInTheDocument();
    expect(screen.queryByTestId('absen')).not.toBeInTheDocument();
  });

  it('sends an anonymous visitor to the sign-in screen from any route', () => {
    renderAt('/absen', makeSession());

    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('absen')).not.toBeInTheDocument();
  });

  it('lets an anonymous visitor open the sign-in screen', () => {
    renderAt('/login', makeSession());

    expect(screen.getByTestId('login')).toBeInTheDocument();
  });

  it('lands an employee on Absen inside the app shell', () => {
    renderAt('/', authedSession());

    expect(screen.getByTestId('absen')).toBeInTheDocument();
    expect(screen.getByTestId('nav-desktop')).toBeInTheDocument();
  });

  it('moves a signed-in employee away from the sign-in screen', () => {
    renderAt('/login', authedSession());

    expect(screen.getByTestId('absen')).toBeInTheDocument();
    expect(screen.queryByTestId('login')).not.toBeInTheDocument();
  });

  it('keeps Profil and Summary reachable for employees', () => {
    const { unmount } = renderAt('/profil', authedSession());
    expect(screen.getByTestId('profil')).toBeInTheDocument();
    expect(screen.getByTestId('nav-desktop')).toBeInTheDocument();
    unmount();

    renderAt('/summary', authedSession());
    expect(screen.getByTestId('summary')).toBeInTheDocument();
  });

  it('keeps the three profile change screens reachable for employees', () => {
    const { unmount } = renderAt('/profil/telepon', authedSession());
    expect(screen.getByTestId('change-phone')).toBeInTheDocument();
    expect(screen.getByTestId('nav-desktop')).toBeInTheDocument();
    unmount();

    renderAt('/profil/foto', authedSession());
    expect(screen.getByTestId('change-photo')).toBeInTheDocument();
    unmount();

    renderAt('/profil/kata-sandi', authedSession());
    expect(screen.getByTestId('change-password')).toBeInTheDocument();
  });

  it('denies an HRD session on the profile change screens', () => {
    renderAt('/profil/foto', authedSession({
      session: { role: 'hrd', mustChangePassword: false },
    }));

    expect(screen.getByTestId('access-denied-state')).toBeInTheDocument();
    expect(screen.queryByTestId('change-photo')).not.toBeInTheDocument();
  });

  it('forces the first-password screen over the profile change screens', () => {
    renderAt('/profil/kata-sandi', authedSession({
      session: { role: 'employee', mustChangePassword: true },
    }));

    expect(screen.getByTestId('first-login')).toBeInTheDocument();
    expect(screen.queryByTestId('change-password')).not.toBeInTheDocument();
  });

  it('forces the first-password screen for every route while the change is due', () => {
    const { unmount } = renderAt('/absen', authedSession({
      session: { role: 'employee', mustChangePassword: true },
    }));
    expect(screen.getByTestId('first-login')).toBeInTheDocument();
    expect(screen.queryByTestId('absen')).not.toBeInTheDocument();
    unmount();

    renderAt('/summary', authedSession({
      session: { role: 'employee', mustChangePassword: true },
    }));
    expect(screen.getByTestId('first-login')).toBeInTheDocument();
  });

  it('sends a user who must change the password away from the sign-in screen', () => {
    renderAt('/login', authedSession({
      session: { role: 'employee', mustChangePassword: true },
    }));

    expect(screen.getByTestId('first-login')).toBeInTheDocument();
    expect(screen.queryByTestId('login')).not.toBeInTheDocument();
  });

  it('denies an HRD session with the access-denied state', () => {
    renderAt('/absen', authedSession({
      session: { role: 'hrd', mustChangePassword: false },
    }));

    expect(screen.getByTestId('access-denied-state')).toBeInTheDocument();
    expect(screen.queryByTestId('absen')).not.toBeInTheDocument();
  });

  it('shows a not-found page for an unknown path', () => {
    renderAt('/halaman-tidak-ada', authedSession());

    expect(
      screen.getByText(id['route.notFound.title']),
    ).toBeInTheDocument();
    expect(
      screen.getByText(id['route.notFound.description']),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: id['route.notFound.back'] }),
    ).toBeInTheDocument();
  });
});
