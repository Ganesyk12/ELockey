<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { closeDocs, state, type DocsTab } from "../state";
import { releases, type ChangeType } from "../data/changelog";

// Dynamic Year
const currentYear = new Date().getFullYear();

// Active Tab
const activeTab = ref<DocsTab>(state.docsTab || "overview");

watch(
  () => state.docsTab,
  (newTab) => {
    if (newTab) activeTab.value = newTab;
  }
);
watch(activeTab, (newTab) => {
  state.docsTab = newTab;
  if (typeof window !== "undefined") {
    window.location.hash = newTab === "changelog" ? "changelog" : "docs";
  }
});

// Changelog State & Filters
const changelogFilter = ref<string>("all");
const changelogSearch = ref("");

function getChangeTypeLabel(type: ChangeType): string {
  switch (type) {
    case "feat":
      return "Fitur Baru";
    case "improve":
      return "Peningkatan";
    case "fix":
      return "Perbaikan Bug";
    case "security":
      return "Keamanan";
    case "docs":
      return "Dokumentasi";
    default:
      return type;
  }
}

function getChangeTypeIcon(type: ChangeType): string {
  switch (type) {
    case "feat":
      return "bi-plus-circle-fill";
    case "improve":
      return "bi-lightning-charge-fill";
    case "fix":
      return "bi-wrench-adjustable-circle-fill";
    case "security":
      return "bi-shield-check-fill";
    case "docs":
      return "bi-file-earmark-text-fill";
    default:
      return "bi-dot";
  }
}

const totalChangesCount = computed(() => {
  return releases.reduce((acc, rel) => acc + rel.changes.length, 0);
});

const filteredReleases = computed(() => {
  const filter = changelogFilter.value;
  const q = changelogSearch.value.trim().toLowerCase();

  return releases
    .map((rel) => {
      let changes = rel.changes;

      if (filter !== "all") {
        changes = changes.filter((c) => c.type === filter);
      }

      if (q) {
        changes = changes.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            (c.description && c.description.toLowerCase().includes(q)) ||
            (c.scope && c.scope.toLowerCase().includes(q))
        );
      }

      const versionMatch = rel.version.toLowerCase().includes(q);
      const summaryMatch = rel.summary.toLowerCase().includes(q);

      return {
        ...rel,
        changes,
        matches: changes.length > 0 || ((versionMatch || summaryMatch) && filter === "all"),
      };
    })
    .filter((rel) => rel.changes.length > 0 || rel.matches);
});

// Search Filter
const searchQuery = ref("");

// FAQ list
interface FaqItem {
  q: string;
  a: string;
  tags: string[];
}

