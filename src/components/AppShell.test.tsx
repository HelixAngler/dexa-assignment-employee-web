import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import { SessionContext, type SessionValue } from '../services/session';
import AppShell, { appShellLinks } from './AppShell';

function makeSession(logout = vi.fn()): SessionValue {
  return {
    session: { role: 'employee', mustChangePassword: false },
    status: 'authed',
    refresh: vi.fn(),
    login: vi.fn(),
    logout,
  };
}

function renderShell(logout = vi.fn()) {
  return render(
    <SessionContext.Provider value={makeSession(logout)}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/profil']}>
          <AppShell />
        </MemoryRouter>
      </I18nProvider>
    </SessionContext.Provider>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the three main navigation links', () => {
    renderShell();

    const desktopNav = screen.getByTestId('nav-desktop');
    for (const link of appShellLinks) {
      expect(
        within(desktopNav).getByRole('link', { name: id[link.labelKey] }),
      ).toBeInTheDocument();
    }
  });

  it('renders the hamburger button and toggles the mobile menu with it', async () => {
    const user = userEvent.setup();
    renderShell();

    const hamburger = screen.getByRole('button', { name: id['shell.openMenu'] });
    expect(screen.queryByTestId('nav-mobile-menu')).not.toBeInTheDocument();

    await user.click(hamburger);

    const menu = screen.getByTestId('nav-mobile-menu');
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    for (const link of appShellLinks) {
      expect(
        within(menu).getByRole('link', { name: id[link.labelKey] }),
      ).toBeInTheDocument();
    }

    await user.click(
      screen.getByRole('button', { name: id['shell.closeMenu'] }),
    );
    expect(screen.queryByTestId('nav-mobile-menu')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: id['shell.openMenu'] }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders the shell copy in Indonesian by default', () => {
    renderShell();

    expect(screen.getAllByText(id['shell.appTitle']).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(id['shell.navDesktop'])).toBeInTheDocument();
  });

  it('offers sign out in both the desktop row and the mobile header', () => {
    renderShell();

    const buttons = screen.getAllByTestId('shell-sign-out');
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toHaveTextContent(id['state.accessDenied.signOut']);
    }
    const desktopNav = screen.getByTestId('nav-desktop');
    expect(
      within(desktopNav).getByTestId('shell-sign-out'),
    ).toBeInTheDocument();
  });

  it('hands the sign-out request to the session', async () => {
    const user = userEvent.setup();
    const logout = vi.fn().mockResolvedValue(undefined);
    renderShell(logout);

    await user.click(screen.getAllByTestId('shell-sign-out')[0]);

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('switches all shell copy to English via the language toggle', async () => {
    const user = userEvent.setup();
    renderShell();

    const toggles = screen.getAllByTestId('lang-toggle');
    expect(toggles.length).toBeGreaterThan(0);

    await user.click(toggles[0]);

    expect(screen.getAllByText('Employee Attendance').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Attendance' })).toHaveLength(1);
    expect(window.localStorage.getItem('lang')).toBe('en');
  });
});
