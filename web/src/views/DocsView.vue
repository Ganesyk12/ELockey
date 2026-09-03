<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { closeDocs, state, toggleTheme } from "../state";

// Active Tab
const activeTab = ref<"overview" | "features" | "workflow" | "security" | "simulator" | "faq">("overview");

// Search Filter
const searchQuery = ref("");

// Interactive Simulator State
const simPlaintext = ref("PasswordRahasia!2026");
const simMasterKey = ref("KunciUtamaSaya#99");
const simDecryptKey = ref("KunciUtamaSaya#99");
const simSaltB64 = ref("");
const simIvB64 = ref("");
const simTagB64 = ref("");
const simCipherB64 = ref("");
const simCombined = ref("");
const simDecryptedText = ref<string | null>(null);
const simDecryptError = ref("");
const isSimulating = ref(false);

// Helper for Base64 encoding Uint8Array
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Run interactive simulation using browser Web Crypto API
async function runEncryptionSimulation() {
  if (!simPlaintext.value || !simMasterKey.value) {
    simSaltB64.value = "";
    simIvB64.value = "";
    simTagB64.value = "";
    simCipherB64.value = "";
    simCombined.value = "";
    simDecryptedText.value = null;
    return;
  }

  isSimulating.value = true;
  simDecryptError.value = "";
  simDecryptedText.value = null;

  try {
    const enc = new TextEncoder();
    // 1. Generate random Salt (16 bytes) & IV (12 bytes)
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 2. Import Master Key material
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(simMasterKey.value),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    // 3. Derive 256-bit AES-GCM Key using PBKDF2 (100,000 iterations)
    const derivedAesKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    // 4. Encrypt plaintext with AES-GCM
    const encryptedWithTag = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: 128, // 16 bytes tag
      },
      derivedAesKey,
      enc.encode(simPlaintext.value)
    );

    // AES-GCM outputs ciphertext + 16-byte auth tag at the end
    const encArray = new Uint8Array(encryptedWithTag);
    const tag = encArray.slice(encArray.length - 16);
    const ciphertext = encArray.slice(0, encArray.length - 16);

    simSaltB64.value = bufferToBase64(salt);
    simIvB64.value = bufferToBase64(iv);
    simTagB64.value = bufferToBase64(tag);
    simCipherB64.value = bufferToBase64(ciphertext);

    // Combined format: salt.iv.tag.data
    simCombined.value = `${simSaltB64.value}.${simIvB64.value}.${simTagB64.value}.${simCipherB64.value}`;
    simDecryptKey.value = simMasterKey.value;
  } catch (err) {
    console.error("Simulation error:", err);
  } finally {
    isSimulating.value = false;
  }
}

// Test decryption in simulator
async function testDecryption() {
  simDecryptError.value = "";
  simDecryptedText.value = null;

  if (!simCombined.value) {
    simDecryptError.value = "Belum ada ciphertext yang dihasilkan.";
    return;
  }

  try {
    const parts = simCombined.value.split(".");
    if (parts.length !== 4) {
      throw new Error("Format ciphertext tidak valid.");
    }

    const salt = base64ToBuffer(parts[0]);
    const iv = base64ToBuffer(parts[1]);
    const tag = base64ToBuffer(parts[2]);
    const cipher = base64ToBuffer(parts[3]);

    // Recombine cipher + tag for Web Crypto AES-GCM
    const combinedEnc = new Uint8Array(cipher.length + tag.length);
    combinedEnc.set(cipher, 0);
    combinedEnc.set(tag, cipher.length);

    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(simDecryptKey.value),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    const derivedAesKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: 128,
      },
      derivedAesKey,
      combinedEnc
    );

    simDecryptedText.value = new TextDecoder().decode(decrypted);
  } catch (err) {
    simDecryptError.value = "Gagal mendekripsi! Master key tidak cocok atau data rusak/korup.";
  }
}

// Initial simulation
runEncryptionSimulation();
watch([simPlaintext, simMasterKey], () => {
  runEncryptionSimulation();
});

// FAQ list
interface FaqItem {
  q: string;
  a: string;
  tags: string[];
}