const faqs: FaqItem[] = [
  {
    q: "Apakah administrator atau pemilik server ELockey bisa melihat password saya?",
    a: "Sama sekali tidak bisa melalui data tersimpan. ELockey menerapkan arsitektur Zero-Plaintext Database Storage. Setiap informasi kredensial yang masuk ke database dienkripsi menjadi deretan kode acak (ciphertext). Administrator database hanya melihat data acak yang tidak bermakna tanpa master key Anda.",
    tags: ["privasi", "admin", "keamanan", "database", "zero-plaintext"],
  },
  {
    q: "Apa itu Master Key dan apa bedanya dengan password akun?",
    a: "Master Key adalah satu-satunya kunci utama yang digunakan untuk menurunkan kunci cipher AES-256-GCM brankas kredensial Anda. Password login Anda diverifikasi menggunakan hash scrypt, dan Master Key tidak pernah disimpan permanen di server maupun database.",
    tags: ["master key", "kunci", "password", "scrypt"],
  },
  {
    q: "Apa yang terjadi jika file database ELockey dicuri (database leak)?",
    a: "Bahkan jika seluruh file database dicuri, penyerang hanya mendapatkan data terenkripsi berformat salt.iv.tag.data. Dengan proteksi AES-256-GCM dan scrypt memory-hard key derivation, serangan brute-force maupun dictionary attack menjadi sangat mahal secara komputasi dan tidak praktis dilakukan pada master key berentropi tinggi.",
    tags: ["hacker", "bocor", "keamanan", "database", "brute-force"],
  },
  {
    q: "Bisakah saya mereset akun jika saya lupa Master Key?",
    a: "Tidak bisa. Demi integritas sistem keamanan tanpa pintu belakang (no-backdoor), server tidak menyimpan Master Key Anda. Jika Master Key hilang, tidak ada pihak manapun (termasuk tim pengembang) yang dapat membuka brankas Anda. Oleh karena itu, simpan Master Key Anda di tempat yang aman.",
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
</script>

<template>
  <div class="docs-container">
    <!-- Sticky Top Navigation Bar -->
    <header class="docs-navbar">
      <div class="docs-nav-content">
        <div class="docs-brand" @click="activeTab = 'overview'">
          <div class="brand-badge">
            <i class="bi bi-shield-lock"></i>
          </div>
          <div class="brand-text">
            <span class="brand-name">ELOCKEY</span>
            <span class="brand-version">// DOCS.V1.1</span>
          </div>
        </div>

        <div class="docs-nav-actions">
          <button class="btn btn-pill-primary" @click="closeDocs">
            <i class="bi" :class="state.unlocked ? 'bi-arrow-left' : 'bi-box-arrow-in-right'"></i>
            <span>{{ state.unlocked ? "Return to Vault" : "Access System" }}</span>
          </button>
        </div>
      </div>

      <!-- Quick Nav Tabs (Pills) -->
      <nav class="docs-tabs-nav">
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'overview' }"
          @click="activeTab = 'overview'"
        >
          <span>Overview</span>
        </button>
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'security' }"
          @click="activeTab = 'security'"
        >
          <span>Cryptography & Security</span>
        </button>
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'workflow' }"
          @click="activeTab = 'workflow'"
        >
          <span>Key Lifecycle Protocol</span>
        </button>
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'features' }"
          @click="activeTab = 'features'"
        >
          <span>Platform Modules</span>
        </button>
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'faq' }"
          @click="activeTab = 'faq'"
        >
          <span>Technical FAQ</span>
        </button>
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'changelog' }"
          @click="activeTab = 'changelog'"
        >
          <span>Changelog</span>
          <span class="tab-badge-mono">1.1.0</span>
        </button>
      </nav>
    </header>

    <!-- Main Content Area -->
    <main class="docs-main">
      <!-- 1. OVERVIEW TAB -->
      <section v-if="activeTab === 'overview'" class="tab-content fade-in">
        <div class="xai-hero">
          <div class="eyebrow-mono">// SYSTEM ARCHITECTURE & SPECIFICATION</div>
          <h1 class="hero-title">
            Zero-Plaintext Credential Vault
          </h1>
          <p class="hero-description">
            ELockey is a high-assurance credential engine engineered with authenticated symmetric encryption (NIST-compliant AES-256-GCM), memory-hard key derivation (scrypt), and ephemeral RAM-isolated key lifecycles.
          </p>

          <!-- Core Technical Specifications Grid -->
          <div class="spec-matrix-grid">
            <div class="spec-card">
              <span class="spec-label">ENCRYPTION PRIMITIVE</span>
              <strong class="spec-value">AES-256-GCM</strong>
              <span class="spec-meta">128-bit GHASH Authenticated Tag</span>
            </div>
            <div class="spec-card">
              <span class="spec-label">KEY DERIVATION (KDF)</span>
              <strong class="spec-value">scrypt Memory-Hard</strong>
              <span class="spec-meta">16-byte CSPRNG Salt per field</span>
            </div>
            <div class="spec-card">
              <span class="spec-label">NONCE / IV SPACE</span>
              <strong class="spec-value">96-bit CSPRNG IV</strong>
              <span class="spec-meta">Unique initialization per write</span>
            </div>
            <div class="spec-card">
              <span class="spec-label">MASTER KEY PERSISTENCE</span>
              <strong class="spec-value">Zero-Persistence</strong>
              <span class="spec-meta">Ephemeral RAM allocation only</span>
            </div>
          </div>
        </div>

        <!-- 3 Security Pillars -->
        <div class="section-divider-header">
          <span class="eyebrow-mono">// CORE ENGINEERING PRINCIPLES</span>
        </div>

        <div class="grid-3">
          <div class="xai-card">
            <div class="card-mono-idx">01 / AT-REST ISOLATION</div>
            <h3 class="card-title">Zero-Plaintext Storage</h3>
            <p class="card-body-text">
              Complete decoupling between database persistence and plaintext secrets. All vault fields are serialized into isolated ciphertext structures (`salt.iv.tag.data`) prior to storage.
            </p>
          </div>

          <div class="xai-card">
            <div class="card-mono-idx">02 / AUTHENTICATED AEAD</div>
            <h3 class="card-title">Cryptographic Integrity</h3>
            <p class="card-body-text">
              16-byte authentication tags on every ciphertext block provide mathematical tamper resistance, immediately rejecting corrupted or modified records upon decryption.
            </p>
          </div>

          <div class="xai-card">
            <div class="card-mono-idx">03 / TRANSIENT LIFECYCLE</div>
            <h3 class="card-title">Memory Zeroization</h3>
            <p class="card-body-text">
              The Master Key exists in process memory strictly during active unlocked sessions. Calling the Lock instruction or ending the session initiates immediate heap memory zeroization.
            </p>
          </div>
        </div>

        <!-- Threat Model Boundary Box -->
        <div class="xai-card xai-boundary-box">
          <div class="boundary-header">
            <span class="eyebrow-mono">// THREAT MODEL & BOUNDARY SCOPE</span>
          </div>
          <div class="boundary-grid">
            <div class="boundary-item">
              <span class="mono-label">DATABASE LEAK RESILIENCE</span>
              <p>PostgreSQL tables store strictly randomized ciphertext blobs. Raw database dumps cannot be decrypted without brute-forcing high-entropy Master Keys.</p>
            </div>
            <div class="boundary-item">
              <span class="mono-label">INDIVIDUAL PAYLOAD ENTROPY</span>
              <p>Each field possesses its own CSPRNG Salt and IV, preventing cross-record pattern correlation even when identical passwords or usernames exist.</p>
            </div>
            <div class="boundary-item">
              <span class="mono-label">NO BACKDOOR GUARANTEE</span>
              <p>No universal escrow or administrative bypass exists. System integrity is mathematically bound to individual Master Key possession.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. SECURITY TAB -->
      <section v-if="activeTab === 'security'" class="tab-content fade-in">
        <div class="section-header">
          <div class="eyebrow-mono">// CRYPTOGRAPHIC PRIMITIVES & AUDIT SPECIFICATIONS</div>
          <h2 class="section-title">Security Architecture</h2>
          <p class="section-subtitle">Technical specifications for symmetric cipher operation, key derivation, and threat mitigation.</p>
        </div>

        <div class="grid-2">
          <div class="xai-card">
            <div class="card-mono-idx">CIPHER SPECIFICATION</div>
            <h3 class="card-title">AES-256-GCM (NIST SP 800-38D)</h3>
            <p class="card-body-text">
              High-throughput authenticated symmetric cipher offering both confidentiality and cryptographic integrity verification.
            </p>
            <div class="spec-list-mono">
              <div class="spec-row">
                <span class="spec-k">Key Length:</span>
                <span class="spec-v">256-bit (32 bytes) symmetric key</span>
              </div>
              <div class="spec-row">
                <span class="spec-k">Auth Tag:</span>
                <span class="spec-v">128-bit (16 bytes) GHASH integrity tag</span>
              </div>
              <div class="spec-row">
                <span class="spec-k">Nonce / IV:</span>
                <span class="spec-v">96-bit (12 bytes) CSPRNG unique vector</span>
              </div>
            </div>
          </div>

          <div class="xai-card">
            <div class="card-mono-idx">KEY DERIVATION SPECIFICATION</div>
            <h3 class="card-title">scrypt Memory-Hard Function</h3>
            <p class="card-body-text">
              Memory-intensive key derivation algorithm engineered to thwart GPU, FPGA, and ASIC dictionary attacks.
            </p>
            <div class="spec-list-mono">
              <div class="spec-row">
                <span class="spec-k">Salt Entropy:</span>
                <span class="spec-v">128-bit (16 bytes) CSPRNG random salt</span>
              </div>
              <div class="spec-row">
                <span class="spec-k">Hash Output:</span>
                <span class="spec-v">512-bit (64 bytes) identity hash</span>
              </div>
              <div class="spec-row">
                <span class="spec-k">Verification:</span>
                <span class="spec-v">Constant-time (timingSafeEqual)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Data State Matrix Table -->
        <div class="xai-card xai-table-card">
          <div class="table-card-header">
            <span class="eyebrow-mono">// DATA STATE MATRIX (PLAINTEXT VS MEMORY VS STORAGE)</span>
          </div>
          <div class="table-responsive">
            <table class="xai-table">
              <thead>
                <tr>
                  <th>ENTITY FIELD</th>
                  <th>PLAINTEXT REPRESENTATION</th>
                  <th>PROCESS MEMORY STATE (RAM)</th>
                  <th>PERSISTENT DATABASE STATE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Master Key</strong></td>
                  <td><code>KunciKuRahasia123!</code></td>
                  <td><span class="badge-mono active">Transient during Unlock</span></td>
                  <td><span class="badge-mono alert">NEVER STORED (Hash Only)</span></td>
                </tr>
                <tr>
                  <td><strong>Account Username</strong></td>
                  <td><code>user@example.com</code></td>
                  <td>Decrypted on-demand</td>
                  <td><code>dGVzdA==.YmxvYg==...</code></td>
                </tr>
                <tr>
                  <td><strong>Account Password</strong></td>
                  <td><code>P@ssw0rdSuperKuat!</code></td>
                  <td>Decrypted on-demand</td>
                  <td><code>salt.iv.tag.data (AES-GCM)</code></td>
                </tr>
                <tr>
                  <td><strong>Secret Notes / 2FA</strong></td>
                  <td><code>PIN Bank: 882190</code></td>
                  <td>Decrypted on-demand</td>
                  <td><code>salt.iv.tag.data (AES-GCM)</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Threat Model Matrix Table -->
        <div class="xai-card xai-table-card">
          <div class="table-card-header">
            <span class="eyebrow-mono">// THREAT MODEL & MITIGATION ANALYSIS</span>
          </div>
          <div class="table-responsive">
            <table class="xai-table">
              <thead>
                <tr>
                  <th>THREAT VECTOR</th>
                  <th>RISK SEVERITY</th>
                  <th>ENGINEERING MITIGATION</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Database Dump Theft (Storage Compromise)</strong></td>
                  <td><span class="badge-mono green">FULLY MITIGATED</span></td>
                  <td>Data is stored entirely as ciphertext. Zero plaintext or private keys reside on disk.</td>
                </tr>
                <tr>
                  <td><strong>Dictionary / Brute-force Cracking</strong></td>
                  <td><span class="badge-mono green">HIGHLY MITIGATED</span></td>
                  <td>scrypt memory-hard parameterization imposes exponential computing/memory costs on attackers.</td>
                </tr>
                <tr>
                  <td><strong>Ciphertext Tampering / Bit-flipping</strong></td>
                  <td><span class="badge-mono green">FULLY MITIGATED</span></td>
                  <td>AES-GCM 16-byte authentication tag validates cryptographic integrity prior to release.</td>
                </tr>
                <tr>
                  <td><strong>Unattended Workstation Session</strong></td>
                  <td><span class="badge-mono orange">USER ACTION REQ</span></td>
                  <td>Instant Lock protocol zeroizes Master Key from RAM and clears local session cache.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Security Best Practices Callout -->
        <div class="xai-card xai-callout">
          <div class="eyebrow-mono">// OPERATIONAL SECURITY DIRECTIVES</div>
          <p class="callout-lead">
            Because ELockey enforces strict zero-knowledge storage, <strong>loss of the Master Key results in irreversible loss of vault contents</strong>.
          </p>
          <ul class="callout-bullets">
            <li>Generate Master Keys with high entropy (passphrases with 4+ random words or 16+ mixed characters).</li>
            <li>Do not reuse Master Keys across external services, email accounts, or identity providers.</li>
            <li>Execute the <strong>Lock</strong> command whenever leaving workstations or shared hardware.</li>
          </ul>
        </div>
      </section>

      <!-- 3. WORKFLOW TAB -->
      <section v-if="activeTab === 'workflow'" class="tab-content fade-in">
        <div class="section-header">
          <div class="eyebrow-mono">// CRYPTOGRAPHIC SEQUENCE & EXECUTION PHASES</div>
          <h2 class="section-title">Key Lifecycle Protocol</h2>
          <p class="section-subtitle">Deterministic lifecycle from account provisioning to session zeroization.</p>
        </div>

        <div class="timeline-xai">
          <!-- Step 1 -->
          <div class="timeline-item-xai">
            <div class="item-badge-xai">01</div>
            <div class="xai-card timeline-card-xai">
              <div class="eyebrow-mono">PHASE 01 // IDENTITY INITIALIZATION</div>
              <h3 class="card-title">Master Key Provisioning</h3>
              <p class="card-body-text">
                User sets a Master Key at registration. The backend generates a 16-byte CSPRNG salt, computes a 64-byte scrypt verification hash, and commits `salt.hash` to database storage.
              </p>
              <div class="code-snippet-mono">
                <code>hashMasterKey(masterKey) &rarr; scrypt(key, salt16, 64B) &rarr; DB: salt.hash</code>
              </div>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="timeline-item-xai">
            <div class="item-badge-xai">02</div>
            <div class="xai-card timeline-card-xai">
              <div class="eyebrow-mono">PHASE 02 // TRANSIENT ALLOCATION</div>
              <h3 class="card-title">Session Unlock & RAM Ingestion</h3>
              <p class="card-body-text">
                During vault unlock, the Master Key is authenticated via constant-time verification (`timingSafeEqual`) and bound to the in-memory session map in RAM heap.
              </p>
              <div class="code-snippet-mono">
                <code>verifyMasterKey(key, stored) &rarr; sessions.set(token, { ..., masterKey })</code>
              </div>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="timeline-item-xai">
            <div class="item-badge-xai">03</div>
            <div class="xai-card timeline-card-xai">
              <div class="eyebrow-mono">PHASE 03 // PAYLOAD SERIALIZATION</div>
              <h3 class="card-title">Field Derivation & AES-GCM Ingestion</h3>
              <p class="card-body-text">
                For every credential payload (username, password, notes):
              </p>
              <ol class="step-list-xai">
                <li>Generate independent 16-byte Salt and 12-byte IV via CSPRNG.</li>
                <li>Derive 256-bit symmetric cipher key from Master Key + Salt via scrypt.</li>
                <li>Encrypt payload with AES-256-GCM, producing ciphertext and 16-byte tag.</li>
                <li>Commit serialized string payload: <code>salt.iv.tag.data</code>.</li>
              </ol>
            </div>
          </div>

          <!-- Step 4 -->
          <div class="timeline-item-xai">
            <div class="item-badge-xai">04</div>
            <div class="xai-card timeline-card-xai">
              <div class="eyebrow-mono">PHASE 04 // ZEROIZATION & TERMINATION</div>
              <h3 class="card-title">Session Teardown & Key Zeroization</h3>
              <p class="card-body-text">
                Upon Lock or Logout request:
              </p>
              <ul class="step-list-xai">
                <li><strong>Lock API:</strong> Master Key field is immediately unassigned and garbage-collected from RAM.</li>
                <li><strong>Logout API:</strong> Bearer session token is destroyed and client cookie/token storage is flushed.</li>
                <li>Vault transitions back to locked state; database remains inaccessible without re-entering the Master Key.</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Terminal animation embed preview if available -->
        <div class="xai-card xai-flow-card">
          <div class="eyebrow-mono">// ENGINE EXECUTION SIMULATION</div>
          <div class="flow-img-wrap">
            <img src="/flow-animation.svg" alt="ELockey Cryptography Flow" class="flow-svg" />
          </div>
        </div>
      </section>

      <!-- 4. FEATURES TAB -->
      <section v-if="activeTab === 'features'" class="tab-content fade-in">
        <div class="section-header">
          <div class="eyebrow-mono">// SYSTEM CAPABILITIES & COMPONENT MODULES</div>
          <h2 class="section-title">Platform Modules</h2>
          <p class="section-subtitle">Credential partitioning, session masking, clipboard buffering, and progressive web capabilities.</p>
        </div>

        <div class="grid-2">
          <div class="xai-card">
            <div class="card-mono-idx">MODULE 01 // PARTITIONING</div>
            <h3 class="card-title">Multi-Account Credential Partitioning</h3>
            <p class="card-body-text">
              Structured categorization of authentication credentials by application source and domain, isolated with distinct visual identifiers.
            </p>
          </div>

          <div class="xai-card">
            <div class="card-mono-idx">MODULE 02 // UI PRIVACY</div>
            <h3 class="card-title">Anti-Shoulder Surfing Masking</h3>
            <p class="card-body-text">
              Zero-visibility defaults on sensitive input fields with rapid toggle mechanics to prevent visual leakage in open environments.
            </p>
          </div>

          <div class="xai-card">
            <div class="card-mono-idx">MODULE 03 // CLIPBOARD</div>
            <h3 class="card-title">Transient Clipboard Buffer</h3>
            <p class="card-body-text">
              Single-action clipboard ingestion for usernames and passwords with real-time feedback toast notifications.
            </p>
          </div>

          <div class="xai-card">
            <div class="card-mono-idx">MODULE 04 // PAYLOAD STORAGE</div>
            <h3 class="card-title">Encrypted Metadata & Secret Notes</h3>
            <p class="card-body-text">
              Full-cipher payload storage for secondary secrets including 2FA Recovery Codes, banking PINs, and sensitive server keys.
            </p>
          </div>

          <div class="xai-card">
            <div class="card-mono-idx">MODULE 05 // CLIENT FILTERING</div>
            <h3 class="card-title">In-Memory Index Filtering</h3>
            <p class="card-body-text">
              Zero-latency client-side search execution over decrypted vault entries without incurring redundant network roundtrips.
            </p>
          </div>

          <div class="xai-card">
            <div class="card-mono-idx">MODULE 06 // MEMORY LOCK</div>
            <h3 class="card-title">Instant Memory Zeroization Protocol</h3>
            <p class="card-body-text">
              Deterministic memory clearing mechanism that flushes in-memory keys on demand with a single interaction.
            </p>
          </div>

          <div class="xai-card">
            <div class="card-mono-idx">MODULE 07 // ACCESSIBILITY</div>
            <h3 class="card-title">Dynamic High-Contrast Visual System</h3>
            <p class="card-body-text">
              High-readability dark and light visual tokens adhering to WCAG contrast standards with persistent client configuration.
            </p>
          </div>

          <div class="xai-card">
            <div class="card-mono-idx">MODULE 08 // PORTABILITY</div>
            <h3 class="card-title">Progressive Web App (PWA) Standard</h3>
            <p class="card-body-text">
              W3C-compliant standalone application deployment supporting direct workstation desktop and mobile OS installations.
            </p>
          </div>
        </div>
      </section>

      <!-- 5. FAQ TAB -->
      <section v-if="activeTab === 'faq'" class="tab-content fade-in">
        <div class="section-header">
          <div class="eyebrow-mono">// INQUIRIES & SECURITY ASSURANCES</div>
          <h2 class="section-title">Technical FAQ</h2>
          <p class="section-subtitle">Direct answers regarding cryptographic design, threat resilience, and data ownership.</p>
        </div>

        <!-- FAQ Search input -->
        <div class="xai-search-box">
          <i class="bi bi-search search-icon"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search inquiries (e.g. master key, privasi, database, reset, lock)..."
          />
          <button
            v-if="searchQuery"
            class="clear-search-btn"
            title="Clear filter"
            @click="searchQuery = ''"
          >
            <i class="bi bi-x-circle-fill"></i>
          </button>
        </div>

        <div v-if="filteredFaqs.length === 0" class="empty-faq-xai">
          <p>// No inquiries match the query "{{ searchQuery }}".</p>
        </div>

        <div class="faq-accordion-xai">
          <div
            v-for="(item, idx) in filteredFaqs"
            :key="idx"
            class="faq-card-xai"
            :class="{ open: openFaqs[idx] }"
          >
            <button class="faq-btn-xai" @click="toggleFaq(idx)">
              <span class="faq-title-xai">
                <span class="mono-prefix">[Q.0{{ idx + 1 }}]</span>
                {{ item.q }}
              </span>
              <i class="bi" :class="openFaqs[idx] ? 'bi-dash' : 'bi-plus'"></i>
            </button>
            <div v-if="openFaqs[idx]" class="faq-answer-xai">
              <p>{{ item.a }}</p>
              <div class="faq-tags-xai">
                <span v-for="tag in item.tags" :key="tag" class="tag-pill-mono">//{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. CHANGELOG TAB -->
      <section v-if="activeTab === 'changelog'" class="tab-content fade-in">
        <div class="section-header">
          <div class="eyebrow-mono">// RELEASE ARCHIVE & VERSION LOGS</div>
          <h2 class="section-title">Changelog</h2>
          <p class="section-subtitle">
            Historical record of releases, protocol improvements, and security enhancements.
          </p>
        </div>

        <!-- Quick Stats Banner -->
        <div class="changelog-stats-grid">
          <div class="stat-pill-card">
            <span class="stat-k">CURRENT RELEASE</span>
            <strong class="stat-v">v1.1.0</strong>
          </div>
          <div class="stat-pill-card">
            <span class="stat-k">TOTAL RELEASES</span>
            <strong class="stat-v">{{ releases.length }} Versions</strong>
          </div>
          <div class="stat-pill-card">
            <span class="stat-k">PATCH ENTRIES</span>
            <strong class="stat-v">{{ totalChangesCount }} Changes</strong>
          </div>
          <div class="stat-pill-card">
            <span class="stat-k">CORE ARCHITECTURE</span>
            <strong class="stat-v">Zero-Plaintext</strong>
          </div>
        </div>

        <!-- Search & Category Filters -->
        <div class="cl-controls-xai">
          <div class="xai-search-box">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="changelogSearch"
              type="text"
              placeholder="Search release history (e.g. vault, password, security, crypto)..."
            />
            <button
              v-if="changelogSearch"
              class="clear-search-btn"
              title="Clear filter"
              @click="changelogSearch = ''"
            >
              <i class="bi bi-x-circle-fill"></i>
            </button>
          </div>

          <div class="filter-pills-row">
            <button
              class="pill-btn"
              :class="{ active: changelogFilter === 'all' }"
              @click="changelogFilter = 'all'"
            >
              All ({{ totalChangesCount }})
            </button>
            <button
              class="pill-btn"
              :class="{ active: changelogFilter === 'feat' }"
              @click="changelogFilter = 'feat'"
            >
              Features
            </button>
            <button
              class="pill-btn"
              :class="{ active: changelogFilter === 'improve' }"
              @click="changelogFilter = 'improve'"
            >
              Improvements
            </button>
            <button
              class="pill-btn"
              :class="{ active: changelogFilter === 'fix' }"
              @click="changelogFilter = 'fix'"
            >
              Fixes
            </button>
            <button
              class="pill-btn"
              :class="{ active: changelogFilter === 'security' }"
              @click="changelogFilter = 'security'"
            >
              Security
            </button>
            <button
              class="pill-btn"
              :class="{ active: changelogFilter === 'docs' }"
              @click="changelogFilter = 'docs'"
            >
              Documentation
            </button>
          </div>
        </div>

        <!-- Empty search result -->
        <div v-if="filteredReleases.length === 0" class="empty-faq-xai">
          <p>// No release notes match the query "{{ changelogSearch }}".</p>
          <button
            class="btn btn-pill-outline"
            style="margin-top: 12px"
            @click="changelogSearch = ''; changelogFilter = 'all'"
          >
            Reset Filter
          </button>
        </div>

        <!-- Release Timeline -->
        <div v-else class="release-timeline-xai">
          <div
            v-for="rel in filteredReleases"
            :key="rel.version"
            class="release-card-xai"
          >
            <div class="rel-header-xai">
              <div class="rel-version-box">
                <h3 class="rel-title">v{{ rel.version }}</h3>
                <span class="rel-tag-badge">{{ rel.tag }}</span>
              </div>
              <span class="rel-date-mono">{{ rel.date }}</span>
            </div>

            <p class="rel-summary-text">{{ rel.summary }}</p>

            <div v-if="rel.highlights && rel.highlights.length" class="rel-highlights-row">
              <span
                v-for="hl in rel.highlights"
                :key="hl"
                class="highlight-tag-xai"
              >
                // {{ hl }}
              </span>
            </div>

            <div class="rel-changes-list">
              <div
                v-for="(c, cIdx) in rel.changes"
                :key="cIdx"
                class="rel-change-row"
              >
                <span class="change-type-mono">[{{ c.type.toUpperCase() }}]</span>
                <span v-if="c.scope" class="change-scope-mono">[{{ c.scope }}]</span>
                <div class="change-body-xai">
                  <span class="change-title-xai">{{ c.title }}</span>
                  <p v-if="c.description" class="change-desc-xai">{{ c.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Phase 2 Roadmap Box -->
        <div class="xai-card xai-roadmap-card">
          <div class="eyebrow-mono">// DEVELOPMENT ROADMAP</div>
          <h3 class="card-title">Phase 2 Engineering Roadmap</h3>
          <p class="card-body-text">Architectural modules currently in development pipeline:</p>

          <div class="roadmap-grid-xai">
            <div class="roadmap-item-xai">
              <span class="mono-label">MODULE 01 // ENTROPY & DICEWARE GENERATOR</span>
              <p>Custom cryptographic entropy generation with Diceware passphrase dictionary.</p>
            </div>
            <div class="roadmap-item-xai">
              <span class="mono-label">MODULE 02 // TOTP / 2FA AUTHENTICATOR</span>
              <p>In-vault 6-digit OTP calculation with 30-second live countdown timer.</p>
            </div>
            <div class="roadmap-item-xai">
              <span class="mono-label">MODULE 03 // ENCRYPTED EXPORT & MIGRATION</span>
              <p>Interoperable export/import mechanics for standard password manager formats.</p>
            </div>
            <div class="roadmap-item-xai">
              <span class="mono-label">MODULE 04 // VAULT HEALTH & LEAK AUDIT</span>
              <p>Automated entropy auditing, duplicate detection, and k-Anonymity leak validation.</p>
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
            <span class="brand-name">ELOCKEY</span>
            <span class="eyebrow-mono">// TECHNICAL SPECIFICATIONS</span>
          </div>
          <p>Zero-Plaintext AES-256-GCM Authenticated Credential Vault Architecture.</p>
        </div>
        <div class="footer-right">
          <button class="btn btn-pill-primary" @click="closeDocs">
            <span>{{ state.unlocked ? "Return to Vault" : "Access System" }}</span>
          </button>
        </div>
      </div>
      <div class="footer-copyright">
        &copy; {{ currentYear }} ELockey. Authenticated encryption at rest & ephemeral memory key lifecycle.
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ── Theme Tokens (Dark by default, Light via html.light) ── */
.docs-container {
  --xai-canvas: #0a0a0a;
  --xai-canvas-card: #191919;
  --xai-canvas-soft: #1a1c20;
  --xai-canvas-nested: #0a0a0a;
  --xai-hairline: #212327;
  --xai-hairline-light: rgba(255, 255, 255, 0.25);
  --xai-ink: #ffffff;
  --xai-body: #dadbdf;
  --xai-body-mid: #7d8187;
  --xai-primary-btn-bg: #ffffff;
  --xai-primary-btn-text: #0a0a0a;
  --xai-active-tab-bg: #191919;

  min-height: 100vh;
  background: var(--xai-canvas);
  color: var(--xai-ink);
  font-family: Inter, system-ui, -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
}

/* ── Typography & Eyebrow Primitives ── */
.eyebrow-mono {
  font-family: GeistMono, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  font-size: 12px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 1.4px;
  color: var(--xai-body-mid);
  margin-bottom: 8px;
}

.mono-label {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--xai-body-mid);
  text-transform: uppercase;
}

/* ── Sticky Top Navbar ── */
.docs-navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--xai-canvas);
  border-bottom: 1px solid var(--xai-hairline);
  backdrop-filter: blur(12px);
}

