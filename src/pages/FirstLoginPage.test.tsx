import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import { ApiError } from '../services/api';
import { setFirstPassword } from '../services/auth';
import { SessionContext, type SessionValue } from '../services/session';
import FirstLoginPage from './FirstLoginPage';

vi.mock('../services/auth', () => ({
  fetchSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  setFirstPassword: vi.fn(),
}));

const setFirstPasswordMock = vi.mocked(setFirstPassword);

function makeSession(overrides: Partial<SessionValue> = {}): SessionValue {
  return {
    session: { role: 'employee', mustChangePassword: true },
    status: 'authed',
    refresh: vi.fn().mockResolvedValue(undefined),
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

function renderFirstLogin(value: SessionValue) {
  return render(
    <SessionContext.Provider value={value}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/first-login']}>
          <Routes>
            <Route path="/first-login" element={<FirstLoginPage />} />
            <Route path="/absen" element={<div>absen-destination</div>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </SessionContext.Provider>,
  );
}

async function fillPasswords(
  user: ReturnType<typeof userEvent.setup>,
  password: string,
  confirmation: string,
) {
  await user.type(screen.getByLabelText(id['firstLogin.newPasswordLabel']), password);
  await user.type(
    screen.getByLabelText(id['firstLogin.confirmPasswordLabel']),
    confirmation,
  );
  await user.click(screen.getByRole('button', { name: id['firstLogin.submit'] }));
}

describe('FirstLoginPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    setFirstPasswordMock.mockReset();
  });

  it('renders the forced-change form copy in Indonesian', () => {
    renderFirstLogin(makeSession());

    expect(screen.getByTestId('first-login')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: id['firstLogin.title'] }),
    ).toBeInTheDocument();
    expect(screen.getByText(id['firstLogin.subtitle'])).toBeInTheDocument();
    expect(screen.getByText(id['firstLogin.hint'])).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: id['firstLogin.submit'] }),
    ).toBeInTheDocument();
  });

  it('blocks submission with the mismatch copy when the passwords differ', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn();
    renderFirstLogin(makeSession({ refresh }));

    await fillPasswords(user, 'first-password', 'other-password');

    expect(await screen.findByTestId('first-login-error')).toHaveTextContent(
      id['firstLogin.mismatch'],
    );
    expect(setFirstPasswordMock).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('submits both fields, refreshes the session and routes to Absen', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(undefined);
    setFirstPasswordMock.mockResolvedValue(undefined);
    renderFirstLogin(makeSession({ refresh }));

    await fillPasswords(user, 'brand-new-pass', 'brand-new-pass');

    expect(setFirstPasswordMock).toHaveBeenCalledWith(
      'brand-new-pass',
      'brand-new-pass',
    );
    expect(await screen.findByText('absen-destination')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows the server weak-password message verbatim', async () => {
    const user = userEvent.setup();
    setFirstPasswordMock.mockRejectedValue(
      new ApiError(
        400,
        'PASSWORD_WEAK',
        'Kata sandi tidak memenuhi persyaratan keamanan.',
      ),
    );
    renderFirstLogin(makeSession());

    await fillPasswords(user, 'short', 'short');

    expect(await screen.findByTestId('first-login-error')).toHaveTextContent(
      'Kata sandi tidak memenuhi persyaratan keamanan.',
    );
  });

  it('shows the connection copy when the network fails', async () => {
    const user = userEvent.setup();
    setFirstPasswordMock.mockRejectedValue(
      new ApiError(0, 'NETWORK_ERROR', 'The request could not reach the server.'),
    );
    renderFirstLogin(makeSession());

    await fillPasswords(user, 'brand-new-pass', 'brand-new-pass');

    expect(await screen.findByTestId('first-login-error')).toHaveTextContent(
      id['auth.error.network'],
    );
  });

  it('renders the English copy when English is the stored language', () => {
    window.localStorage.setItem('lang', 'en');
    renderFirstLogin(makeSession());

    expect(
      screen.getByRole('heading', { name: 'First sign-in' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Save & continue' }),
    ).toBeInTheDocument();
  });
});