const faqs: FaqItem[] = [
  {
    q: "Apakah administrator atau pemilik server ELockey bisa melihat password saya?",
    a: "Sama sekali tidak bisa. ELockey menerapkan arsitektur Zero-Knowledge. Setiap informasi kredensial yang masuk ke database sudah dienkripsi menjadi deretan kode acak (ciphertext). Administrator hanya melihat data acak yang tidak bermakna tanpa master key Anda.",
    tags: ["privasi", "admin", "keamanan", "database", "zero-knowledge"],
  },
  {
    q: "Apa itu Master Key dan apa bedanya dengan password akun?",
    a: "Master Key adalah satu-satunya kunci utama yang digunakan untuk mengenkripsi dan mendekripsi brankas kredensial Anda. Password login Anda diverifikasi menggunakan hash scrypt, sementara Master Key digunakan untuk menurunkan kunci cipher AES-256-GCM. Master key tidak pernah disimpan permanen di server maupun database.",
    tags: ["master key", "kunci", "password", "scrypt"],
  },
  {
    q: "Apa yang terjadi jika server atau database ELockey dibobol orang asing (hacker)?",
    a: "Bahkan jika seluruh file database dicuri, penyerang hanya mendapatkan data teracak format salt.iv.tag.data. Dengan standar AES-256-GCM dan scrypt salt acak 16-byte, mencoba menebak atau memecahkan kunci (brute-force) akan memakan waktu miliaran tahun dengan teknologi superkomputer saat ini.",
    tags: ["hacker", "bocor", "keamanan", "pembobolan", "brute-force"],
  },
  {
    q: "Bisakah saya mereset akun jika saya lupa Master Key?",
    a: "Tidak bisa. Demi integritas dan keamanan zero-knowledge sejati, tidak ada 'pintu belakang' (backdoor). Jika Master Key hilang, tidak ada pihak manapun (termasuk tim pengembang) yang dapat membuka brankas Anda. Oleh karena itu, simpan Master Key Anda di tempat yang aman.",
    tags: ["lupa", "reset", "kehilangan", "master key"],
  },
  {
    q: "Bagaimana cara kerja fitur Lock (Kunci) dan Logout?",
    a: "Saat Anda menekan tombol gembok 'Lock', Master Key yang tersimpan sementara di memori proses (RAM) seketika dihapus. Anda harus memasukkan Master Key kembali untuk membuka brankas. Sementara 'Logout' akan menghapus token otentikasi browser sekaligus mengunci brankas.",
    tags: ["lock", "logout", "kunci", "sesi", "ram"],
  },
  {
    q: "Apakah saya bisa menggunakan ELockey di ponsel / smartphone?",
    a: "Tentu saja! Tampilan ELockey dirancang responsif untuk segala ukuran layar (desktop, tablet, hingga smartphone). ELockey juga mendukung Progressive Web App (PWA) sehingga dapat diinstal ke layar utama ponsel Anda.",
    tags: ["mobile", "hp", "smartphone", "pwa", "aplikasi"],
  },
];

// Expanded FAQ items
const openFaqs = ref<Record<number, boolean>>({ 0: true });
function toggleFaq(index: number) {
  openFaqs.value[index] = !openFaqs.value[index];
}

// Filtered FAQ based on search
const filteredFaqs = computed(() => {
  if (!searchQuery.value.trim()) return faqs;
  const q = searchQuery.value.toLowerCase();
  return faqs.filter(
    (item) =>
      item.q.toLowerCase().includes(q) ||
      item.a.toLowerCase().includes(q) ||
      item.tags.some((t) => t.includes(q))
  );
});

// Copy helper
const copiedLabel = ref("");
let copyTimer: ReturnType<typeof setTimeout> | undefined;
function copySimCipher() {
  if (!simCombined.value) return;
  navigator.clipboard.writeText(simCombined.value);
  copiedLabel.value = "Tersalin ke clipboard!";
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copiedLabel.value = "";
  }, 2000);
}
</script>

