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
  'state.accessDenied.signOut': 'Keluar',
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
  'absen.flash.masuk': 'Absen masuk tercatat.',
  'absen.flash.pulang': 'Absen pulang tercatat.',

  // Punch feedback overlays
  'punch.conflict.alreadyIn': 'Anda sudah absen masuk.',
  'punch.conflict.noOpen': 'Tidak ada sesi absensi yang terbuka.',
  'punch.conflict.description':
    'Silakan muat ulang status absen untuk melihat data terbaru.',
  'punch.conflict.refresh': 'Muat ulang',
  'punch.network.title': 'Koneksi gagal',
  'punch.network.description': 'Tidak ada data yang hilang. Silakan coba lagi.',
  'punch.network.retry': 'Coba lagi',

  // Summary (attendance history)
  'summary.title': 'Summary Kehadiran',
  'summary.filter.fromLabel': 'Dari tanggal',
  'summary.filter.toLabel': 'Sampai tanggal',
  'summary.filter.search': 'Cari',
  'summary.filter.reset': 'Atur ulang',
  'summary.filter.rangeInvalid': 'Tanggal "Dari" tidak boleh setelah tanggal "Sampai".',
  'summary.table.date': 'Tanggal',
  'summary.table.masuk': 'Masuk',
  'summary.table.pulang': 'Pulang',
  'summary.row.stillWorking': '(masih bekerja)',
  'summary.row.systemClosed': 'ditutup sistem',
  'summary.row.noData': 'tidak ada data',
  'summary.empty.title': 'Tidak ada absensi pada rentang ini',
  'summary.empty.description':
    'Belum ada absensi tercatat untuk rentang tanggal yang dipilih. Silakan pilih rentang lain.',

  // Common actions
  'common.save': 'Simpan',
  'common.cancel': 'Batal',

  // Profile (self-service)
  'profile.title': 'Profil Saya',
  'profile.nameLabel': 'Nama',
  'profile.emailLabel': 'Email kantor',
  'profile.positionLabel': 'Posisi',
  'profile.phoneLabel': 'Telepon',
  'profile.passwordLabel': 'Kata sandi',
  'profile.password.masked': '••••••••',
  'profile.photo.alt': 'Foto profil',
  'profile.photo.edit': 'Ubah foto profil',
  'profile.phone.edit': 'Ubah nomor telepon',
  'profile.password.edit': 'Ubah kata sandi',
  'profile.flash.phone': 'Nomor telepon berhasil diperbarui.',
  'profile.flash.photo': 'Foto profil berhasil diperbarui.',
  'profile.flash.password': 'Kata sandi berhasil diperbarui.',

  // Profile → phone change screen
  'profile.phone.title': 'Ubah Nomor Telepon',
  'profile.phone.hint': 'Minimal 8 digit; hanya boleh berisi angka, +, dan -.',
  'profile.phone.required': 'Nomor telepon wajib diisi.',
  'profile.phone.invalidChars': 'Nomor telepon hanya boleh berisi angka, +, dan -.',
  'profile.phone.tooShort': 'Nomor telepon minimal 8 digit.',
  'profile.phone.serverInvalid': 'Nomor telepon tidak valid.',

  // Profile → photo change screen
  'profile.photo.title': 'Ubah Foto Profil',
  'profile.photo.hint': 'Format JPG atau PNG, ukuran maksimal 2 MB.',
  'profile.photo.choose': 'Pilih foto',
  'profile.photo.uploading': 'Mengunggah foto…',
  'profile.photo.error.type': 'Foto harus berformat JPG atau PNG.',
  'profile.photo.error.size': 'Ukuran foto maksimal 2 MB.',

  // Profile → password change screen
  'profile.password.title': 'Ubah Kata Sandi',
  'profile.password.currentLabel': 'Kata sandi saat ini',
  'profile.password.newLabel': 'Kata sandi baru',
  'profile.password.confirmLabel': 'Ulangi kata sandi baru',
  'profile.password.hint.min': 'Minimal 8 karakter.',
  'profile.password.hint.printable': 'Semua karakter yang dapat dicetak diperbolehkan.',
  'profile.password.hint.avoidCommon': 'Hindari kata sandi yang sering dipakai.',
  'profile.password.note':
    'Sesi Anda di perangkat ini tetap aktif; perangkat lain akan keluar otomatis.',
  'profile.password.mismatch': 'Kata sandi baru tidak sama.',
  'profile.password.error.currentRequired': 'Masukkan kata sandi saat ini.',
  'profile.password.error.tooShort': 'Kata sandi baru minimal 8 karakter.',
  'profile.password.error.weak': 'Kata sandi tidak memenuhi persyaratan keamanan.',
  'profile.password.error.currentWrong': 'Kata sandi saat ini salah.',

  // Route fallback
  'route.notFound.title': 'Halaman tidak ditemukan',
  'route.notFound.description':
    'Alamat yang Anda buka tidak tersedia di aplikasi ini.',
  'route.notFound.back': 'Kembali ke halaman absen',
} as const;

/** Every legal translation key, derived from the complete (Indonesian) dictionary. */
export type DictKey = keyof typeof id;
