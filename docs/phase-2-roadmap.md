# ELockey — Roadmap & Rencana Phase 2

> Dokumen perencanaan teknis dan daftar fitur untuk pengembangan **ELockey Phase 2**.
> Fokus utama: meningkatkan kenyamanan penggunaan harian (*frictionless UX*), utilitas serba-ada (*all-in-one security*), serta daya tarik adopsi bagi pengguna umum dan kalangan developer.

---

## 1. Sasaran & Visi Phase 2

Pada **MVP Phase 1**, ELockey telah berhasil membuktikan fondasi arsitektur:
* Penyimpanan kredensial *Zero-Knowledge* dengan enkripsi simetris **AES-256-GCM**.
* Penurunan kunci dinamis via **scrypt KDF** dengan salt & IV unik 16-byte per-entri.
* Backend bertenaga Bun + Express 5, data layer PostgreSQL via Prisma ORM 7, serta SPA Vue 3 responsif.

Tantangan utama di **Phase 2** adalah **adopsi dan retensi pengguna**:
1. **Mengeliminasi hambatan migrasi:** Pengguna tidak perlu mengetik ulang ratusan akun secara manual.
2. **Menjadi alat keamanan harian:** Tidak sekadar menyimpan password, tetapi membantu membuat, mengaudit, dan mengotentikasi akun (TOTP/2FA).
3. **Meningkatkan kredibilitas & rasa aman:** Menyediakan mekanisme audit kebocoran dan perlindungan otomatis saat aplikasi ditinggalkan.

---

## 2. Rincian Fitur Phase 2 (Pilar Pengembangan)

### 🚀 Pilar 1: Kemudahan Onboarding & Penggunaan Harian (*Frictionless Daily Use*)

| Fitur | Deskripsi | Kebutuhan Teknis / Komponen |
|---|---|---|
| **1. Import & Export Kredensial** | Pengguna dapat mengimpor data password dari browser (Google Chrome, Edge) atau pengelola password lain (Bitwarden, 1Password, format CSV standar). Serta mengekspor cadangan terenkripsi (JSON) maupun plain CSV. | • CSV Parser di browser.<br>• Batch encryption & batch insert endpoint.<br>• Validasi skema impor. |
| **2. Generator Password & Passphrase** | Alat pembuat kata sandi kuat yang dapat disesuaikan langsung dari modal input atau toolbar. Mendukung dua mode: *Random String* (panjang 8–64 karakter, simbol, angka, huruf) dan *Passphrase Diceware* (gabungan kata acak yang mudah dihafal manusia, misal: `kuda-kopi-roket-99`). | • Web Crypto API `getRandomValues()`.<br>• Indikator kekuatan password (skor entropi/zxcvbn).<br>• Modal generator inline. |
| **3. Auto Favicon / App Brand Icons** | Tampilan visual entri vault secara otomatis menampilkan ikon/logo asli layanan (Google, GitHub, Spotify, Tokopedia, dll) berdasarkan teks `appsource` atau domain URL. | • Resolusi ikon via layanan privasi ramah cache (seperti DuckDuckGo Favicon Service).<br>• Fallback avatar inisial warna-warni jika ikon gagal dimuat. |
| **4. Auto-Lock on Inactivity & Tab Blur** | Brankas otomatis terkunci dan sesi memori dibersihkan jika pengguna tidak berinteraksi selama durasi tertentu (misal: 5, 15, atau 30 menit) atau ketika tab browser ditutup/pindah layar. | • Idle detector listener (`mousemove`, `keydown`, `visibilitychange`).<br>• Pengaturan preferensi timeout di UI.<br>• Eksekusi otomatis `api.lock()`. |

---

### 🛡️ Pilar 2: Keamanan Lanjutan & Audit (*Trust & Peace of Mind*)

| Fitur | Deskripsi | Kebutuhan Teknis / Komponen |
|---|---|---|
| **1. Built-in TOTP / 2FA Authenticator** | Entri vault dapat menyimpan secret 2FA (`otpauth://` URI atau base32 secret). Menampilkan kode 6-digit yang berganti otomatis setiap 30 detik dengan indikator lingkaran mundur. Pengguna tidak perlu aplikasi authenticator pihak ketiga lagi. | • Library TOTP/HMAC-SHA1 ringan di client.<br>• Kolom terenkripsi baru `totpSecret` pada model `VaultField`.<br>• Tombol salin sekali klik untuk OTP. |
| **2. Vault Health & Leak Audit (HIBP)** | Dashboard ringkasan kesehatan brankas yang menganalisis:<br>1. Password lemah (< 10 karakter atau entropi rendah).<br>2. Password yang digunakan berulang kali (*reused*).<br>3. Pengecekan kebocoran internet menggunakan API HaveIBeenPwned. | • Integrasi HIBP Passwords API dengan metode **k-Anonymity** (hanya mengirim 5 karakter pertama SHA-1 hash; password asli tetap 100% rahasia dan aman).<br>• Kalkulator Vault Health Score (0–100%). |
| **3. Emergency Recovery Kit (Printable PDF)** | Lembar fisik darurat berformat PDF yang dibuat saat registrasi/pengaturan master key. Berisi informasi akun, QR code identitas, instruksi pemulihan, dan ruang fisik bagi pengguna untuk mencatat master key mereka secara offline. | • Generator PDF client-side (misal: `pdf-lib` atau template cetak CSS).<br>• Memberikan rasa aman psikologis terhadap risiko lupa master key. |
| **4. Transisi Client-Side Zero-Knowledge (WebCrypto v2)** | Memindahkan seluruh proses enkripsi dan dekripsi AES-256-GCM ke browser (Web Crypto API). Server PostgreSQL murni hanya menerima ciphertext, tanpa pernah memegang master key walau hanya di memori RAM proses. | • Refactor alur enkripsi dari backend `crypto.ts` ke client `web/src/crypto/`.<br>• Backend bertindak sebagai *dumb storage* terautentikasi token JWT. |

