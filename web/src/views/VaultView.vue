<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { api, type EntryDetail, type EntryMeta } from "../api";
import { state, toggleTheme, openDocs } from "../state";
import {
  generatePassword,
  calculateStrength,
  type PasswordStrength,
} from "../utils/generator";

const entries = ref<EntryMeta[]>([]);
const detail = ref<EntryDetail | null>(null);
const activeId = ref<string | null>(null);
const showSecret = ref(false);
const error = ref("");
const busy = ref(false);
const search = ref("");
const toast = ref("");
const modalShowPassword = ref(false);

const modal = reactive({
  open: false,
  editing: false,
  id: "",
  appsource: "",
  username: "",
  password: "",
  notes: "",
});

const genModal = reactive({
  open: false,
  password: "",
  mode: "chars" as "chars" | "passphrase",
  length: 18,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  avoidAmbiguous: false,
  wordCount: 4,
  separator: "-",
  capitalize: true,
  includeNumber: true,
  showPlaintext: true,
});

const genStrength = computed<PasswordStrength>(() =>
  calculateStrength(genModal.password)
);

function refreshGenerator() {
  genModal.password = generatePassword({
    mode: genModal.mode,
    length: Number(genModal.length),
    uppercase: genModal.uppercase,
    lowercase: genModal.lowercase,
    numbers: genModal.numbers,
    symbols: genModal.symbols,
    avoidAmbiguous: genModal.avoidAmbiguous,
    wordCount: Number(genModal.wordCount),
    separator: genModal.separator,
    capitalize: genModal.capitalize,
    includeNumber: genModal.includeNumber,
  });
}

function openStandaloneGenerator() {
  genModal.open = true;
  refreshGenerator();
}

function applyGeneratedPassword() {
  if (modal.open) {
    modal.password = genModal.password;
    modalShowPassword.value = true;
    genModal.open = false;
    showToast("Kata sandi diterapkan ke form!");
  } else {
    copy(genModal.password, "Kata sandi");
    genModal.open = false;
  }
}

watch(
  () => [
    genModal.mode,
    genModal.length,
    genModal.uppercase,
    genModal.lowercase,
    genModal.numbers,
    genModal.symbols,
    genModal.avoidAmbiguous,
    genModal.wordCount,
    genModal.separator,
    genModal.capitalize,
    genModal.includeNumber,
  ],
  () => {
    refreshGenerator();
  }
);

const confirm = reactive({
  open: false,
  appsource: "",
  deleteBusy: false,
});

const COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#06b6d4", "#f97316", "#6366f1", "#14b8a6", "#e11d48",
];

function colorOf(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const dy = Math.floor(diff / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (dy < 30) return `${dy}d ago`;
  return d.toLocaleDateString();
}

const filtered = computed(() => {
  if (!search.value.trim()) return entries.value;
  const q = search.value.toLowerCase();
  return entries.value.filter((e) => e.appsource.toLowerCase().includes(q));
});

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(msg: string) {
  toast.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.value = ""; }, 2000);
}

