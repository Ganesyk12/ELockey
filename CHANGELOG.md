# Changelog

Semua perubahan penting pada proyek **ELockey** akan didokumentasikan di file ini.

Format changelog ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.1.0/)
dan proyek ini menerapkan [Semantic Versioning](https://semver.org/lang/id/).

---

## [Unreleased] - Rencana Phase 2

### Added
- Generator password otomatis dengan opsi panjang karakter, simbol, dan passphrase Diceware.
- Fitur Import & Export kredensial (format CSV Chrome, Bitwarden, dan backup JSON terenkripsi).
- Authenticator TOTP / 2FA 6-digit langsung di dalam item vault dengan countdown timer 30 detik.
- Audit keamanan brankas (Vault Health) untuk mendeteksi password lemah, duplikat, dan bocor (HIBP k-Anonymity).
- Favicon / logo aplikasi otomatis berdasarkan URL atau appsource.
- Auto-lock timer saat aplikasi tidak aktif (*inactivity timeout*).

---

## [1.1.0] - 2026-09-07

### Added
- **Tampilan Changelog In-App**: Halaman riwayat rilis interaktif dengan filter kategori (*Features*, *Improvements*, *Fixes*, *Security*), pencarian perubahan, dan timeline rilis.
- **Dokumentasi Interaktif**: Tab panduan lengkap dengan *Live Encryption Simulator* menggunakan browser Web Crypto API untuk mendemonstrasikan KDF dan AES-256-GCM secara visual.
- **Toggle Visibilitas Password**: Tombol lihat/sembunyikan password pada form login, unlock, dan pembuatan entri kredensial.
- Deep linking URL hash untuk navigasi langsung ke dokumentasi (`#docs`) dan changelog (`#changelog`).

### Changed
- Penyempurnaan tata letak (layout) UI agar lebih responsif di desktop, tablet, maupun layar smartphone.
- Pembaruan label tombol navigasi dan ikon aksi agar lebih intuitif dan mudah dipahami.
- Optimalisasi tema gelap (*dark mode*) dan terang (*light mode*) dengan kontras warna yang lebih nyaman.

### Security
- Validasi sanitasi input dan penyesuaian CSP (*Content Security Policy*) di middleware Helmet.

---

## [1.0.1] - 2026-09-03

### Changed
- Perbaikan kejelasan ikon tombol dan teks label pada navigasi vault.
- Penyempurnaan alur unlock dan pesan kesalahan autentikasi yang lebih informatif.

### Fixed
- Optimalisasi Docker image runtime Bun untuk menyertakan paket `openssl` guna stabilitas koneksi kriptografi dan database.
- Perbaikan typo path aset gambar pada dokumentasi.

---

## [1.0.0] - 2026-08-31

### Added
- **Peluncuran MVP Phase 1 ELockey**: Brankas kredensial berarsitektur *Zero-Plaintext Storage*.
- **Enkripsi AES-256-GCM**: Setiap kredensial (username, password, notes) dienkripsi secara independen dengan kunci KDF `scrypt` serta salt & IV acak per-entry.
- **Backend RESTful API**: API backend untuk registrasi, login, unlock sesi terisolasi, dan operasi CRUD kredensial.
- **Data Layer Database Relasional**: Integrasi PostgreSQL dengan skema relasional `User` -> `Vault` -> `VaultField`.
- **Sistem Keamanan Berlapis**: Middleware keamanan menggunakan proteksi rate limiting, CORS, dan security headers untuk proteksi brute force.
- **Frontend SPA & PWA**: Antarmuka web responsif dengan tema dinamis, pencarian cepat, salin satu klik ke clipboard, dan kesiapan PWA.