<template>
  <div class="docs-container">
    <!-- Sticky Top Navigation Bar -->
    <header class="docs-navbar">
      <div class="docs-nav-content">
        <div class="docs-brand" @click="activeTab = 'overview'">
          <div class="brand-badge">
            <i class="bi bi-shield-lock-fill"></i>
          </div>
          <div class="brand-text">
            <span class="brand-name">ELockey</span>
            <span class="brand-version">Dokumentasi v1.0</span>
          </div>
        </div>

        <div class="docs-nav-actions">
          <button
            class="icon-btn"
            :title="state.theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'"
            :aria-label="state.theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'"
            @click="toggleTheme"
          >
            <i class="bi" :class="state.theme === 'dark' ? 'bi-sun' : 'bi-moon'"></i>
          </button>

          <button class="btn btn-back" @click="closeDocs">
            <i class="bi bi-arrow-left"></i>
            <span>{{ state.unlocked ? "Kembali ke Vault" : "Kembali ke Login" }}</span>
          </button>
        </div>
      </div>

      <!-- Quick Nav Tabs -->
      <nav class="docs-tabs-nav">
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'overview' }"
          @click="activeTab = 'overview'"
        >
          <i class="bi bi-info-circle"></i>
          <span>Pengenalan</span>
        </button>
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'features' }"
          @click="activeTab = 'features'"
        >
          <i class="bi bi-stars"></i>
          <span>Fitur Utama</span>
        </button>
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'workflow' }"
          @click="activeTab = 'workflow'"
        >
          <i class="bi bi-diagram-3"></i>
          <span>Cara Kerja</span>
        </button>
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'security' }"
          @click="activeTab = 'security'"
        >
          <i class="bi bi-shield-check"></i>
          <span>Arsitektur Keamanan</span>
        </button>
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'simulator' }"
          @click="activeTab = 'simulator'"
        >
          <i class="bi bi-cpu"></i>
          <span>Simulasi Enkripsi</span>
        </button>
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'faq' }"
          @click="activeTab = 'faq'"
        >
          <i class="bi bi-question-circle"></i>
          <span>Tanya Jawab (FAQ)</span>
        </button>
      </nav>
    </header>

    <!-- Main Content Area -->
    <main class="docs-main">
      <!-- 1. OVERVIEW TAB -->
      <section v-if="activeTab === 'overview'" class="tab-content fade-in">
        <div class="hero-card">
          <div class="hero-chip">
            <i class="bi bi-shield-fill-check"></i>
            <span>Zero-Knowledge Credential Vault</span>
          </div>
          <h1 class="hero-title">
            Rumah Aman untuk Semua Akun & Password Anda
          </h1>
          <p class="hero-description">
            <strong>ELockey</strong> adalah brankas kredensial modern dengan enkripsi ujung-ke-ujung (end-to-end) berbasis <strong>AES-256-GCM</strong> dan <strong>scrypt</strong>. Dirancang khusus untuk menjamin bahwa <em>hanya Anda</em> yang memiliki kunci pembuka data Anda sendiri.
          </p>
          <blockquote class="hero-quote">
            <i class="bi bi-quote"></i>
            <span>No one knows, selain pemiliknya.</span>
          </blockquote>

          <div class="hero-badges">
            <div class="badge-item">
              <i class="bi bi-lock-fill text-accent"></i>
              <div>
                <strong>Zero Plaintext</strong>
                <small>Tidak ada password mentah di database</small>
              </div>
            </div>
            <div class="badge-item">
              <i class="bi bi-key-fill text-success"></i>
              <div>
                <strong>Master Key Sovereignity</strong>
                <small>Hanya dipegang sementara di memori</small>
              </div>
            </div>
            <div class="badge-item">
              <i class="bi bi-fingerprint text-warning"></i>
              <div>
                <strong>scrypt + AES-256</strong>
                <small>Standar kriptografi kelas industri</small>
              </div>
            </div>
          </div>
        </div>

        <!-- 3 Security Pillars -->
        <h2 class="section-heading">
          <i class="bi bi-award"></i>
          3 Pilar Utama Keamanan ELockey
        </h2>
        <div class="grid-3">
          <div class="feature-card">
            <div class="feature-icon icon-blue">
              <i class="bi bi-eye-slash"></i>
            </div>
            <h3>1. Zero-Knowledge</h3>
            <p>
              Server dan pengelola sistem tidak dapat membaca isi akun Anda. Enkripsi dan dekripsi dilakukan dengan kunci yang hanya diketahui pengguna.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon icon-emerald">
              <i class="bi bi-safe"></i>
            </div>
            <h3>2. Brankas Tanpa Plaintext</h3>
            <p>
              Tiap elemen kredensial diubah menjadi format <code>salt.iv.tag.data</code>. Bahkan jika database bocor ke pihak luar, isinya hanya deretan karakter acak tak bermakna.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon icon-purple">
              <i class="bi bi-memory"></i>
            </div>
            <h3>3. Memory-Only Lifecycle</h3>
            <p>
              Kunci utama (Master Key) hanya hidup di RAM selama Anda membuka brankas (sesi <em>unlock</em>). Begitu Anda mengunci atau logout, memori seketika dibersihkan.
            </p>
          </div>
        </div>

        <!-- Quick Getting Started Summary -->
        <div class="cta-banner">
          <div class="cta-text">
            <h3>Siap mengamankan password Anda?</h3>
            <p>Buka brankas Anda sekarang atau pelajari cara kerjanya lebih mendalam.</p>
          </div>
          <div class="cta-buttons">
            <button class="btn btn-primary" @click="closeDocs">
              <i class="bi bi-box-arrow-in-right"></i>
              <span>{{ state.unlocked ? "Masuk ke Vault" : "Mulai Login" }}</span>
            </button>
            <button class="btn btn-secondary" @click="activeTab = 'workflow'">
              <i class="bi bi-diagram-3"></i>
              <span>Lihat Alur Kerja</span>
            </button>
          </div>
        </div>
      </section>

      <!-- 2. FEATURES TAB -->
      <section v-if="activeTab === 'features'" class="tab-content fade-in">
        <div class="section-header">
          <h2 class="section-title">Fitur Unggulan ELockey</h2>
          <p class="section-subtitle">Semua yang Anda butuhkan untuk mengelola kredensial dengan tenang dan nyaman.</p>
        </div>

        <div class="grid-2">
          <div class="feature-box">
            <div class="feature-box-header">
              <div class="icon-avatar bg-blue"><i class="bi bi-grid-fill"></i></div>
              <div>
                <h3>Manajemen Kredensial Multi-Akun</h3>
                <span class="tag">Organisasi Rapi</span>
              </div>
            </div>
            <p>
              Simpan dan kelompokkan akun berdasarkan nama aplikasi/layanan (misal: <em>Google, GitHub, Bank BCA, AWS, Netflix</em>). Setiap akun memiliki ruang tersendiri dengan avatar warna-warni yang mudah dikenali.
            </p>
          </div>

          <div class="feature-box">
            <div class="feature-box-header">
              <div class="icon-avatar bg-indigo"><i class="bi bi-eye"></i></div>
              <div>
                <h3>Toggle Eye (Show / Hide)</h3>
                <span class="tag">Privasi Layar</span>
              </div>
            </div>
            <p>
              Lihat password secara transparan hanya ketika Anda menginginkannya. Dilengkapi toggle ikon mata untuk mencegah <em>shoulder surfing</em> (orang lain melirik layar Anda).
            </p>
          </div>

          <div class="feature-box">
            <div class="feature-box-header">
              <div class="icon-avatar bg-emerald"><i class="bi bi-clipboard-check"></i></div>
              <div>
                <h3>Salin Sekali Klik (One-Click Copy)</h3>
                <span class="tag">Cepat & Aman</span>
              </div>
            </div>
            <p>
              Salin username atau password langsung ke clipboard tanpa perlu menyorot teks manual. Disertai notifikasi toast instan yang mengonfirmasi bahwa data berhasil disalin.
            </p>
          </div>

          <div class="feature-box">
            <div class="feature-box-header">
              <div class="icon-avatar bg-amber"><i class="bi bi-file-earmark-lock2"></i></div>
              <div>
                <h3>Catatan Terenkripsi (Encrypted Notes)</h3>
                <span class="tag">Fleksibel</span>
              </div>
            </div>
            <p>
              Bukan cuma password! Anda juga bisa menyimpan Recovery Codes 2FA, PIN ATM, pertanyaan keamanan, atau instruksi rahasia lainnya dengan tingkat enkripsi yang sama kuatnya.
            </p>
          </div>

          <div class="feature-box">
            <div class="feature-box-header">
              <div class="icon-avatar bg-cyan"><i class="bi bi-search"></i></div>
              <div>
                <h3>Pencarian Instan (Live Filter)</h3>
                <span class="tag">Responsif</span>
              </div>
            </div>
            <p>
              Cari aplikasi tertentu di antara puluhan akun dalam sekejap dengan kotak pencarian real-time tanpa perlu me-refresh halaman.
            </p>
          </div>

          <div class="feature-box">
            <div class="feature-box-header">
              <div class="icon-avatar bg-rose"><i class="bi bi-shield-lock"></i></div>
              <div>
                <h3>Kunci Instan & Proteksi Sesi</h3>
                <span class="tag">Keamanan Maksimal</span>
              </div>
            </div>
            <p>
              Tinggalkan meja Anda dengan aman. Cukup tekan tombol gembok <strong>Lock</strong> untuk langsung menghapus kunci dari memori. Sesi hanya dapat dibuka kembali dengan Master Key Anda.
            </p>
          </div>

          <div class="feature-box">
            <div class="feature-box-header">
              <div class="icon-avatar bg-orange"><i class="bi bi-moon-stars"></i></div>
              <div>
                <h3>Mode Gelap & Terang (Dark / Light Theme)</h3>
                <span class="tag">Kenyamanan Visual</span>
              </div>
            </div>
            <p>
              Pilih antara tema gelap elegan atau tema terang bersih sesuai preferensi mata dan pencahayaan ruangan Anda. Pengaturan tersimpan secara otomatis.
            </p>
          </div>

          <div class="feature-box">
            <div class="feature-box-header">
              <div class="icon-avatar bg-violet"><i class="bi bi-phone"></i></div>
              <div>
                <h3>Dukungan PWA (Progressive Web App)</h3>
                <span class="tag">Multi-Device</span>
              </div>
            </div>
            <p>
              Aplikasi dapat diinstal langsung ke desktop laptop atau home screen smartphone Anda layaknya aplikasi native tanpa memerlukan instalasi toko aplikasi yang rumit.
            </p>
          </div>
        </div>
      </section>

      <!-- 3. WORKFLOW TAB -->
      <section v-if="activeTab === 'workflow'" class="tab-content fade-in">
        <div class="section-header">
          <h2 class="section-title">Cara Kerja ELockey (Langkah demi Langkah)</h2>
          <p class="section-subtitle">Alur sederhana bagaimana data Anda dibuat, diamankan, dan dibuka kembali.</p>
        </div>

        <div class="timeline">
          <!-- Step 1 -->
          <div class="timeline-step">
            <div class="step-badge">1</div>
            <div class="step-card">
              <div class="step-header">
                <h3>Pembuatan Akun & Master Key</h3>
                <span class="status-tag">Langkah Awal</span>
              </div>
              <p>
                Saat pertama kali menggunakan ELockey, Anda membuat akun dengan sebuah <strong>Master Key</strong>. Kunci ini adalah kunci mahkota Anda.
              </p>
              <div class="alert-info">
                <i class="bi bi-info-circle-fill"></i>
                <div>
                  <strong>Penting:</strong> Server tidak menyimpan Master Key Anda. Server hanya menyimpan hash scrypt acak untuk memverifikasi kecocokan saat Anda masuk.
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="timeline-step">
            <div class="step-badge">2</div>
            <div class="step-card">
              <div class="step-header">
                <h3>Membuka Vault (Unlock)</h3>
                <span class="status-tag">Sesi Aktif</span>
              </div>
              <p>
                Setelah login, Anda diminta memasukkan Master Key untuk membuka brankas (<strong>Unlock</strong>).
              </p>
              <ul class="step-list">
                <li><i class="bi bi-check2-circle text-success"></i> Master Key disimpan secara temporer di memori proses (RAM).</li>
                <li><i class="bi bi-check2-circle text-success"></i> Kunci ini siap dipakai untuk mendekripsi data kredensial saat Anda membukanya.</li>
              </ul>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="timeline-step">
            <div class="step-badge">3</div>
            <div class="step-card">
              <div class="step-header">
                <h3>Menyimpan Kredensial Baru</h3>
                <span class="status-tag">Proses Enkripsi</span>
              </div>
              <p>
                Saat Anda memasukkan nama aplikasi, username, password, dan catatan baru:
              </p>
              <ol class="step-list numbered">
                <li>Sistem membuat <strong>Salt</strong> (16 byte) dan <strong>IV</strong> (12 byte) acak baru untuk data tersebut.</li>
                <li>Fungsi <strong>scrypt</strong> menurunkan kunci cipher 256-bit dari Master Key dan Salt.</li>
                <li>Data dienkripsi menggunakan <strong>AES-256-GCM</strong> yang menghasilkan ciphertext dan tag verifikasi (16 byte).</li>
                <li>Yang dikirim dan disimpan di database PostgreSQL hanyalah string gabungan: <code>salt.iv.tag.data</code>.</li>
              </ol>
            </div>
          </div>

          <!-- Step 4 -->
          <div class="timeline-step">
            <div class="step-badge">4</div>
            <div class="step-card">
              <div class="step-header">
                <h3>Mengunci Brankas (Lock / Logout)</h3>
                <span class="status-tag">Selesai Pakai</span>
              </div>
              <p>
                Ketika Anda selesai menggunakan aplikasi:
              </p>
              <ul class="step-list">
                <li><i class="bi bi-shield-fill-x text-danger"></i> Klik tombol gembok <strong>Lock</strong>: Master Key di memori langsung dimusnahkan.</li>
                <li><i class="bi bi-door-closed text-accent"></i> Klik <strong>Log out</strong>: Token sesi browser dibersihkan total.</li>
                <li><i class="bi bi-check2-circle text-success"></i> Brankas Anda kembali terkunci rapat dan aman dari akses tak berwenang.</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Terminal animation embed preview if available -->
        <div class="flow-card">
          <div class="flow-header">
            <i class="bi bi-terminal"></i>
            <span>Simulasi Alur Terminal (CLI / Backend)</span>
          </div>
          <div class="flow-img-wrap">
            <img src="/flow-animation.svg" alt="Animasi Alur ELockey" class="flow-svg" />
          </div>
        </div>
      </section>

      <!-- 4. SECURITY TAB -->
      <section v-if="activeTab === 'security'" class="tab-content fade-in">
        <div class="section-header">
          <h2 class="section-title">Arsitektur Keamanan & Kriptografi</h2>
          <p class="section-subtitle">Transparansi penuh bagaimana keamanan data Anda dirancang.</p>
        </div>

        <div class="grid-2">
          <div class="security-card">
            <h3><i class="bi bi-cpu-fill text-accent"></i> Algoritma Enkripsi AES-256-GCM</h3>
            <p>
              <strong>Advanced Encryption Standard (AES)</strong> dengan panjang kunci 256-bit dalam mode <strong>Galois/Counter Mode (GCM)</strong> adalah standar enkripsi terkuat yang diakui secara internasional.
            </p>
            <ul class="bullet-list">
              <li><strong>Kerahasiaan (Confidentiality):</strong> Teks sandi tidak dapat dibaca tanpa kunci dekripsi.</li>
              <li><strong>Integritas (Authenticity):</strong> Authentication Tag (16-byte) menjamin bahwa data tidak dirusak atau diubah oleh penyerang.</li>
              <li><strong>Unik per Data:</strong> Setiap field memiliki <em>Initialization Vector (IV)</em> unik sehingga dua password yang identik sekalipun akan menghasilkan ciphertext yang sama sekali berbeda.</li>
            </ul>
          </div>

          <div class="security-card">
            <h3><i class="bi bi-key-fill text-warning"></i> Key Derivation scrypt</h3>
            <p>
              Untuk mencegah serangan kamus (dictionary attack) dan pemecahan kunci menggunakan perangkat keras khusus (GPU / ASIC), ELockey menggunakan fungsi turunan kunci <strong>scrypt</strong>.
            </p>
            <ul class="bullet-list">
              <li><strong>Memory-Hard:</strong> Membutuhkan alokasi memori komputasi tinggi sehingga serangan brute-force massal menjadi sangat mahal dan tidak ekonomis.</li>
              <li><strong>Salt Unik 16-byte:</strong> Menangkal serangan tabel pelangi (rainbow table) secara total.</li>
            </ul>
          </div>
        </div>

        <!-- Data comparison table -->
        <div class="comparison-card">
          <h3>Perbandingan: Apa yang Anda Simpan vs Apa yang Ada di Server</h3>
          <div class="table-responsive">
            <table class="docs-table">
              <thead>
                <tr>
                  <th>Informasi</th>
                  <th>Yang Anda Ketahui (Plaintext)</th>
                  <th>Yang Ada di Memori Server</th>
                  <th>Yang Disimpan di Database</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Master Key</strong></td>
                  <td><code>KunciKuRahasia123!</code></td>
                  <td>Ada saat sesi Unlock aktif saja</td>
                  <td><span class="code-badge red">TIDAK PERNAH DISIMPAN</span> (Hanya scrypt hash)</td>
                </tr>
                <tr>
                  <td><strong>Username Akun</strong></td>
                  <td><code>ganz@example.com</code></td>
                  <td>Didekripsi saat diminta</td>
                  <td><code>dGVzdA==.YmxvYg==...</code> (Ciphertext)</td>
                </tr>
                <tr>
                  <td><strong>Password Akun</strong></td>
                  <td><code>P@ssw0rdSuperKuat!</code></td>
                  <td>Didekripsi saat diminta</td>
                  <td><code>salt.iv.tag.data</code> (Ciphertext AES-GCM)</td>
                </tr>
                <tr>
                  <td><strong>Catatan / Notes</strong></td>
                  <td><code>PIN Bank: 882190</code></td>
                  <td>Didekripsi saat diminta</td>
                  <td>Ciphertext terenkripsi acak</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Security Best Practices Callout -->
        <div class="warning-callout">
          <div class="callout-icon"><i class="bi bi-exclamation-triangle-fill"></i></div>
          <div class="callout-body">
            <h4>Pedoman Keamanan untuk Pengguna</h4>
            <p>
              Karena ELockey mengusung arsitektur Zero-Knowledge, <strong>kehilangan Master Key berarti kehilangan akses permanen ke brankas Anda</strong>. Pastikan Anda:
            </p>
            <ul>
              <li>Mencatat Master Key di tempat fisik yang aman atau menghafalnya dengan baik.</li>
              <li>Jangan menggunakan Master Key yang sama dengan password akun email atau media sosial Anda.</li>
              <li>Selalu klik tombol <strong>Lock</strong> jika Anda menggunakan perangkat bersama (kantor/warnet/laptop teman).</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 5. SIMULATOR TAB -->
      <section v-if="activeTab === 'simulator'" class="tab-content fade-in">
        <div class="section-header">
          <h2 class="section-title">Laboratorium Simulasi Enkripsi Interaktif</h2>
          <p class="section-subtitle">
            Coba ketik data di bawah ini untuk melihat langsung bagaimana kriptografi mengubah teks biasa menjadi format brankas <code>salt.iv.tag.data</code> secara real-time di browser Anda!
          </p>
        </div>

        <div class="simulator-card">
          <div class="sim-grid">
            <!-- Inputs -->
            <div class="sim-panel">
              <div class="panel-badge">
                <i class="bi bi-pencil-square"></i>
                <span>1. Masukan (Input Anda)</span>
              </div>

              <div class="form-group">
                <label for="sim-input-pass">Password / Teks Rahasia yang Ingin Disimpan</label>
                <input
                  id="sim-input-pass"
                  v-model="simPlaintext"
                  type="text"
                  placeholder="Ketik password apa saja..."
                />
              </div>

              <div class="form-group">
                <label for="sim-input-key">Master Key untuk Mengenkripsi</label>
                <input
                  id="sim-input-key"
                  v-model="simMasterKey"
                  type="text"
                  placeholder="Ketik Master Key simulasi..."
                />
              </div>

              <div class="sim-hint">
                <i class="bi bi-lightbulb"></i>
                <span>Coba ubah satu huruf saja pada password atau master key, dan perhatikan bagaimana seluruh ciphertext berubah total!</span>
              </div>
            </div>

            <!-- Encryption Steps breakdown -->
            <div class="sim-panel">
              <div class="panel-badge">
                <i class="bi bi-gear-wide-connected"></i>
                <span>2. Hasil Enkripsi di Database (Ciphertext)</span>
              </div>

              <div class="cipher-breakdown">
                <div class="cipher-chunk">
                  <span class="chunk-label">1. Salt (16 Byte):</span>
                  <code class="chunk-code">{{ simSaltB64 || "..." }}</code>
                </div>
                <div class="cipher-chunk">
                  <span class="chunk-label">2. IV (12 Byte):</span>
                  <code class="chunk-code">{{ simIvB64 || "..." }}</code>
                </div>
                <div class="cipher-chunk">
                  <span class="chunk-label">3. Auth Tag (16 Byte):</span>
                  <code class="chunk-code">{{ simTagB64 || "..." }}</code>
                </div>
                <div class="cipher-chunk">
                  <span class="chunk-label">4. Encrypted Data (Ciphertext):</span>
                  <code class="chunk-code highlight">{{ simCipherB64 || "..." }}</code>
                </div>
              </div>

              <div class="sim-combined-box">
                <div class="combined-header">
                  <span>Format Tersimpan di Database:</span>
                  <button class="copy-sim-btn" @click="copySimCipher">
                    <i class="bi bi-clipboard"></i> {{ copiedLabel || "Salin" }}
                  </button>
                </div>
                <div class="combined-content">{{ simCombined || "Masukkan teks untuk simulasi" }}</div>
              </div>
            </div>
          </div>

          <!-- Decryption Test Section -->
          <div class="decrypt-tester">
            <div class="panel-badge">
              <i class="bi bi-unlock-fill"></i>
              <span>3. Uji Coba Dekripsi (Membuka Kembali)</span>
            </div>
            <p class="tester-desc">
              Masukkan kunci untuk mendekripsi kembali ciphertext di atas. Coba masukkan kunci yang salah untuk melihat bagaimana sistem menolak data!
            </p>

            <div class="tester-controls">
              <div class="form-group" style="margin-bottom: 0; flex: 1">
                <input
                  v-model="simDecryptKey"
                  type="text"
                  placeholder="Masukkan Master Key untuk didekripsi..."
                />
              </div>
              <button class="btn btn-primary" style="margin-top: 0" @click="testDecryption">
                <i class="bi bi-key"></i> Buka / Dekripsi
              </button>
            </div>

            <!-- Decrypt result -->
            <div v-if="simDecryptedText !== null" class="decrypt-result success">
              <i class="bi bi-check-circle-fill"></i>
              <div>
                <strong>Berhasil Didekripsi!</strong>
                <p>Teks Asli: <code>{{ simDecryptedText }}</code></p>
              </div>
            </div>

            <div v-if="simDecryptError" class="decrypt-result error">
              <i class="bi bi-x-circle-fill"></i>
              <div>
                <strong>Dekripsi Ditolak!</strong>
                <p>{{ simDecryptError }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. FAQ TAB -->
      <section v-if="activeTab === 'faq'" class="tab-content fade-in">
        <div class="section-header">
          <h2 class="section-title">Pertanyaan yang Sering Diajukan (FAQ)</h2>
          <p class="section-subtitle">Temukan jawaban cepat untuk pertanyaan umum seputar ELockey.</p>
        </div>

        <!-- FAQ Search input -->
        <div class="search-box docs-faq-search">
          <i class="bi bi-search search-icon"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari pertanyaan (contoh: master key, hacker, reset, hp)..."
          />
        </div>

        <div v-if="filteredFaqs.length === 0" class="empty-faq">
          <i class="bi bi-emoji-neutral"></i>
          <p>Tidak ada pertanyaan yang cocok dengan "{{ searchQuery }}".</p>
        </div>

        <div class="faq-accordion">
          <div
            v-for="(item, idx) in filteredFaqs"
            :key="idx"
            class="faq-item"
            :class="{ open: openFaqs[idx] }"
          >
            <button class="faq-question" @click="toggleFaq(idx)">
              <span class="faq-title">
                <i class="bi bi-patch-question text-accent"></i>
                {{ item.q }}
              </span>
              <i class="bi" :class="openFaqs[idx] ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            </button>
            <div v-if="openFaqs[idx]" class="faq-answer">
              <p>{{ item.a }}</p>
              <div class="faq-tags">
                <span v-for="tag in item.tags" :key="tag" class="tag-badge">#{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="docs-footer">
      <div class="footer-content">
        <div class="footer-left">
          <div class="footer-logo">
            <i class="bi bi-shield-lock-fill"></i>
            <strong>ELockey Vault</strong>
          </div>
          <p>Zero-Knowledge, Military-Grade AES-256-GCM Credential Vault.</p>
        </div>
        <div class="footer-right">
          <button class="btn btn-primary" @click="closeDocs">
            <i class="bi bi-box-arrow-in-right"></i>
            <span>{{ state.unlocked ? "Kembali ke Vault" : "Mulai Gunakan ELockey" }}</span>
          </button>
        </div>
      </div>
      <div class="footer-copyright">
        &copy; 2026 ELockey. All credentials encrypted end-to-end.
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ── Layout & Root Container ── */
.docs-container {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
}

/* ── Sticky Top Navbar ── */
.docs-navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow);
  backdrop-filter: blur(12px);
}

