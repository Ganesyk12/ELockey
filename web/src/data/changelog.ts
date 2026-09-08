export type ChangeType = "feat" | "improve" | "fix" | "security" | "docs";

export interface ChangeItem {
  type: ChangeType;
  title: string;
  description?: string;
  scope?: string;
}

export interface ReleaseItem {
  version: string;
  date: string;
  tag: string;
  badgeType: "primary" | "success" | "warning" | "info";
  summary: string;
  highlights: string[];
  changes: ChangeItem[];
}

export const releases: ReleaseItem[] = [
  {
    version: "1.1.0",
    date: "7 September 2026",
    tag: "Versi Terbaru",
    badgeType: "primary",
    summary:
      "Penyempurnaan menyeluruh fase MVP: penambahan tampilan Changelog interaktif, simulasi enkripsi live berbasis Web Crypto API di dokumentasi, fitur visibilitas password, serta pemolesan tata letak UI di perangkat bergerak.",
    highlights: [
      "In-App Changelog View",
      "Live Crypto Simulator",
      "Password Toggle",
      "UI & Mobile Polish",
    ],
    changes: [
      {
        type: "feat",
        scope: "Changelog",
        title: "Tampilan Changelog In-App Interaktif",
        description:
          "Menyediakan halaman riwayat pembaruan dengan filter kategori (Fitur, Peningkatan, Bug, Keamanan) dan pencarian instan.",
      },
      {
        type: "feat",
        scope: "Dokumentasi",
        title: "Simulator Enkripsi & Dekripsi Live (Web Crypto API)",
        description:
          "Eksplorasi visual langsung di browser untuk melihat bagaimana Plaintext diubah menjadi format salt.iv.tag.data secara authenticated.",
      },
      {
        type: "feat",
        scope: "Auth & Vault",
        title: "Tombol Visibilitas Password (Show/Hide)",
        description:
          "Mempermudah pengguna memverifikasi password dan master key yang diketikkan sebelum submit.",
      },
      {
        type: "improve",
        scope: "UI / UX",
        title: "Penyempurnaan Navigasi dan Label Tombol",
        description:
          "Ikon dan teks navigasi diperbarui agar alur beralih antara Vault, Dokumentasi, dan Changelog lebih intuitif.",
      },
      {
        type: "improve",
        scope: "Responsivitas",
        title: "Optimalisasi Layout Desktop & Mobile",
        description:
          "Sidebar, card entri vault, dan tata letak dokumentasi kini lebih adaptif pada berbagai resolusi layar.",
      },
      {
        type: "security",
        scope: "Security",
        title: "Penyesuaian Middleware Keamanan & Sanitasi",
        description:
          "Pembaruan header CSP (Content Security Policy) dan rate-limiting untuk perlindungan brute-force.",
      },
      {
        type: "docs",
        scope: "Dokumentasi",
        title: "Penyempurnaan Diagram Arsitektur & FAQ",
        description:
          "Penambahan penjelasan mendalam seputar zero-plaintext database storage, scrypt KDF, dan mitigasi kehilangan master key.",
      },
    ],
  },
  {
    version: "1.0.1",
    date: "3 September 2026",
    tag: "Maintenance",
    badgeType: "warning",
    summary:
      "Pembaruan infrastruktur container untuk keandalan modul kriptografi, perbaikan label aksi pada antarmuka pengguna, dan penyesuaian aset flow diagram.",
    highlights: [
      "Crypto Runtime Fix",
      "Container Hardening",
      "UX Label Polish",
    ],
    changes: [
      {
        type: "fix",
        scope: "Runtime",
        title: "Peningkatan Stabilitas Modul Kriptografi",
        description:
          "Memastikan seluruh modul kriptografi dan koneksi TLS database berjalan stabil dan terisolasi di lingkungan container.",
      },
      {
        type: "improve",
        scope: "Navigasi",
        title: "Perbaikan Kejelasan Ikon dan Label Tombol",
        description:
          "Memperjelas aksi Lock, Logout, dan Pengaturan agar alur interaksi lebih intuitif bagi pengguna.",
      },
      {
        type: "docs",
        scope: "Aset",
        title: "Koreksi Path Aset Diagram Alur",
        description:
          "Memperbaiki referensi file diagram alur pada berkas dokumentasi aplikasi.",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "31 Agustus 2026",
    tag: "MVP Phase 1",
    badgeType: "success",
    summary:
      "Rilis perdana ELockey sebagai aplikasi brankas kredensial pribadi dengan arsitektur zero-plaintext storage berbasis enkripsi AES-256-GCM.",
    highlights: [
      "Zero-Plaintext Storage",
      "AES-256-GCM Encryption",
      "RESTful API Backend",
      "Relational Database Vault",
    ],
    changes: [
      {
        type: "feat",
        scope: "Core",
        title: "Penyimpanan Kredensial Zero-Plaintext",
        description:
          "Username, password, dan catatan aplikasi dienkripsi secara independen sebelum disimpan di database server.",
      },
      {
        type: "feat",
        scope: "Kriptografi",
        title: "Enkripsi AES-256-GCM dengan scrypt KDF",
        description:
          "Setiap field memiliki salt 16-byte dan IV 12-byte acak; verifikasi hash master key memakai perbandingan waktu konstan (timingSafeEqual).",
      },
      {
        type: "feat",
        scope: "Backend",
        title: "Layanan RESTful API Backend",
        description:
          "Menyediakan endpoint registrasi akun, unlock sesi ke memori terisolasi, dan manajemen CRUD entri kredensial.",
      },
      {
        type: "feat",
        scope: "Database",
        title: "Integrasi Skema Database Relasional",
        description:
          "Model data User, Vault, dan VaultField dengan relasi cascade delete untuk pembersihan menyeluruh saat entri dihapus.",
      },
      {
        type: "security",
        scope: "Keamanan",
        title: "Proteksi Rate Limiting, CORS, dan Security Headers",
        description:
          "Membatasi upaya serangan brute-force pada endpoint autentikasi dan menerapkan header proteksi web standar industri.",
      },
      {
        type: "feat",
        scope: "Frontend",
        title: "Antarmuka SPA Web & Kesiapan PWA",
        description:
          "Fitur pencarian instan, salin kredensial sekali klik, dukungan tema gelap/terang, dan instalasi PWA di berbagai perangkat.",
      },
    ],
  },
];