async function load() {
  error.value = "";
  busy.value = true;
  try {
    const res = await api.list();
    entries.value = res.entries;
    if (activeId.value) {
      const still = entries.value.find((e) => e.id === activeId.value);
      if (still) await fetchDetail(still);
      else { detail.value = null; activeId.value = null; }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

async function fetchDetail(entry: EntryMeta) {
  try {
    detail.value = await api.get(entry.id);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    detail.value = null;
  }
}

async function toggle(entry: EntryMeta) {
  if (activeId.value === entry.id) {
    activeId.value = null;
    detail.value = null;
    showSecret.value = false;
    return;
  }
  error.value = "";
  activeId.value = entry.id;
  showSecret.value = false;
  await fetchDetail(entry);
}

async function copy(text: string | undefined | null, label: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${label} copied`);
  } catch {
    showToast("Copy failed");
  }
}

function openAdd() {
  modalShowPassword.value = false;
  Object.assign(modal, {
    open: true, editing: false, id: "",
    appsource: "", username: "", password: "", notes: "",
  });
}

function openEdit() {
  if (!detail.value) return;
  modalShowPassword.value = false;
  Object.assign(modal, {
    open: true, editing: true, id: detail.value.id,
    appsource: detail.value.appsource,
    username: detail.value.username ?? "",
    password: detail.value.password ?? "",
    notes: detail.value.notes ?? "",
  });
}

async function save() {
  error.value = "";
  if (!modal.appsource.trim() || (!modal.editing && (!modal.username || !modal.password))) {
    error.value = "App source, username and password are required.";
    return;
  }
  busy.value = true;
  try {
    const input = {
      appsource: modal.appsource.trim(),
      username: modal.username,
      password: modal.password,
      notes: modal.notes,
    };
    if (modal.editing) await api.update(modal.id, input);
    else await api.create(input);
    modal.open = false;
    await load();
    showToast(modal.editing ? "Entry updated" : "Entry created");
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

function confirmDelete() {
  if (!detail.value) return;
  confirm.appsource = detail.value.appsource;
  confirm.open = true;
}

async function remove() {
  if (!detail.value) return;
  confirm.deleteBusy = true;
  error.value = "";
  try {
    await api.remove(detail.value.id);
    confirm.open = false;
    detail.value = null;
    activeId.value = null;
    await load();
    showToast("Entry deleted");
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    confirm.deleteBusy = false;
  }
}

async function lock() {
  try { await api.lock(); } catch { /* ignore */ }
  state.unlocked = false;
}

async function logout() {
  try { await api.lock(); } catch { /* ignore */ }
  localStorage.removeItem("elockey.token");
  state.token = null;
  state.unlocked = false;
}

onMounted(load);
</script>

<template>
  <div class="vault">
    <header class="vault-header">
      <div
        class="vault-title"
        title="ELockey v1.1.0 · Klik untuk melihat Changelog"
        @click="openDocs('changelog')"
      >
        <i class="bi bi-shield-lock vault-logo"></i>
        <h1>ELockey</h1>
        <span class="vault-version-badge">v1.1.0</span>
      </div>
      <div class="vault-header-actions">
        <button
          class="icon-btn"
          title="Generator Kata Sandi Unik"
          aria-label="Generator Kata Sandi Unik"
          @click="openStandaloneGenerator"
        >
          <i class="bi bi-key"></i>
        </button>
        <button
          class="icon-btn"
          title="Panduan & Dokumentasi"
          aria-label="Panduan & Dokumentasi"
          @click="openDocs('overview')"
        >
          <i class="bi bi-book"></i>
        </button>
        <button class="icon-btn" title="Toggle theme" aria-label="Toggle theme" @click="toggleTheme">
          <i class="bi" :class="state.theme === 'dark' ? 'bi-sun' : 'bi-moon'"></i>
        </button>
        <button class="icon-btn" title="Lock" aria-label="Lock" @click="lock">
          <i class="bi bi-lock"></i>
        </button>
        <button class="icon-btn" title="Log out" aria-label="Log out" @click="logout">
          <i class="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </header>

    <div class="search-box">
      <i class="bi bi-search search-icon"></i>
      <input v-model="search" type="text" placeholder="Search vault..." />
    </div>

    <p v-if="error && !activeId" class="error" style="margin-bottom: 12px">{{ error }}</p>

    <div v-for="entry in filtered" :key="entry.id" class="entry-card" :class="{ active: activeId === entry.id }" @click="toggle(entry)">
      <div class="entry-avatar" :style="{ background: colorOf(entry.appsource) }">
        {{ entry.appsource.charAt(0).toUpperCase() }}
      </div>
      <div class="entry-body">
        <div class="entry-name">{{ entry.appsource }}</div>
        <div class="entry-meta">{{ entry.updatedAt ? timeAgo(entry.updatedAt) : "" }}</div>
      </div>
      <i class="bi entry-chevron" :class="activeId === entry.id ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
    </div>

    <Transition name="expand">
      <div v-if="activeId && detail" class="detail-card">
        <div class="detail-header">
          <div class="entry-avatar" :style="{ background: colorOf(detail.appsource) }">
            {{ detail.appsource.charAt(0).toUpperCase() }}
          </div>
          <div class="detail-header-body">
            <div class="entry-name">{{ detail.appsource }}</div>
          </div>
          <button class="copy-btn" @click="showSecret = !showSecret" :title="showSecret ? 'Hide' : 'Show'">
            <i class="bi" :class="showSecret ? 'bi-eye-slash' : 'bi-eye'"></i>
          </button>
        </div>

        <p v-if="error" class="error" style="text-align: left; margin-bottom: 8px">{{ error }}</p>

        <div class="detail-field">
          <span class="detail-label">Username</span>
          <div class="detail-value-row">
            <span class="detail-value">{{ detail.username }}</span>
            <button class="copy-btn" title="Copy username" @click.stop="copy(detail.username, 'Username')">
              <i class="bi bi-clipboard"></i>
            </button>
          </div>
        </div>

        <div class="detail-field">
          <span class="detail-label">Password</span>
          <div class="detail-value-row">
            <span class="detail-value" :class="{ masked: !showSecret }">
              {{ showSecret ? detail.password : "••••••••••" }}
            </span>
            <button class="copy-btn" title="Copy password" @click.stop="copy(detail.password, 'Password')">
              <i class="bi bi-clipboard"></i>
            </button>
          </div>
        </div>

        <div v-if="detail.notes" class="detail-field">
          <span class="detail-label">Notes</span>
          <span class="detail-value">{{ detail.notes }}</span>
        </div>

        <div class="detail-actions">
          <button class="btn-inline edit" @click="openEdit">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn-inline delete" @click.stop="confirmDelete">
            <i class="bi bi-trash"></i> Delete
          </button>
        </div>
      </div>
    </Transition>

    <div v-if="!busy && filtered.length === 0 && entries.length === 0" class="empty-state">
      <div class="empty-icon"><i class="bi bi-shield-lock"></i></div>
      <p class="empty-title">No entries yet</p>
      <p class="empty-sub">Tap + to add your first credential</p>
    </div>

    <div v-if="!busy && filtered.length === 0 && entries.length > 0" class="empty-state">
      <div class="empty-icon"><i class="bi bi-search"></i></div>
      <p class="empty-title">No results</p>
      <p class="empty-sub">Try a different search term</p>
    </div>

    <button class="fab" title="Add entry" aria-label="Add entry" @click="openAdd">
      <i class="bi bi-plus-lg"></i>
    </button>
  </div>

  <Teleport to="body">
    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h2>{{ modal.editing ? "Edit entry" : "New vault" }}</h2>

        <div class="form-group">
          <label for="m-appsrc">App / Source</label>
          <input id="m-appsrc" v-model="modal.appsource" type="text" placeholder="e.g. GitHub" />
        </div>
        <div class="form-group">
          <label for="m-user">Username</label>
          <input id="m-user" v-model="modal.username" type="text" autocomplete="off" />
        </div>
        <div class="form-group">
          <div class="form-label-row">
            <label for="m-pass">Password</label>
            <button
              type="button"
              class="gen-trigger-btn"
              title="Buat kata sandi unik & kuat otomatis"
              @click="openStandaloneGenerator"
            >
              <i class="bi bi-magic"></i> Buat Sandi Kuat
            </button>
          </div>
          <div class="input-wrap">
            <input
              id="m-pass"
              v-model="modal.password"
              :type="modalShowPassword ? 'text' : 'password'"
              autocomplete="off"
              placeholder="Ketik atau buat otomatis"
            />
            <button
              type="button"
              class="toggle-vis"
              :aria-label="modalShowPassword ? 'Hide password' : 'Show password'"
              :title="modalShowPassword ? 'Hide password' : 'Show password'"
              @click="modalShowPassword = !modalShowPassword"
            >
              <i class="bi" :class="modalShowPassword ? 'bi-eye-slash' : 'bi-eye'"></i>
            </button>
          </div>
        </div>
        <div class="form-group">
          <label for="m-notes">Notes</label>
          <input id="m-notes" v-model="modal.notes" type="text" autocomplete="off" placeholder="Optional" />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="modal.open = false">Cancel</button>
          <button class="btn btn-primary" :disabled="busy" @click="save">
            <i class="bi bi-check-lg"></i>
            {{ busy ? "Saving..." : "Save" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Password Generator Modal -->
  <Teleport to="body">
    <div v-if="genModal.open" class="modal-backdrop gen-backdrop" @click.self="genModal.open = false">
      <div class="modal-sheet gen-modal-card">
        <div class="modal-handle"></div>
        <div class="gen-header">
          <div class="gen-title">
            <i class="bi bi-key-fill text-accent"></i>
            <h2>Generator Kata Sandi Unik</h2>
          </div>
          <button class="icon-btn-close" title="Tutup" @click="genModal.open = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <!-- Output Display Box -->
        <div class="gen-output-box">
          <div class="gen-password-text" :class="{ masked: !genModal.showPlaintext }">
            {{ genModal.showPlaintext ? genModal.password : "••••••••••••••••••" }}
          </div>
          <div class="gen-output-actions">
            <button
              type="button"
              class="icon-btn-sm"
              :title="genModal.showPlaintext ? 'Sembunyikan' : 'Tampilkan'"
              @click="genModal.showPlaintext = !genModal.showPlaintext"
            >
              <i class="bi" :class="genModal.showPlaintext ? 'bi-eye-slash' : 'bi-eye'"></i>
            </button>
            <button
              type="button"
              class="icon-btn-sm"
              title="Acak Ulang"
              @click="refreshGenerator"
            >
              <i class="bi bi-arrow-clockwise"></i>
            </button>
            <button
              type="button"
              class="icon-btn-sm"
              title="Salin ke Clipboard"
              @click="copy(genModal.password, 'Kata sandi')"
            >
              <i class="bi bi-clipboard"></i>
            </button>
          </div>
        </div>

        <!-- Strength Meter Bar -->
        <div class="gen-strength-meter">
          <div class="gen-strength-track">
            <div
              class="gen-strength-fill"
              :style="{ width: `${genStrength.percent}%`, background: genStrength.color }"
            ></div>
          </div>
          <div class="gen-strength-label" :style="{ color: genStrength.color }">
            <i class="bi bi-shield-check"></i>
            <span>{{ genStrength.label }}</span>
          </div>
        </div>

        <!-- Mode Tabs -->
        <div class="gen-mode-tabs">
          <button
            type="button"
            class="gen-mode-tab"
            :class="{ active: genModal.mode === 'chars' }"
            @click="genModal.mode = 'chars'"
          >
            <i class="bi bi-shuffle"></i> Karakter Acak
          </button>
          <button
            type="button"
            class="gen-mode-tab"
            :class="{ active: genModal.mode === 'passphrase' }"
            @click="genModal.mode = 'passphrase'"
          >
            <i class="bi bi-chat-square-quote"></i> Passphrase Mudah Diingat
          </button>
        </div>

        <!-- Mode 1: Random Characters -->
        <div v-if="genModal.mode === 'chars'" class="gen-options-panel">
          <div class="gen-slider-row">
            <div class="gen-slider-header">
              <span>Panjang Karakter</span>
              <span class="gen-counter">{{ genModal.length }}</span>
            </div>
            <input
              v-model="genModal.length"
              type="range"
              min="8"
              max="64"
              class="gen-range-slider"
            />
          </div>

          <div class="gen-checkbox-grid">
            <label class="gen-check-item">
              <input v-model="genModal.uppercase" type="checkbox" />
              <span>Huruf Besar (A-Z)</span>
            </label>
            <label class="gen-check-item">
              <input v-model="genModal.lowercase" type="checkbox" />
              <span>Huruf Kecil (a-z)</span>
            </label>
            <label class="gen-check-item">
              <input v-model="genModal.numbers" type="checkbox" />
              <span>Angka (0-9)</span>
            </label>
            <label class="gen-check-item">
              <input v-model="genModal.symbols" type="checkbox" />
              <span>Simbol (!@#$)</span>
            </label>
            <label class="gen-check-item full-span">
              <input v-model="genModal.avoidAmbiguous" type="checkbox" />
              <span>Hindari Karakter Serupa (0, O, 1, l, I)</span>
            </label>
          </div>
        </div>

        <!-- Mode 2: Passphrase (Diceware) -->
        <div v-else class="gen-options-panel">
          <div class="gen-slider-row">
            <div class="gen-slider-header">
              <span>Jumlah Kata</span>
              <span class="gen-counter">{{ genModal.wordCount }} kata</span>
            </div>
            <input
              v-model="genModal.wordCount"
              type="range"
              min="3"
              max="8"
              class="gen-range-slider"
            />
          </div>

          <div class="gen-separator-row">
            <span>Tanda Pemisah</span>
            <div class="gen-sep-pills">
              <button
                type="button"
                class="sep-btn"
                :class="{ active: genModal.separator === '-' }"
                @click="genModal.separator = '-'"
              >
                Hubung ( - )
              </button>
              <button
                type="button"
                class="sep-btn"
                :class="{ active: genModal.separator === '_' }"
                @click="genModal.separator = '_'"
              >
                Garis Bawah ( _ )
              </button>
              <button
                type="button"
                class="sep-btn"
                :class="{ active: genModal.separator === '.' }"
                @click="genModal.separator = '.'"
              >
                Titik ( . )
              </button>
              <button
                type="button"
                class="sep-btn"
                :class="{ active: genModal.separator === ' ' }"
                @click="genModal.separator = ' '"
              >
                Spasi
              </button>
            </div>
          </div>

          <div class="gen-checkbox-grid">
            <label class="gen-check-item">
              <input v-model="genModal.capitalize" type="checkbox" />
              <span>Kapitalkan Setiap Kata</span>
            </label>
            <label class="gen-check-item">
              <input v-model="genModal.includeNumber" type="checkbox" />
              <span>Sertakan Angka Acak</span>
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions gen-modal-actions">
          <button class="btn btn-secondary" @click="genModal.open = false">Tutup</button>
          <button class="btn btn-primary" @click="applyGeneratedPassword">
            <i class="bi" :class="modal.open ? 'bi-check2-circle' : 'bi-clipboard-check'"></i>
            {{ modal.open ? "Gunakan Kata Sandi" : "Salin Kata Sandi" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <Transition name="confirm" appear>
      <div v-if="confirm.open" class="backdrop" @click.self="confirm.open = false">
        <div class="confirm-card">
          <div class="confirm-icon"><i class="bi bi-trash"></i></div>
          <h2>Confirm delete</h2>
          <p>Are you sure you want to delete <strong>{{ confirm.appsource }}</strong>? This action cannot be undone.</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" :disabled="confirm.deleteBusy" @click="confirm.open = false">
              Cancel
            </button>
            <button class="btn btn-danger" :disabled="confirm.deleteBusy" @click="remove">
              <i v-if="confirm.deleteBusy" class="bi bi-arrow-repeat"></i>
              <i v-else class="bi bi-trash"></i>
              {{ confirm.deleteBusy ? "Deleting..." : "Delete" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
