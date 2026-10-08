import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../../i18n/id';
import { I18nProvider } from '../../i18n/provider';
import ChangePasswordPage from './ChangePasswordPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function LocationProbe() {
  const location = useLocation();
  return (
    <div>
      <span data-testid="location-path">{location.pathname}</span>
      <span data-testid="location-state">{JSON.stringify(location.state ?? null)}</span>
    </div>
  );
}

function renderPassword() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/profil/kata-sandi']}>
        <LocationProbe />
        <ChangePasswordPage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('ChangePasswordPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function expectPath(path: string) {
    expect(screen.getByTestId('location-path')).toHaveTextContent(
      new RegExp(`^${path}$`),
    );
  }

  async function fillAndSubmit(
    user: ReturnType<typeof userEvent.setup>,
    current: string,
    next: string,
    confirm: string,
  ) {
    const type = async (name: string, text: string) => {
      if (text !== '') {
        await user.type(screen.getByLabelText(name), text);
      }
    };
    await type(id['profile.password.currentLabel'], current);
    await type(id['profile.password.newLabel'], next);
    await type(id['profile.password.confirmLabel'], confirm);
    await user.click(screen.getByRole('button', { name: id['common.save'] }));
  }

  it('states the password rules next to the new field and the session note', () => {
    renderPassword();

    expect(
      screen.getByRole('heading', { name: id['profile.password.title'] }),
    ).toBeInTheDocument();
    const rules = screen.getByTestId('password-rules');
    expect(rules).toHaveTextContent(id['profile.password.hint.min']);
    expect(rules).toHaveTextContent(id['profile.password.hint.printable']);
    expect(rules).toHaveTextContent(id['profile.password.hint.avoidCommon']);
    expect(screen.getByLabelText(id['profile.password.newLabel'])).toHaveAttribute(
      'aria-describedby',
      'password-rules',
    );
    expect(screen.getByTestId('password-note')).toHaveTextContent(
      id['profile.password.note'],
    );
  });

  it('blocks a mismatched confirmation before any request is made', async () => {
    const user = userEvent.setup();
    renderPassword();

    await fillAndSubmit(user, 'old-secret-1', 'brand-new-pass', 'different-pass');

    expect(await screen.findByTestId('password-error')).toHaveTextContent(
      id['profile.password.mismatch'],
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expectPath('/profil/kata-sandi');
  });

  it('blocks a new password that is shorter than the minimum', async () => {
    const user = userEvent.setup();
    renderPassword();

    await fillAndSubmit(user, 'old-secret-1', 'short', 'short');

    expect(await screen.findByTestId('password-error')).toHaveTextContent(
      id['profile.password.error.tooShort'],
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires the current password before anything else is checked', async () => {
    const user = userEvent.setup();
    renderPassword();

    await fillAndSubmit(user, '', 'brand-new-pass', 'brand-new-pass');

    expect(await screen.findByTestId('password-error')).toHaveTextContent(
      id['profile.password.error.currentRequired'],
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the change and returns to Profil with success feedback', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    renderPassword();

    await fillAndSubmit(user, 'old-secret-1', 'brand-new-pass', 'brand-new-pass');

    await waitFor(() => expectPath('/profil'));
    expect(screen.getByTestId('location-state')).toHaveTextContent(
      '"flash":"password"',
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/identity/auth/password/change');
    expect(JSON.parse(init.body as string)).toEqual({
      currentPassword: 'old-secret-1',
      newPassword: 'brand-new-pass',
    });
  });

  it('shows the server PASSWORD_WEAK message without leaving the page', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          statusCode: 400,
          code: 'PASSWORD_WEAK',
          message: 'Kata sandi ini tercantum dalam daftar kata sandi bocor.',
        },
        400,
      ),
    );
    renderPassword();

    await fillAndSubmit(user, 'old-secret-1', 'brand-new-pass', 'brand-new-pass');

    expect(await screen.findByTestId('password-error')).toHaveTextContent(
      'Kata sandi ini tercantum dalam daftar kata sandi bocor.',
    );
    expectPath('/profil/kata-sandi');
  });

  it('reports a wrong current password with the local copy when the server sends none', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 401, code: 'AUTH_INVALID', message: '' }, 401),
    );
    renderPassword();

    await fillAndSubmit(user, 'wrong-one', 'brand-new-pass', 'brand-new-pass');

    expect(await screen.findByTestId('password-error')).toHaveTextContent(
      id['profile.password.error.currentWrong'],
    );
    expectPath('/profil/kata-sandi');
  });

  it('reports the connection copy when the server is unreachable', async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPassword();

    await fillAndSubmit(user, 'old-secret-1', 'brand-new-pass', 'brand-new-pass');

    expect(await screen.findByTestId('password-error')).toHaveTextContent(
      id['auth.error.network'],
    );
    expectPath('/profil/kata-sandi');
  });
});
