/**
 * Indonesian dictionary for the employee app.
 *
 * Flat, dotted keys keep lookups cheap and make parity with `en.ts`
 * enforceable at compile time via `DictKey`.
 */
export const id = {
  // App shell / navigation
  'shell.appTitle': 'Absensi Karyawan',
  'shell.navDesktop': 'Navigasi utama',
  'shell.navMobile': 'Navigasi utama (mobile)',
  'shell.openMenu': 'Buka menu navigasi',
  'shell.closeMenu': 'Tutup menu navigasi',
  'shell.toggleLanguage': 'Ganti bahasa',
  'nav.profile': 'Profil',
  'nav.absen': 'Absen',
  'nav.summary': 'Summary',

  // Feedback states
  'state.loading.title': 'Memuat data…',
  'state.serverError.title': 'Terjadi kesalahan server',
  'state.serverError.description': 'Tidak ada data yang berubah. Silakan coba lagi.',
  'state.serverError.retry': 'Coba lagi',
  'state.accessDenied.title': 'Akses ditolak',
  'state.accessDenied.description':
    'Anda tidak memiliki izin untuk melihat halaman ini.',
  'state.accessDenied.back': 'Kembali',
  'state.empty.title': 'Belum ada data',
  'state.empty.description': 'Belum ada yang bisa ditampilkan di sini.',
  'state.success.default': 'Perubahan berhasil disimpan.',
  'state.success.dismiss': 'Tutup notifikasi',

  // Sign-in
  'login.title': 'Masuk',
  'login.emailLabel': 'Email',
  'login.passwordLabel': 'Kata sandi',
  'login.submit': 'Masuk',
  'login.error.invalid': 'Email atau kata sandi salah.',
  'login.error.attemptsRemaining': 'Sisa percobaan: {count}',
  'login.error.locked':
    'Akun dikunci setelah terlalu banyak percobaan gagal. Coba lagi nanti.',

  // Shared auth-flow errors (sign-in and forced first-password change)
  'auth.error.network': 'Koneksi gagal. Silakan coba lagi.',
  'auth.error.generic': 'Terjadi kesalahan. Silakan coba lagi.',

  // Forced first-password change
  'firstLogin.title': 'Login Pertama',
  'firstLogin.subtitle':
    'Anda harus mengganti kata sandi sementara sebelum melanjutkan.',
  'firstLogin.newPasswordLabel': 'Kata sandi baru',
  'firstLogin.confirmPasswordLabel': 'Ulangi kata sandi',
  'firstLogin.hint': 'Minimal 8 karakter.',
  'firstLogin.submit': 'Simpan & lanjut',
  'firstLogin.mismatch': 'Kata sandi tidak sama.',

  // Absen (punch) screen
  'absen.title': 'Absensi',
  'absen.todayLabel': 'Hari ini',
  'absen.status.belumMasuk': 'BELUM MASUK',
  'absen.status.bekerja': 'SEDANG BEKERJA',
  'absen.clockIn': 'Absen masuk pukul {time}',
  'absen.lastPunchLabel': 'Punch terakhir',
  'absen.direction.masuk': 'masuk',
  'absen.direction.pulang': 'pulang',
  'absen.punch.masuk': 'ABSEN MASUK',
  'absen.punch.pulang': 'ABSEN PULANG',

  // Punch feedback overlays
  'punch.conflict.alreadyIn': 'Anda sudah absen masuk.',
  'punch.conflict.noOpen': 'Tidak ada sesi absensi yang terbuka.',
  'punch.conflict.description':
    'Silakan muat ulang status absen untuk melihat data terbaru.',
  'punch.conflict.refresh': 'Muat ulang',
  'punch.network.title': 'Koneksi gagal',
  'punch.network.description': 'Tidak ada data yang hilang. Silakan coba lagi.',
  'punch.network.retry': 'Coba lagi',

  // Route fallback
  'route.notFound.title': 'Halaman tidak ditemukan',
  'route.notFound.description':
    'Alamat yang Anda buka tidak tersedia di aplikasi ini.',
  'route.notFound.back': 'Kembali ke halaman absen',
} as const;

/** Every legal translation key, derived from the complete (Indonesian) dictionary. */
export type DictKey = keyof typeof id;
