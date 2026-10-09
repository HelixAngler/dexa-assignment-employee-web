import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import AppShell from '../../src/components/AppShell';
import { en } from '../../src/i18n/en';
import { id } from '../../src/i18n/id';
import { I18nProvider } from '../../src/i18n/provider';

/** The three destinations the phone menu must offer, per interface language. */
const MENU_ITEMS = {
  id: ['Profil', 'Absen', 'Summary'],
  en: ['Profile', 'Attendance', 'Summary'],
} as const;

function renderShell() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/profil']}>
        <AppShell />
      </MemoryRouter>
    </I18nProvider>,
  );
}

/** Opens the phone menu through its hamburger button and returns it. */
async function openHamburgerMenu(
  user: ReturnType<typeof userEvent.setup>,
  openLabel: string,
) {
  expect(screen.queryByTestId('nav-mobile-menu')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: openLabel }));

  return screen.getByTestId('nav-mobile-menu');
}

function menuLabels(menu: HTMLElement): string[] {
  return within(menu)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '');
}

describe('hamburger menu', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('opens showing exactly the three items Profil, Absen and Summary', async () => {
    const user = userEvent.setup();
    renderShell();

    const menu = await openHamburgerMenu(user, id['shell.openMenu']);

    expect(menuLabels(menu)).toEqual(MENU_ITEMS.id);
    expect(within(menu).getAllByRole('link')).toHaveLength(3);
  });

  it('opens showing exactly the three items Profile, Attendance and Summary in English', async () => {
    window.localStorage.setItem('lang', 'en');
    const user = userEvent.setup();
    renderShell();

    const menu = await openHamburgerMenu(user, en['shell.openMenu']);

    expect(menuLabels(menu)).toEqual(MENU_ITEMS.en);
    expect(within(menu).getAllByRole('link')).toHaveLength(3);
  });

  it('keeps the menu closed again once the close control is used', async () => {
    const user = userEvent.setup();
    renderShell();

    await openHamburgerMenu(user, id['shell.openMenu']);
    await user.click(screen.getByRole('button', { name: id['shell.closeMenu'] }));

    expect(screen.queryByTestId('nav-mobile-menu')).not.toBeInTheDocument();
  });
});
