import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CloseIcon, HamburgerIcon } from './icons';
import type { DictKey } from '../i18n/id';
import { LanguageToggle, useI18n } from '../i18n/provider';

/** Navigation targets; labels are resolved through the i18n dictionary. */
export const appShellLinks: readonly { to: string; labelKey: DictKey }[] = [
  { to: '/profil', labelKey: 'nav.profile' },
  { to: '/absen', labelKey: 'nav.absen' },
  { to: '/summary', labelKey: 'nav.summary' },
];

/** One nav item: 44 px target, subtle hover, primary-tinted active state. */
function linkClassName({ isActive }: { isActive: boolean }) {
  return [
    'inline-flex min-h-[44px] items-center rounded-[var(--radius-sm)] px-3 transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]',
    isActive
      ? 'bg-[var(--color-primary-subtle)] font-semibold text-[var(--color-primary)] shadow-[inset_0_-2px_0_var(--color-primary)]'
      : 'font-medium text-[var(--color-text)] hover:bg-[var(--color-page)] hover:text-[var(--color-primary)]',
  ].join(' ');
}

/**
 * App chrome: top navigation plus the routed page content.
 * Desktop shows a horizontal link row; smaller screens get a hamburger that
 * toggles a vertical menu. Every control keeps a 44px touch target.
 */
export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <nav
          data-testid="nav-desktop"
          aria-label={t('shell.navDesktop')}
          className="mx-auto hidden max-w-5xl items-center gap-3 px-4 py-2 md:flex"
        >
          <span
            title={t('shell.appTitle')}
            className="mr-auto min-w-0 truncate whitespace-nowrap text-lg font-bold leading-7 text-[var(--color-text-strong)]"
          >
            {t('shell.appTitle')}
          </span>
          {appShellLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClassName}>
              {t(link.labelKey)}
            </NavLink>
          ))}
          <LanguageToggle />
        </nav>

        <div className="flex items-center justify-between gap-3 px-3 py-2 md:hidden">
          <span
            title={t('shell.appTitle')}
            className="min-w-0 truncate text-base font-bold leading-6 text-[var(--color-text-strong)]"
          >
            {t('shell.appTitle')}
          </span>
          <div className="flex items-center">
            <LanguageToggle />
            <button
              type="button"
              aria-label={
                menuOpen ? t('shell.closeMenu') : t('shell.openMenu')
              }
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-page)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              {menuOpen ? <CloseIcon size={20} /> : <HamburgerIcon size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="mobile-nav-menu"
            data-testid="nav-mobile-menu"
            aria-label={t('shell.navMobile')}
            className="flex flex-col gap-1 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--shadow-raised)] md:hidden"
          >
            {appShellLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={linkClassName}
                onClick={() => setMenuOpen(false)}
              >
                {t(link.labelKey)}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
