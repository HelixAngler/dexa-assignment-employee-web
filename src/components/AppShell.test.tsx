import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import AppShell, { appShellLinks } from './AppShell';

function renderShell() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/profil']}>
        <AppShell />
      </MemoryRouter>
    </I18nProvider>,
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