.docs-nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;
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
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  border: 1px solid var(--xai-hairline-light);
  background: transparent;
  color: var(--xai-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.5px;
  color: var(--xai-ink);
}

.brand-version {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 11px;
  color: var(--xai-body-mid);
  letter-spacing: 1px;
}

.docs-nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-pill-primary {
  padding: 6px 16px;
  border-radius: 9999px;
  background: var(--xai-primary-btn-bg);
  color: var(--xai-primary-btn-text);
  border: 1px solid var(--xai-primary-btn-bg);
  font-size: 13px;
  font-weight: 400;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: opacity 0.2s, background 0.2s;
  text-decoration: none;
}

.btn-pill-primary:hover {
  opacity: 0.9;
}

.btn-pill-outline {
  padding: 6px 16px;
  border-radius: 9999px;
  background: transparent;
  color: var(--xai-ink);
  border: 1px solid var(--xai-hairline-light);
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.btn-pill-outline:hover {
  border-color: var(--xai-ink);
  background: var(--xai-canvas-soft);
}

/* ── Navigation Tabs ── */
.docs-tabs-nav {
  max-width: 1200px;
  margin: 0 auto;
  padding: 4px 24px 12px;
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
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 400;
  border-radius: 9999px;
  background: transparent;
  color: var(--xai-body-mid);
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.tab-pill:hover {
  color: var(--xai-ink);
  background: var(--xai-canvas-soft);
}

.tab-pill.active {
  color: var(--xai-ink);
  background: var(--xai-active-tab-bg);
  border-color: var(--xai-hairline-light);
}

.tab-badge-mono {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 9999px;
  background: var(--xai-hairline);
  color: var(--xai-body);
}

/* ── Main Layout ── */
.docs-main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 48px 24px 64px;
}

.fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Hero Band ── */
.xai-hero {
  padding: 16px 0 48px;
  border-bottom: 1px solid var(--xai-hairline);
  margin-bottom: 40px;
}

.hero-title {
  font-size: 48px;
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -1.2px;
  margin: 8px 0 16px;
  color: var(--xai-ink);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 32px;
    letter-spacing: -0.6px;
  }
}

