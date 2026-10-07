import type { DictKey } from './id';

/**
 * English dictionary for the employee app.
 *
 * `Record<DictKey, string>` makes both parity failures compile errors:
 * a missing key fails assignment, an unknown key is an excess property.
 */
export const en: Record<DictKey, string> = {
  // App shell / navigation
  'shell.appTitle': 'Employee Attendance',
  'shell.navDesktop': 'Main navigation',
  'shell.navMobile': 'Main navigation (mobile)',
  'shell.openMenu': 'Open navigation menu',
  'shell.closeMenu': 'Close navigation menu',
  'shell.toggleLanguage': 'Switch language',
  'nav.profile': 'Profile',
  'nav.absen': 'Attendance',
  'nav.summary': 'Summary',

  // Feedback states
  'state.loading.title': 'Loading data…',
  'state.serverError.title': 'Server error',
  'state.serverError.description': 'No data was changed. Please try again.',
  'state.serverError.retry': 'Retry',
  'state.accessDenied.title': 'Access denied',
  'state.accessDenied.description':
    'You do not have permission to view this page.',
  'state.accessDenied.back': 'Back',
  'state.empty.title': 'No data yet',
  'state.empty.description': 'There is nothing to show here yet.',
  'state.success.default': 'Changes saved successfully.',
  'state.success.dismiss': 'Dismiss notification',
};
