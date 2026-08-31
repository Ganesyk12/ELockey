# ELockey — Architecture Overview

> Ringkasan arsitektur aplikasi **ELockey**: password vault (brankas kredensial)
> di mana data terenkripsi (AES-256-GCM) disimpan di server, dan master key
> hanya dipegang di memori selama sesi dibuka (unlock).

---

## 1. Ringkasan

ELockey adalah **backend-only** aplikasi penyimpanan kredensial per aplikasi
(*appsource*). Pengguna membuat akun dengan sebuah *master key*. Master key ini
dipakai untuk:

1. Menandatangani sesi login (hash scrypt disimpan di database), dan
2. **Mengenkripsi/mendekripsi semua field kredensial** (username, password,
   notes) sebelum/setelah menyentuh database.

Server hanya menyimpan **ciphertext** + salt/iv/tag. Master key mentah tidak
pernah ditulis ke database atau disk; ia hidup di memori proses server selama
sesi `unlock`.

---

## 2. Tech Stack

| Layer        | Teknologi                                                        |
|--------------|------------------------------------------------------------------|
| Runtime      | Bun (ESM, `bun` sebagai runner)                                  |
| Web          | Express 5                                                        |
| Data access  | Prisma ORM 7 classic (`@prisma/client` + `@prisma/adapter-pg`)
| Database     | PostgreSQL ≥ 15 (schema fisik `elockey`)                          |
| Config       | `dotenv` (file `.env`)                                           |
| Container    | Docker (`oven/bun:1`), orchestration `docker-compose`             |

---

## 3. Arsitektur Tingkat Tinggi

```
                 Browser / CLI client (HTTP + Bearer token)
                                   │
                                   ▼
        ┌───────────────────────────────────────────┐
        │  Express app  (express.json)              │
        │                                           │
        │  /api            → authRouter             │
        │    /status /register /login /setKey       │
        │    /unlock /lock                          │
        │  /api/entries    → entriesRouter          │
        │    (requireLogin → requireUnlocked)       │
        └──────────────┬────────────────────────────┘
                       │
         ┌─────────────▼─────────────┐         ┌──────────────────┐
         │    session.ts  (Map)      │         │  config/crypto   │
         │  token → { userId,        │         │  AES-256-GCM     │
         │   username, masterKey }   │         │  scrypt KDF      │
         └─────────────┬─────────────┘         └────────▲─────────┘
                       │                                │ encrypt/decrypt
                       ▼                                │
        ┌────────────────────────────────────┐          │
        │  prisma/db.ts  (Prisma ORM 7)      │──────────┘
        │  PrismaClient + PrismaPg adapter   │
        │  schema ← DATABASE_URL `?schema=`  │
        └────────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  PostgreSQL     │
              │  user           │
              │  vault          │
              │  vaultField     │
              └─────────────────┘
```

---

## 4. Struktur Direktori

```
src/
├── server.ts               # Entry point: koneksi DB → listen (default 0.0.0.0:5655)
├── app.ts                  # Instance Express, mount router, error handler 500
├── express.d.ts            # Augment Express.Request (token, session, userId, ...)
├── middleware.ts           # extractToken · requireLogin · requireUnlocked
├── session.ts              # Store sesi in-memory (Map token → Session)
├── routes/
│   ├── auth.ts             # /api/auth & /api/setKey|/unlock|/lock, /api/status
│   └── entries.ts          # CRUD /api/entries (semua butuh login + unlock)
├── controllers/
│   └── entries.ts          # Logika list/get/create/update/delete (transactional)
├── config/
│   └── crypto.ts           # Enkripsi AES-256-GCM, hashing master key (scrypt)
├── prisma/
│   └── db.ts               # PrismaClient + adapter PrismaPg; schema dari `?schema=`
├── generated/
│   └── prisma/             # Hasil `prisma generate` (gitignored)
prisma/
└── schema.prisma           # Model User / Vault / VaultField (datasource polos)
scripts/
└── guard.ts                # Stamp verifikasi sebelum start (`guard.json`)
```

---

## 5. Data Model (`prisma/schema.prisma`)

```
User ── 1:N ── Vault ── 1:N ── VaultField
```

| Model      | Kolom penting                                              | Keterangan                          |
|------------|------------------------------------------------------------|-------------------------------------|
| `User`     | `id` (uuid PK), `username` (unique), `password`            | `password` = `salt.hash` scrypt master key |
|            | `masterSalt`, `masterHash`                                 | Hash master key untuk `unlock`      |
| `Vault`    | `id`, `userId` (FK → User, cascade), `appsource`           | Satu vault per (user, appsource) — unique |
| `VaultField`| `id`, `vaultId` (FK → Vault, cascade), `fieldKey`, `salt`  | Satu field terenkripsi per vault    |
|            | `iv`, `tag`, `data`                                       | blob ciphertext AES-256-GCM          |

Relasi `onDelete: Cascade` menjamin penghapusan user menghapus vault dan
seluruh field-nya. Kontrak ber-tiga kolom API (`salt/iv/tag/data`) karena
runtime **tidak** menyimpan key; metadata KDF & autentikasi dibutuhkan untuk
dekripsi nanti.

---

## 6. Keamanan & Kriptografi (`src/config/crypto.ts`)

### Alur master key

```
Register / setKey / unlock
  └─ hashMasterKey(password)  → scrypt(key, salt16, 64B) → simpan salt.hash
Unlock                       → setMasterKey(token, masterKey)  # hanya di RAM
Encrypt field                → deriveKey(masterKey, salt16) → scrypt → 32B AES key
```