.docs-nav-content {
  max-width: 1080px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.docs-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.brand-badge {
  width: 38px;
  height: 38px;
  background: var(--accent);
  color: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  line-height: 1.2;
}

.brand-version {
  font-size: 11px;
  color: var(--text-secondary);
}

.docs-nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

/* ── Tabs Navigation ── */
.docs-tabs-nav {
  max-width: 1080px;
  margin: 0 auto;
  padding: 4px 20px 10px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.docs-tabs-nav::-webkit-scrollbar {
  display: none;
}

.tab-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 20px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.tab-pill:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.tab-pill.active {
  color: var(--accent);
  background: var(--accent-subtle);
  border-color: var(--accent);
  font-weight: 600;
}

/* ── Main Content Container ── */
.docs-main {
  flex: 1;
  max-width: 1080px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.fade-in {
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Hero Card ── */
.hero-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 40px 32px;
  margin-bottom: 32px;
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
}

.hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  background: var(--accent-subtle);
  color: var(--accent);
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hero-title {
  font-size: 32px;
  font-weight: 800;
  line-height: 1.25;
  margin: 0 0 16px;
  letter-spacing: -0.5px;
}

.hero-description {
  font-size: 17px;
  line-height: 1.6;
  color: var(--text-secondary);
  max-width: 820px;
  margin: 0 0 20px;
}

.hero-quote {
  margin: 0 0 28px;
  padding: 12px 18px;
  border-left: 3px solid var(--accent);
  background: var(--accent-subtle);
  border-radius: 0 8px 8px 0;
  font-style: italic;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-weight: 500;
}

.hero-badges {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.badge-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--surface-hover);
  border-radius: 12px;
  border: 1px solid var(--border);
}

.badge-item i {
  font-size: 24px;
}

.badge-item strong {
  display: block;
  font-size: 14px;
}

.badge-item small {
  color: var(--text-secondary);
  font-size: 12px;
}

/* ── Section Headings ── */
.section-heading {
  font-size: 22px;
  font-weight: 700;
  margin: 36px 0 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: -0.3px;
}

.section-header {
  margin-bottom: 28px;
}

.section-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 8px;
  letter-spacing: -0.3px;
}

.section-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

/* ── Grids ── */
.grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

/* ── Feature Cards ── */
.feature-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow);
  transition: transform 0.2s, border-color 0.2s;
}