.hero-description {
  font-size: 18px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--xai-body);
  max-width: 860px;
  margin: 0 0 32px;
}

.spec-matrix-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.spec-card {
  background: var(--xai-canvas-card);
  border: 1px solid var(--xai-hairline);
  border-radius: 8px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spec-label {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 1.2px;
  color: var(--xai-body-mid);
  text-transform: uppercase;
}

.spec-value {
  font-size: 18px;
  font-weight: 400;
  color: var(--xai-ink);
  letter-spacing: -0.3px;
}

.spec-meta {
  font-size: 12px;
  color: var(--xai-body-mid);
  line-height: 1.4;
}

/* ── Section Dividers & Headers ── */
.section-divider-header {
  margin: 40px 0 20px;
  display: flex;
  align-items: center;
}

.section-header {
  margin-bottom: 32px;
}

.section-title {
  font-size: 32px;
  font-weight: 400;
  line-height: 36px;
  letter-spacing: -0.6px;
  color: var(--xai-ink);
  margin: 6px 0 8px;
}

.section-subtitle {
  font-size: 15px;
  line-height: 1.5;
  color: var(--xai-body);
  margin: 0;
}

/* ── Grids & Cards ── */
.grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.xai-card {
  background: var(--xai-canvas-card);
  border: 1px solid var(--xai-hairline);
  border-radius: 8px;
  padding: 24px;
  box-shadow: none;
}

.card-mono-idx {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 1.2px;
  color: var(--xai-body-mid);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.card-title {
  font-size: 18px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--xai-ink);
  margin: 0 0 10px;
  letter-spacing: -0.4px;
}

.card-body-text {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--xai-body);
  margin: 0;
}