---

### ⚡ Pilar 3: Produktivitas & Kalangan Pengembang (*Power Users & Devs*)

| Fitur | Deskripsi | Kebutuhan Teknis / Komponen |
|---|---|---|
| **1. Command Palette (`Ctrl + K` / `Cmd + K`)** | Modal pencarian cepat bergaya Spotlight/Raycast untuk navigasi keyboard instan: cari akun, langsung salin password (`Enter`), salin username (`Ctrl+U`), atau kunci brankas (`Ctrl+L`). | • Komponen UI overlay keyboard listener.<br>• Fuzzy search untuk pencarian appsource instan. |
| **2. Kategori Item Fleksibel** | Brankas tidak lagi terbatas hanya pada *Login*. Mendukung tipe entri beragam:<br>• **Logins:** Username, Password, URL, TOTP.<br>• **Secure Notes:** Catatan rahasia dengan rendering Markdown.<br>• **Developer Secrets:** API Keys, SSH Private Keys, Environment variables (`.env`).<br>• **Payment Cards:** Informasi kartu bank (nomor, expiry, CVV). | • Kolom `category` pada model `Vault`.<br>• Tampilan form dinamis sesuai kategori yang dipilih. |
| **3. ELockey CLI Client (Bun-powered)** | Tool terminal baris perintah bagi developer untuk mengambil kredensial tanpa membuka browser: `elockey get github --copy`. | • Script CLI berekstensi Bun yang berkomunikasi dengan API backend menggunakan Bearer token. |

---

### 🎁 Pilar 4: Fitur Viral & Kolaborasi (*Secure Sharing*)

| Fitur | Deskripsi | Kebutuhan Teknis / Komponen |
|---|---|---|
| **1. ELockey Send (*One-Time Secret Sharing*)** | Fitur berbagi teks/password rahasia ke rekan via tautan aman sekali buka (*burn-after-reading*) atau berbatas waktu kadaluarsa (1 jam s/d 7 hari). Setelah tautan dibuka, data otomatis terhapus dari server. | • Tabel baru `Send` di PostgreSQL dengan kolom expiration dan view count limit.<br>• Enkripsi client-side dengan kunci acak yang disertakan pada URL hash anchor (`#key`), sehingga server tidak bisa membaca isi rahasia. |

---

## 3. Rencana Tahapan Eksekusi (Sprint Plan)

Untuk memastikan implementasi berjalan terarah, pengembangan Phase 2 dibagi menjadi 3 Sprint:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Sprint 2.1: Quick Wins & Frictionless Daily UX                          │
│ ├─ Password & Passphrase Generator (Modal & Inline)                     │
│ ├─ Auto Favicon / Logo brand entri vault                                │
│ └─ Auto-lock timer saat aplikasi idle (inactivity timeout)              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Sprint 2.2: Interoperabilitas & Autentikasi All-in-One                  │
│ ├─ Import & Export (CSV Chrome, Bitwarden, Backup JSON Terenkripsi)     │
│ └─ Built-in 2FA / TOTP Authenticator (Live 30s countdown & copy)        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Sprint 2.3: Security Audit & Power Features                             │
│ ├─ Vault Health & Audit Kebocoran (HIBP k-Anonymity)                    │
│ ├─ Command Palette (Ctrl + K)                                           │
│ ├─ Kategori Entri (Secure Notes & API Secrets)                          │
│ └─ Emergency Recovery Kit PDF                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Rincian Teknis Schema Database (Prisma) yang Direncanakan

Penyesuaian skema database untuk mendukung fitur Phase 2:

```prisma
// Kategori entri vault
enum VaultCategory {
  LOGIN
  SECURE_NOTE
  API_SECRET
  PAYMENT_CARD
}

model Vault {
  id         String        @id @default(uuid())
  userId     String
  user       User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  appsource  String
  category   VaultCategory @default(LOGIN)
  url        String?
  fields     VaultField[]
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  @@unique([userId, appsource])
}

// Model untuk ELockey Send (One-time secret sharing)
model SecretShare {
  id           String    @id @default(uuid())
  ciphertext   String
  salt         String
  iv           String
  tag          String
  maxViews     Int       @default(1)
  currentViews Int       @default(0)
  expiresAt    DateTime
  createdAt    DateTime  @default(now())
}
```

---

## 5. Kesimpulan & Manfaat bagi Pengguna

Dengan selesainya seluruh pembaruan pada Phase 2:
1. **ELockey berubah dari penyimpan sandi sederhana menjadi asisten keamanan lengkap.**
2. **Tidak ada hambatan migrasi pengguna baru** berkat fitur impor 1-klik dari Chrome maupun Bitwarden.
3. **Pengguna mendapatkan fitur premium (seperti TOTP Authenticator & Audit Kebocoran) secara gratis dan open-source.**
4. **Prinsip Zero-Knowledge tetap terjaga 100%**, menjamin tidak ada pihak ketiga yang dapat mengintip brankas pengguna.
