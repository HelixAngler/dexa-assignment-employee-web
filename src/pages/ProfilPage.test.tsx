import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import ProfilPage from './ProfilPage';

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

function renderProfil(state?: Record<string, unknown>) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[{ pathname: '/profil', state }]}>
        <ProfilPage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('ProfilPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the loading state while GET /profile is in flight', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    renderProfil();

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/identity/profile');
  });

  it('renders the read-only identity fields with their labels', async () => {
    fetchMock.mockResolvedValue(jsonResponse(sampleProfile));

    renderProfil();

    expect(await screen.findByText(sampleProfile.name)).toBeInTheDocument();
    expect(screen.getByText(sampleProfile.email)).toBeInTheDocument();
    expect(screen.getByText(sampleProfile.position)).toBeInTheDocument();
    expect(screen.getByText(id['profile.nameLabel'])).toBeInTheDocument();
    expect(screen.getByText(id['profile.emailLabel'])).toBeInTheDocument();
    expect(screen.getByText(id['profile.positionLabel'])).toBeInTheDocument();
    expect(screen.getByTestId('profil-phone')).toHaveTextContent(
      sampleProfile.phone,
    );
    expect(screen.getByTestId('profil-password')).toHaveTextContent(
      id['profile.password.masked'],
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders the photo from the serve route', async () => {
    fetchMock.mockResolvedValue(jsonResponse(sampleProfile));

    renderProfil();

    const photo = await screen.findByRole('img', { name: id['profile.photo.alt'] });
    expect(photo).toHaveAttribute('src', '/api/identity/profile/photo');
    expect(screen.queryByTestId('profile-photo-placeholder')).not.toBeInTheDocument();
  });

  it('falls back to the placeholder when the profile has no photo', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...sampleProfile, photoUrl: null }));

    renderProfil();

    expect(await screen.findByTestId('profile-photo-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-photo')).not.toBeInTheDocument();
  });

  it('gives every editable field its own 44px edit affordance', async () => {
    fetchMock.mockResolvedValue(jsonResponse(sampleProfile));

    renderProfil();
    await screen.findByText(sampleProfile.name);

    const affordances: [string, string][] = [
      [id['profile.photo.edit'], '/profil/foto'],
      [id['profile.phone.edit'], '/profil/telepon'],
      [id['profile.password.edit'], '/profil/kata-sandi'],
    ];
    for (const [name, href] of affordances) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('href', href);
      expect(link.className).toContain('min-h-[44px]');
      expect(link.className).toContain('min-w-[44px]');
    }
    expect(screen.getAllByRole('link')).toHaveLength(affordances.length);
  });

  it('offers a retry when the profile load fails', async () => {
    const user = userEvent.setup();
    let calls = 0;
    fetchMock.mockImplementation(() => {
      calls += 1;
      if (calls === 1) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      return Promise.resolve(jsonResponse(sampleProfile));
    });

    renderProfil();

    expect(await screen.findByTestId('server-error-state')).toBeInTheDocument();

    await user.click(screen.getByTestId('retry-button'));

    expect(await screen.findByText(sampleProfile.name)).toBeInTheDocument();
  });

  it('greets a return from a saved change with the matching success toast', async () => {
    fetchMock.mockResolvedValue(jsonResponse(sampleProfile));

    renderProfil({ flash: 'phone' });

    expect(await screen.findByTestId('success-toast')).toHaveTextContent(
      id['profile.flash.phone'],
    );
  });

  it('renders the English copy when English is the stored language', async () => {
    window.localStorage.setItem('lang', 'en');
    fetchMock.mockResolvedValue(jsonResponse(sampleProfile));

    renderProfil();

    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });
});