/* ── Boundary Box ── */
.xai-boundary-box {
  margin-top: 32px;
}

.boundary-header {
  margin-bottom: 16px;
}

.boundary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.boundary-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.boundary-item p {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--xai-body);
  margin: 0;
}

/* ── Spec List Mono ── */
.spec-list-mono {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid var(--xai-hairline);
  padding-top: 14px;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  font-family: GeistMono, ui-monospace, monospace;
  gap: 8px;
  flex-wrap: wrap;
}

.spec-k {
  color: var(--xai-body-mid);
}

.spec-v {
  color: var(--xai-body);
}

/* ── Tables & Matrix ── */
.xai-table-card {
  margin: 28px 0;
}

.table-card-header {
  margin-bottom: 16px;
}

.table-responsive {
  overflow-x: auto;
}

.xai-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
  text-align: left;
}

.xai-table th {
  padding: 12px 16px;
  background: var(--xai-canvas-soft);
  border-bottom: 1px solid var(--xai-hairline);
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 11px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--xai-body-mid);
}

.xai-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--xai-hairline);
  color: var(--xai-body);
  vertical-align: middle;
}

.xai-table code {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 12px;
  background: var(--xai-canvas-nested);
  border: 1px solid var(--xai-hairline);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--xai-ink);
}

.badge-mono {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--xai-hairline);
  background: var(--xai-canvas-nested);
  color: var(--xai-body);
}

