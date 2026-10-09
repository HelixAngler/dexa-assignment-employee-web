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
  'state.accessDenied.signOut': 'Sign out',
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
  'absen.flash.masuk': 'Clock-in recorded.',
  'absen.flash.pulang': 'Clock-out recorded.',

  // Punch feedback overlays
  'punch.conflict.alreadyIn': 'You have already clocked in.',
  'punch.conflict.noOpen': 'There is no open attendance session.',
  'punch.conflict.description':
    'Refresh your attendance status to see the latest data.',
  'punch.conflict.refresh': 'Refresh',
  'punch.network.title': 'Connection failed',
  'punch.network.description': 'No data was lost. Please try again.',
  'punch.network.retry': 'Try again',

  // Summary (attendance history)
  'summary.title': 'Attendance Summary',
  'summary.filter.fromLabel': 'From date',
  'summary.filter.toLabel': 'To date',
  'summary.filter.search': 'Search',
  'summary.filter.reset': 'Reset',
  'summary.filter.rangeInvalid': 'The From date must not be after the To date.',
  'summary.table.date': 'Date',
  'summary.table.masuk': 'Clock in',
  'summary.table.pulang': 'Clock out',
  'summary.row.stillWorking': '(still working)',
  'summary.row.systemClosed': 'closed by system',
  'summary.row.noData': 'no data',
  'summary.empty.title': 'No attendance in this range',
  'summary.empty.description':
    'No attendance was recorded for the selected date range. Please pick another range.',

  // Common actions
  'common.save': 'Save',
  'common.cancel': 'Cancel',

  // Profile (self-service)
  'profile.title': 'My Profile',
  'profile.nameLabel': 'Name',
  'profile.emailLabel': 'Company email',
  'profile.positionLabel': 'Position',
  'profile.phoneLabel': 'Phone',
  'profile.passwordLabel': 'Password',
  'profile.password.masked': '••••••••',
  'profile.photo.alt': 'Profile photo',
  'profile.photo.edit': 'Change profile photo',
  'profile.phone.edit': 'Change phone number',
  'profile.password.edit': 'Change password',
  'profile.flash.phone': 'Phone number updated.',
  'profile.flash.photo': 'Profile photo updated.',
  'profile.flash.password': 'Password updated.',

  // Profile → phone change screen
  'profile.phone.title': 'Change Phone Number',
  'profile.phone.hint': 'At least 8 digits; digits, + and - only.',
  'profile.phone.required': 'A phone number is required.',
  'profile.phone.invalidChars': 'Phone numbers may only contain digits, + and -.',
  'profile.phone.tooShort': 'Phone numbers need at least 8 digits.',
  'profile.phone.serverInvalid': 'The phone number is not valid.',

  // Profile → photo change screen
  'profile.photo.title': 'Change Profile Photo',
  'profile.photo.hint': 'JPG or PNG, up to 2 MB.',
  'profile.photo.choose': 'Choose a photo',
  'profile.photo.uploading': 'Uploading photo…',
  'profile.photo.error.type': 'The photo must be a JPG or PNG.',
  'profile.photo.error.size': 'The photo may be at most 2 MB.',

  // Profile → password change screen
  'profile.password.title': 'Change Password',
  'profile.password.currentLabel': 'Current password',
  'profile.password.newLabel': 'New password',
  'profile.password.confirmLabel': 'Repeat new password',
  'profile.password.hint.min': 'At least 8 characters.',
  'profile.password.hint.printable': 'Any printable characters are allowed.',
  'profile.password.hint.avoidCommon': 'Avoid commonly used passwords.',
  'profile.password.note':
    'This session stays signed in on this device; other devices are signed out automatically.',
  'profile.password.mismatch': 'The new passwords do not match.',
  'profile.password.error.currentRequired': 'Enter your current password.',
  'profile.password.error.tooShort': 'The new password needs at least 8 characters.',
  'profile.password.error.weak': 'The password does not meet the security requirements.',
  'profile.password.error.currentWrong': 'The current password is incorrect.',

  // Route fallback
  'route.notFound.title': 'Page not found',
  'route.notFound.description':
    'The address you opened does not exist in this app.',
  'route.notFound.back': 'Back to the attendance page',
};
