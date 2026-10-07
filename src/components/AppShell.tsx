import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import type { DictKey } from '../i18n/id';
import { LanguageToggle, useI18n } from '../i18n/provider';

/** Navigation targets; labels are resolved through the i18n dictionary. */
export const appShellLinks: readonly { to: string; labelKey: DictKey }[] = [
  { to: '/profil', labelKey: 'nav.profile' },
  { to: '/absen', labelKey: 'nav.absen' },
  { to: '/summary', labelKey: 'nav.summary' },
];

function linkClassName({ isActive }: { isActive: boolean }) {
  return [
    'flex min-h-[44px] items-center px-3 text-sm font-medium transition-colors',
    isActive ? 'text-blue-700' : 'text-gray-600 hover:text-blue-700',
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <nav
          data-testid="nav-desktop"
          aria-label={t('shell.navDesktop')}
          className="mx-auto hidden max-w-5xl items-center gap-1 px-4 md:flex"
        >
          <span className="mr-4 py-3 text-base font-semibold">
            {t('shell.appTitle')}
          </span>
          {appShellLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClassName}>
              {t(link.labelKey)}
            </NavLink>
          ))}
          <LanguageToggle />
        </nav>

        <div className="flex items-center justify-between px-4 md:hidden">
          <span className="py-3 text-base font-semibold">
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
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-2xl leading-none text-gray-700 hover:bg-gray-100"
            >
              <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="mobile-nav-menu"
            data-testid="nav-mobile-menu"
            aria-label={t('shell.navMobile')}
            className="flex flex-col border-t border-gray-200 bg-white md:hidden"
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