.feature-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
}

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 16px;
}

.icon-blue { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.icon-emerald { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.icon-purple { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }

.feature-card h3 {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 600;
}

.feature-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

/* ── Feature Box (Features Tab) ── */
.feature-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 22px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
}

.feature-box-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.icon-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
  flex-shrink: 0;
}

.bg-blue { background: #3b82f6; }
.bg-indigo { background: #6366f1; }
.bg-emerald { background: #10b981; }
.bg-amber { background: #f59e0b; }
.bg-cyan { background: #06b6d4; }
.bg-rose { background: #e11d48; }
.bg-orange { background: #f97316; }
.bg-violet { background: #8b5cf6; }

.feature-box-header h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
}

.tag {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--surface-hover);
  padding: 2px 8px;
  border-radius: 6px;
}

.feature-box p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

/* ── Timeline / Steps ── */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 36px;
}

.timeline-step {
  display: flex;
  gap: 16px;
}

.step-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.step-card {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  box-shadow: var(--shadow);
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.step-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.status-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--accent-subtle);
  color: var(--accent);
}

.step-card p {
  margin: 0 0 10px;
  color: var(--text-secondary);
  font-size: 14px;
}

.step-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--text);
}

.step-list.numbered {
  list-style: decimal;
  padding-left: 18px;
}

.step-list li {
  line-height: 1.5;
}

.alert-info {
  margin-top: 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--accent-subtle);
  color: var(--text);
  font-size: 13px;
}

.alert-info i {
  color: var(--accent);
  font-size: 16px;
  margin-top: 2px;
}

/* ── Flow Animation Embed Card ── */
.flow-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow);
  margin-top: 28px;
}

