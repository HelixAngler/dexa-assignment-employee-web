import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../../i18n/id';
import { I18nProvider } from '../../i18n/provider';
import ChangePhonePage from './ChangePhonePage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const sampleProfile = {
  name: 'Dewi Lestari',
  email: 'dewi@corp.test',
  position: 'Engineer',
  phone: '0812000000',
  photoUrl: '/api/identity/profile/photo',
};

function LocationProbe() {
  const location = useLocation();
  return (
    <div>
      <span data-testid="location-path">{location.pathname}</span>
      <span data-testid="location-state">{JSON.stringify(location.state ?? null)}</span>
    </div>
  );
}

function renderPhone() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/profil/telepon']}>
        <LocationProbe />
        <ChangePhonePage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('ChangePhonePage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Serves GET /profile, and answers PATCH /profile with `patch` when given. */
  function mockProfile(patch?: () => Promise<Response>) {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return patch ? patch() : Promise.resolve(jsonResponse({}));
      }
      return Promise.resolve(jsonResponse(sampleProfile));
    });
  }

  function patchCalls() {
    return fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
    );
  }

  async function loadedPhoneField() {
    const input = await screen.findByLabelText(id['profile.phoneLabel']);
    expect(input).toHaveValue(sampleProfile.phone);
    return input;
  }

  /** Asserts the exact address the router currently shows (no prefix matches). */
  function expectPath(path: string) {
    expect(screen.getByTestId('location-path')).toHaveTextContent(
      new RegExp(`^${path}$`),
    );
  }

  it('shows the loading state while the profile is in flight', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    renderPhone();

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/identity/profile');
  });

  it('offers a retry when the profile cannot be loaded', async () => {
    const user = userEvent.setup();
    let calls = 0;
    fetchMock.mockImplementation(() => {
      calls += 1;
      if (calls === 1) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      return Promise.resolve(jsonResponse(sampleProfile));
    });

    renderPhone();

    expect(await screen.findByTestId('server-error-state')).toBeInTheDocument();

    await user.click(screen.getByTestId('retry-button'));

    expect(await screen.findByLabelText(id['profile.phoneLabel'])).toHaveValue(
      sampleProfile.phone,
    );
  });

  it('prefills the current phone number before anything is edited', async () => {
    mockProfile();

    renderPhone();

    await loadedPhoneField();
    expect(patchCalls()).toHaveLength(0);
  });

  it('shows an inline length error before submit and sends no request', async () => {
    const user = userEvent.setup();
    mockProfile();

    renderPhone();
    const input = await loadedPhoneField();

    await user.clear(input);
    await user.type(input, '1234');

    expect(await screen.findByTestId('phone-error')).toHaveTextContent(
      id['profile.phone.tooShort'],
    );
    expect(patchCalls()).toHaveLength(0);
  });

  it('shows an inline character error for illegal characters', async () => {
    const user = userEvent.setup();
    mockProfile();

    renderPhone();
    const input = await loadedPhoneField();

    await user.clear(input);
    await user.type(input, 'call-me');

    expect(await screen.findByTestId('phone-error')).toHaveTextContent(
      id['profile.phone.invalidChars'],
    );
    expect(patchCalls()).toHaveLength(0);
  });

  it('requires a number when the field is emptied and saved', async () => {
    const user = userEvent.setup();
    mockProfile();

    renderPhone();
    const input = await loadedPhoneField();

    await user.clear(input);
    await user.click(screen.getByRole('button', { name: id['common.save'] }));

    expect(await screen.findByTestId('phone-error')).toHaveTextContent(
      id['profile.phone.required'],
    );
    expect(patchCalls()).toHaveLength(0);
    expect(screen.getByTestId('location-path')).toHaveTextContent('/profil/telepon');
  });

  it('saves a valid number and returns to Profil with success feedback', async () => {
    const user = userEvent.setup();
    mockProfile();

    renderPhone();
    const input = await loadedPhoneField();

    await user.clear(input);
    await user.type(input, '0812-3456-7890');
    await user.click(screen.getByRole('button', { name: id['common.save'] }));

    await waitFor(() => expectPath('/profil'));
    expect(screen.getByTestId('location-state')).toHaveTextContent('"flash":"phone"');

    const patches = patchCalls();
    expect(patches).toHaveLength(1);
    const [, init] = patches[0] as [string, RequestInit];
    expect(init.body).toBe(JSON.stringify({ phone: '0812-3456-7890' }));
  });

  it('surfaces the server PHONE_INVALID message without leaving the page', async () => {
    const user = userEvent.setup();
    mockProfile(() =>
      Promise.resolve(
        jsonResponse(
          {
            statusCode: 400,
            code: 'PHONE_INVALID',
            message: 'Nomor telepon ditolak server.',
          },
          400,
        ),
      ),
    );

    renderPhone();
    const input = await loadedPhoneField();

    await user.clear(input);
    await user.type(input, '081234567890');
    await user.click(screen.getByRole('button', { name: id['common.save'] }));

    expect(await screen.findByTestId('phone-error')).toHaveTextContent(
      'Nomor telepon ditolak server.',
    );
    expect(screen.getByTestId('location-path')).toHaveTextContent('/profil/telepon');
  });

  it('falls back to the local invalid copy when the server sends no message', async () => {
    const user = userEvent.setup();
    mockProfile(() =>
      Promise.resolve(
        jsonResponse({ statusCode: 400, code: 'PHONE_INVALID', message: '' }, 400),
      ),
    );

    renderPhone();
    const input = await loadedPhoneField();

    await user.clear(input);
    await user.type(input, '081234567890');
    await user.click(screen.getByRole('button', { name: id['common.save'] }));

    expect(await screen.findByTestId('phone-error')).toHaveTextContent(
      id['profile.phone.serverInvalid'],
    );
  });

  it('reports the connection copy when the save cannot reach the server', async () => {
    const user = userEvent.setup();
    mockProfile(() => Promise.reject(new TypeError('Failed to fetch')));

    renderPhone();
    const input = await loadedPhoneField();

    await user.clear(input);
    await user.type(input, '081234567890');
    await user.click(screen.getByRole('button', { name: id['common.save'] }));

    expect(await screen.findByTestId('phone-error')).toHaveTextContent(
      id['auth.error.network'],
    );
    expect(screen.getByTestId('location-path')).toHaveTextContent('/profil/telepon');
  });

  it('cancels back to Profil without touching the server', async () => {
    const user = userEvent.setup();
    mockProfile();

    renderPhone();
    await loadedPhoneField();

    await user.click(screen.getByRole('button', { name: id['common.cancel'] }));

    await waitFor(() => expectPath('/profil'));
    expect(patchCalls()).toHaveLength(0);
  });
});
