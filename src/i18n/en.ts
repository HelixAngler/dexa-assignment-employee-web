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

  // Sign-in
  'login.title': 'Sign in',
  'login.emailLabel': 'Email',
  'login.passwordLabel': 'Password',
  'login.submit': 'Sign in',
  'login.error.invalid': 'Email or password is incorrect.',
  'login.error.attemptsRemaining': 'Attempts remaining: {count}',
  'login.error.locked':
    'Account locked after too many failed attempts. Try again later.',

  // Shared auth-flow errors (sign-in and forced first-password change)
  'auth.error.network': 'Connection failed. Please try again.',
  'auth.error.generic': 'Something went wrong. Please try again.',

  // Forced first-password change
  'firstLogin.title': 'First sign-in',
  'firstLogin.subtitle': 'You must replace the temporary password before continuing.',
  'firstLogin.newPasswordLabel': 'New password',
  'firstLogin.confirmPasswordLabel': 'Repeat password',
  'firstLogin.hint': 'At least 8 characters.',
  'firstLogin.submit': 'Save & continue',
  'firstLogin.mismatch': 'Passwords do not match.',

  // Absen (punch) screen
  'absen.title': 'Attendance',
  'absen.todayLabel': 'Today',
  'absen.status.belumMasuk': 'NOT YET CLOCKED IN',
  'absen.status.bekerja': 'CURRENTLY WORKING',
  'absen.clockIn': 'Clocked in at {time}',
  'absen.lastPunchLabel': 'Last punch',
  'absen.direction.masuk': 'in',
  'absen.direction.pulang': 'out',
  'absen.punch.masuk': 'CLOCK IN',
  'absen.punch.pulang': 'CLOCK OUT',

  // Punch feedback overlays
  'punch.conflict.alreadyIn': 'You have already clocked in.',
  'punch.conflict.noOpen': 'There is no open attendance session.',
  'punch.conflict.description':
    'Refresh your attendance status to see the latest data.',
  'punch.conflict.refresh': 'Refresh',
  'punch.network.title': 'Connection failed',
  'punch.network.description': 'No data was lost. Please try again.',
  'punch.network.retry': 'Try again',

  // Route fallback
  'route.notFound.title': 'Page not found',
  'route.notFound.description':
    'The address you opened does not exist in this app.',
  'route.notFound.back': 'Back to the attendance page',
};