.flow-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-secondary);
}

.flow-img-wrap {
  width: 100%;
  overflow-x: auto;
  border-radius: 10px;
  background: #0d1117;
  padding: 10px;
  display: flex;
  justify-content: center;
}

.flow-svg {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

/* ── Security Architecture Tab ── */
.security-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.security-card h3 {
  font-size: 17px;
  font-weight: 600;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.security-card p {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 14px;
}

.bullet-list {
  margin: 0;
  padding-left: 20px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.comparison-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  margin: 28px 0;
  box-shadow: var(--shadow);
}

.comparison-card h3 {
  font-size: 17px;
  font-weight: 600;
  margin: 0 0 16px;
}

.table-responsive {
  overflow-x: auto;
}

.docs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.docs-table th, .docs-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.docs-table th {
  background: var(--surface-hover);
  font-weight: 600;
  color: var(--text);
}

.code-badge {
  font-family: monospace;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.code-badge.red {
  background: var(--delete-subtle);
  color: var(--danger);
  font-weight: 700;
}

.warning-callout {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  gap: 16px;
}

.callout-icon {
  font-size: 28px;
  color: #f59e0b;
  flex-shrink: 0;
}

.callout-body h4 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.callout-body p {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.callout-body ul {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--text);
  line-height: 1.5;
}

/* ── Interactive Simulator Tab ── */
.simulator-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 28px;
  box-shadow: var(--shadow);
}

.sim-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .sim-grid {
    grid-template-columns: 1fr;
  }
}

.sim-panel {
  display: flex;
  flex-direction: column;
}

.panel-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 16px;
}