- **KDF:** `scrypt` — pembentukan key cipher simetris (32 byte) per-field dengan
  salt acak per field (16 byte). Hash master key = 64 byte.
- **Cipher:** `aes-256-gcm` — iv 12 byte, auth tag 16 byte. GCM memberi
  authenticated encryption (bisa deteksi data korup/rusak).
- **Format penyimpanan field:** `salt.iv.tag.data` (base64, dipisah titik) —
  `payloadToStored()` / `storedToPayload()`.
- **Verifikasi login:** `timingSafeEqual` untuk mencegah timing attack.

### Properti keamanan

- Kompromi database ≠ membuka data tanpa master key (ciphertext + salt/acak).
- Master key tidak pernah login ke disk/persistensi.
- Jika salah master key saat `get` → seluruh field gagal didekripsi → `401`.

---

## 7. Lapisan API

### Middleware chain `entries`

```
GET|POST /api/entries...  →  requireLogin  →  requireUnlocked
                                 │                  │
                          ekstrak Bearer token,  masterKey dari session,
                          attach req.userId       attach req.masterKey
                     (401 kalau token invalid)   (401 kalau vault terkunci)
```

| Endpoint                  | Middleware             | Fungsi                                   |
|---------------------------|------------------------|------------------------------------------|
| `GET  /api/status`        | –                      | `setup: true/false` (ada user belum)     |
| `POST /api/register`      | –                      | Buat user (hash master key → `password`) |
| `POST /api/login`         | –                      | Verifikasi → buat token sesi             |
| `POST /api/setKey`        | `requireLogin`         | Simpan hash master key baru              |
| `POST /api/unlock`        | `requireLogin`         | Simpan master key di sesi (RAM)          |
| `POST /api/lock`          | `requireLogin`         | Hapus master key dari sesi               |
| `GET  /api/entries`       | login + unlocked       | Daftar vault (meta, tanpa field enkripsi)|
| `GET  /api/entries/:id`   | login + unlocked       | Satu vault, field didekripsi             |
| `POST /api/entries`       | login + unlocked       | Buat vault + field terenkripsi (tx)      |
| `PUT  /api/entries/:id`   | login + unlocked       | Update appsource/field (tx)              |
| `DELETE /api/entries/:id` | login + unlocked       | Hapus vault (cascade field)              |

Operasi multi-tulis (`create`, `update`) dibungkus `db.transaction` agar
konsisten.

---

## 8. Session (`src/session.ts`)

Sesi disimpan dalam **Map in-memory** (tidak persist):

```ts
interface Session { userId; username; masterKey?: string }
```

- `login` → `createSession(token, {userId, username})`
- `unlock` → `setMasterKey(token, masterKey)` — master key ada di memori server
- `lock` → `unsetMasterKey(token)`
- Tidak ada TTL/expiry token; restart proses = semua sesi hilang.

---

## 9. Prisma ORM (classic) — Layer Data

- Skema hidup di `prisma/schema.prisma` (Prisma ORM 7) sebagai datasource polos.
  **Nama schema fisik tidak di-hardcode**: dipilih via `?schema=` pada
  `DATABASE_URL` di `.env`, sehingga cukup ganti env untuk berpindah
  schema/lokasi:
  - **CLI** (`bun run db:push`) membaca `?schema=` dan membuat tabel ke schema
    tersebut.
  - **Runtime** (`src/prisma/db.ts`) membaca `?schema=` lalu meneruskannya ke
    opsi `schema` pada adapter `@prisma/adapter-pg` (PrismaPg) — query yang
    digenerate menarget schema yang sama.
  Tanpa `?schema=` → default `public`.
- `bun run db:generate` → `prisma generate` menulis client TypeScript ke
  `src/generated/prisma` (gitignored; di Docker di-generate saat build).
- `src/prisma/db.ts` membangun `PrismaClient` dengan driver adapter
  `@prisma/adapter-pg` (PrismaPg). Query memakai API classic:
  `db.user.findUnique(...)`, `db.vault.findMany(...)`,
  `db.$transaction(async (tx) => ...)`.
- **Tidak memakai migration files.** Struktur DB disinkronkan dengan
  `bun run db:push` (`prisma db push`) — additive: menambahkan tabel,
  constraint, dan index yang belum ada tanpa drop data.

---

## 10. Deployment (Docker)

- **Dockerfile:** multi-stage (`oven/bun:1`) — `bun install --frozen-lockfile`,
  lalu `bun run prisma generate` saat build; runtime berjalan non-root
  (`USER 1000:1000`) menjalankan `bun scripts/guard.ts --deployed &&
  bun src/server.ts`.
- **docker-compose.yml:** satu service `app`, `env_file: .env`, network
  `tunnel` (external), tanpa publish port (dibalik nginx). `DATABASE_URL`
  dipakai langsung; schema ditentukan oleh `?schema=` di `DATABASE_URL`.

---

## 11. Catatan & Batasan Saat Ini

- **Session in-memory** — tidak bertahan antar restart, tidak terdistribusi
  (tidak cocok multi-instance).
- **Token statis** — tidak ada expiry, refresh, atau revoke yang persisten.
- **Enkripsi di server** — master key dikirim ke server untuk dekripsi.
  Peningkatan yang mungkin: enkripsi **client-side (WebCrypto)** agar master
  key tidak pernah meninggalkan browser.
- **Belum ada test otomatis**.
- Struktur schema `elockey` disinkronkan via `bun run db:push`; tidak ada
  history migration.