.badge-mono.active {
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.1);
}

.badge-mono.alert {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.1);
}

.badge-mono.green {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.1);
}

.badge-mono.orange {
  color: #f59e0b;
  border-color: rgba(251, 191, 36, 0.3);
  background: rgba(251, 191, 36, 0.1);
}

/* ── Callout Directives ── */
.xai-callout {
  margin-top: 28px;
  border-left: 2px solid var(--xai-ink);
}

.callout-lead {
  font-size: 15px;
  line-height: 1.6;
  color: var(--xai-ink);
  margin: 10px 0 14px;
}

.callout-bullets {
  margin: 0;
  padding-left: 20px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--xai-body);
}

/* ── Timeline Protocol ── */
.timeline-xai {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 32px;
}

.timeline-item-xai {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.item-badge-xai {
  font-family: GeistMono, ui-monospace, monospace;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  border: 1px solid var(--xai-hairline-light);
  background: var(--xai-canvas-card);
  color: var(--xai-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.timeline-card-xai {
  flex: 1;
}

.code-snippet-mono {
  margin-top: 14px;
  padding: 10px 14px;
  background: var(--xai-canvas-nested);
  border: 1px solid var(--xai-hairline);
  border-radius: 6px;
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 12px;
  color: var(--xai-body);
  overflow-x: auto;
}

.step-list-xai {
  margin: 10px 0 0;
  padding-left: 20px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--xai-body);
}

.xai-flow-card {
  margin-top: 28px;
}

.flow-img-wrap {
  background: var(--xai-canvas-nested);
  border: 1px solid var(--xai-hairline);
  border-radius: 6px;
  padding: 16px;
  display: flex;
  justify-content: center;
  overflow-x: auto;
  margin-top: 12px;
}

.flow-svg {
  max-width: 100%;
  height: auto;
}

/* ── Search Input ── */
.xai-search-box {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  max-width: 640px;
}

.xai-search-box input {
  width: 100%;
  background: var(--xai-canvas-card);
  border: 1px solid var(--xai-hairline);
  border-radius: 9999px;
  padding: 10px 40px 10px 38px;
  color: var(--xai-ink);
  font-size: 13.5px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}

.xai-search-box input:focus {
  border-color: var(--xai-hairline-light);
}

.xai-search-box .search-icon {
  position: absolute;
  left: 14px;
  color: var(--xai-body-mid);
  font-size: 14px;
  pointer-events: none;
}

.clear-search-btn {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  color: var(--xai-body-mid);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-search-btn:hover {
  color: var(--xai-ink);
}

.empty-faq-xai {
  padding: 32px;
  text-align: center;
  color: var(--xai-body-mid);
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 13px;
}

/* ── FAQ Accordion ── */
.faq-accordion-xai {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-card-xai {
  background: var(--xai-canvas-card);
  border: 1px solid var(--xai-hairline);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s, background 0.2s;
}

.faq-card-xai.open {
  border-color: var(--xai-hairline-light);
}

.faq-btn-xai {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: transparent;
  border: none;
  color: var(--xai-ink);
  font-size: 14.5px;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s ease;
}

.faq-btn-xai:hover {
  background: var(--xai-canvas-soft);
}

.faq-title-xai {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.mono-prefix {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 12px;
  color: var(--xai-body-mid);
  flex-shrink: 0;
  margin-top: 1px;
}

.faq-answer-xai {
  padding: 14px 20px 18px 46px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--xai-body);
  border-top: 1px solid var(--xai-hairline);
}

.faq-answer-xai p {
  margin: 0 0 10px;
}

.faq-tags-xai {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-pill-mono {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 11px;
  color: var(--xai-body-mid);
  background: var(--xai-canvas-nested);
  border: 1px solid var(--xai-hairline);
  padding: 2px 8px;
  border-radius: 9999px;
}

/* ── Changelog Tab ── */
.changelog-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.stat-pill-card {
  background: var(--xai-canvas-card);
  border: 1px solid var(--xai-hairline);
  border-radius: 8px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-k {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--xai-body-mid);
}

.stat-v {
  font-size: 16px;
  font-weight: 400;
  color: var(--xai-ink);
}

.cl-controls-xai {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 28px;
}

.filter-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill-btn {
  background: transparent;
  border: 1px solid var(--xai-hairline);
  color: var(--xai-body-mid);
  font-size: 13px;
  font-weight: 400;
  padding: 5px 14px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-btn:hover {
  color: var(--xai-ink);
  border-color: var(--xai-hairline-light);
  background: var(--xai-canvas-soft);
}

.pill-btn.active {
  background: var(--xai-primary-btn-bg);
  color: var(--xai-primary-btn-text);
  border-color: var(--xai-primary-btn-bg);
}

.release-timeline-xai {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 36px;
}

.release-card-xai {
  background: var(--xai-canvas-card);
  border: 1px solid var(--xai-hairline);
  border-radius: 8px;
  padding: 24px;
}

.rel-header-xai {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.rel-version-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rel-title {
  font-size: 20px;
  font-weight: 400;
  color: var(--xai-ink);
  margin: 0;
  letter-spacing: -0.4px;
}

.rel-tag-badge {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 9999px;
  background: var(--xai-canvas-nested);
  border: 1px solid var(--xai-hairline);
  color: var(--xai-body);
}

.rel-date-mono {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 12px;
  color: var(--xai-body-mid);
}

.rel-summary-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--xai-body);
  margin: 0 0 16px;
}

.rel-highlights-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--xai-hairline);
}

.highlight-tag-xai {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 11px;
  color: var(--xai-body);
  background: var(--xai-canvas-nested);
  border: 1px solid var(--xai-hairline);
  padding: 3px 8px;
  border-radius: 4px;
}

.rel-changes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rel-change-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13.5px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--xai-canvas-nested);
  border: 1px solid var(--xai-hairline);
}

.change-type-mono {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 11px;
  color: var(--xai-body-mid);
  flex-shrink: 0;
  margin-top: 1px;
}

.change-scope-mono {
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 11px;
  color: #3b82f6;
  flex-shrink: 0;
  margin-top: 1px;
}

.change-body-xai {
  flex: 1;
}

.change-title-xai {
  color: var(--xai-ink);
  font-weight: 400;
  line-height: 1.4;
}

.change-desc-xai {
  color: var(--xai-body-mid);
  font-size: 12.5px;
  margin: 2px 0 0;
  line-height: 1.45;
}

.xai-roadmap-card {
  margin-top: 16px;
}

.roadmap-grid-xai {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.roadmap-item-xai {
  background: var(--xai-canvas-nested);
  border: 1px solid var(--xai-hairline);
  border-radius: 6px;
  padding: 14px;
}

.roadmap-item-xai p {
  font-size: 13px;
  line-height: 1.5;
  color: var(--xai-body);
  margin: 4px 0 0;
}

/* ── Footer ── */
.docs-footer {
  background: var(--xai-canvas);
  border-top: 1px solid var(--xai-hairline);
  padding: 48px 24px 32px;
  margin-top: auto;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.footer-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footer-left p {
  font-size: 13.5px;
  color: var(--xai-body-mid);
  margin: 0;
}

.footer-copyright {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  font-family: GeistMono, ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: var(--xai-body-mid);
  border-top: 1px solid var(--xai-hairline);
  padding-top: 20px;
}
</style>