.sim-hint {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--surface-hover);
  padding: 10px 12px;
  border-radius: 8px;
  margin-top: 12px;
}

.cipher-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.cipher-chunk {
  background: var(--surface-hover);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
}

.chunk-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.chunk-code {
  font-family: monospace;
  font-size: 12px;
  color: var(--text);
  word-break: break-all;
}

.chunk-code.highlight {
  color: var(--accent);
  font-weight: 600;
}

.sim-combined-box {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
}

.combined-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.copy-sim-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--accent);
  font-size: 11px;
  padding: 2px 8px;
  cursor: pointer;
}

.copy-sim-btn:hover {
  background: var(--accent-subtle);
}

.combined-content {
  font-family: monospace;
  font-size: 11px;
  color: var(--text);
  word-break: break-all;
  max-height: 80px;
  overflow-y: auto;
}

.decrypt-tester {
  border-top: 1px solid var(--border);
  padding-top: 24px;
}

.tester-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 14px;
}

.tester-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.decrypt-result {
  padding: 12px 16px;
  border-radius: 10px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  font-size: 13px;
  margin-top: 10px;
}

.decrypt-result.success {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: var(--text);
}

.decrypt-result.success i {
  color: var(--success);
  font-size: 18px;
}

.decrypt-result.error {
  background: var(--delete-subtle);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--text);
}

.decrypt-result.error i {
  color: var(--danger);
  font-size: 18px;
}

.decrypt-result p {
  margin: 4px 0 0;
  color: var(--text-secondary);
}

/* ── FAQ Tab ── */
.docs-faq-search {
  max-width: 600px;
  margin-bottom: 24px;
}

.faq-accordion {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: border-color 0.2s;
}

.faq-item.open {
  border-color: var(--accent);
}

.faq-question {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.faq-question:hover {
  background: var(--surface-hover);
}

.faq-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.faq-answer {
  padding: 0 20px 20px 44px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.faq-answer p {
  margin: 0 0 12px;
}

.faq-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-badge {
  font-size: 11px;
  background: var(--surface-hover);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 6px;
}

.empty-faq {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-faq i {
  font-size: 36px;
  display: block;
  margin-bottom: 8px;
}

/* ── CTA Banner ── */
.cta-banner {
  background: linear-gradient(135deg, var(--surface) 0%, var(--surface-hover) 100%);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 36px;
}

@media (max-width: 640px) {
  .cta-banner {
    flex-direction: column;
    text-align: center;
  }
}

.cta-text h3 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
}

.cta-text p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.cta-buttons {
  display: flex;
  gap: 12px;
}

/* ── Footer ── */
.docs-footer {
  border-top: 1px solid var(--border);
  background: var(--surface);
  padding: 32px 20px;
  margin-top: auto;
}

.footer-content {
  max-width: 1080px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

@media (max-width: 640px) {
  .footer-content {
    flex-direction: column;
    text-align: center;
  }
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: var(--text);
  margin-bottom: 4px;
}

.footer-left p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.footer-copyright {
  max-width: 1080px;
  margin: 0 auto;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  border-top: 1px solid var(--border);
  padding-top: 16px;
}

/* ── Utility Colors ── */
.text-accent { color: var(--accent); }
.text-success { color: var(--success); }
.text-warning { color: #f59e0b; }
.text-danger { color: var(--danger); }
</style>
