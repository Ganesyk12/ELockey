<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { api, type EntryDetail, type EntryMeta } from "../api";
import { state } from "../state";

const entries = ref<EntryMeta[]>([]);
const detail = ref<EntryDetail | null>(null);
const activeId = ref<string | null>(null);
const showSecret = ref(false);
const error = ref("");
const notice = ref("");
const busy = ref(false);

const modal = reactive({
  open: false,
  editing: false,
  id: "",
  appsource: "",
  username: "",
  password: "",
  notes: "",
});

let noticeTimer: ReturnType<typeof setTimeout> | undefined;
function showNotice(msg: string) {
  notice.value = msg;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    notice.value = "";
  }, 3000);
}

async function load() {
  error.value = "";
  busy.value = true;
  try {
    const res = await api.list();
    entries.value = res.entries;
    const entry = entries.value.find((e) => e.id === activeId.value);
    if (entry) {
      await select(entry);
    } else {
      detail.value = null;
      activeId.value = null;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

async function select(entry?: EntryMeta) {
  if (!entry || !entry.id) return;
  if (activeId.value === entry.id) {
    activeId.value = null;
    detail.value = null;
    return;
  }
  error.value = "";
  activeId.value = entry.id;
  showSecret.value = false;
  try {
    detail.value = await api.get(entry.id);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    detail.value = null;
  }
}

function openAdd() {
  Object.assign(modal, {
    open: true,
    editing: false,
    id: "",
    appsource: "",
    username: "",
    password: "",
    notes: "",
  });
}

function openEdit() {
  if (!detail.value) return;
  Object.assign(modal, {
    open: true,
    editing: true,
    id: detail.value.id,
    appsource: detail.value.appsource,
    username: detail.value.username ?? "",
    password: detail.value.password ?? "",
    notes: detail.value.notes ?? "",
  });
}

async function save() {
  error.value = "";
  if (!modal.appsource.trim() || (!modal.editing && (!modal.username || !modal.password))) {
    error.value = "appsource, username and password are required.";
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
    if (modal.editing) {
      await api.update(modal.id, input);
    } else {
      await api.create(input);
    }
    modal.open = false;
    await load();
    showNotice(modal.editing ? "Entry updated." : "Entry created.");
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

async function remove() {
  if (!detail.value) return;
  if (!window.confirm(`Delete "${detail.value.appsource}"?`)) return;
  error.value = "";
  busy.value = true;
  try {
    await api.remove(detail.value.id);
    detail.value = null;
    activeId.value = null;
    await load();
    showNotice("Entry deleted.");
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

async function lock() {
  try {
    await api.lock();
  } catch {
    /* ignore */
  }
  state.unlocked = false;
}

async function logout() {
  try {
    await api.lock();
  } catch {
    /* ignore */
  }
  localStorage.removeItem("elockey.token");
  state.token = null;
  state.unlocked = false;
}

onMounted(load);
</script>

<template>
  <div class="card">
    <div class="row">
      <h1>Vault</h1>
      <div class="icon-group">
        <a class="link icon-link" title="Lock" aria-label="Lock" @click="lock"><i class="bi bi-lock"></i></a>
        <a class="link icon-link" title="Log out" aria-label="Log out" @click="logout"><i class="bi bi-box-arrow-right"></i></a>
      </div>
    </div>
    <p class="subtitle">All fields are encrypted with your master key.</p>

    <p v-if="error" class="error">{{ error }}</p>

    <template v-for="entry in entries" :key="entry.id">
      <div class="entry" :class="{ secret: false }" @click="select(entry)">
        <span class="name">
          <i class="bi" :class="activeId === entry.id ? 'bi-folder2-open' : 'bi-folder2'" style="margin-right: 6px; color: var(--muted)"></i>
          {{ entry.appsource }}
        </span>
        <span class="meta">
          {{ entry.updatedAt ? entry.updatedAt.replace("T", " ").slice(0, 16) : "" }}
          <template v-if="activeId === entry.id"> · <i class="bi bi-chevron-up"></i></template>
          <template v-else> · <i class="bi bi-chevron-down"></i></template>
        </span>
      </div>
    </template>

    <div v-if="!busy && entries.length === 0" class="empty">No entries yet. Add one below.</div>

    <button class="ghost" @click="openAdd"><i class="bi bi-plus-circle"></i> Add entry</button>
  </div>

  <div v-if="detail" class="card detail">
    <div class="row">
      <h2 style="margin: 0; font-size: 18px">{{ detail.appsource }}</h2>
      <div class="icon-group">
        <a class="link icon-link" title="Edit" aria-label="Edit" @click="openEdit"><i class="bi bi-pencil"></i></a>
        <a class="link icon-link danger" title="Delete" aria-label="Delete" @click="remove"><i class="bi bi-trash"></i></a>
      </div>
    </div>

    <div class="kv">
      <span class="k">Username</span>
      <span class="v">{{ detail.username }}</span>
    </div>
    <div class="kv">
      <span class="k">Password</span>
      <span
        class="v secret-reveal"
        :title="showSecret ? 'Click to hide' : 'Click to reveal'"
        @click="showSecret = !showSecret"
        ><i class="bi" :class="showSecret ? 'bi-eye-slash' : 'bi-eye'" style="margin-right: 6px"></i
        >{{ showSecret ? (detail.password ?? "") : "•".repeat(8) }}</span
      >
    </div>
    <div v-if="detail.notes" class="kv">
      <span class="k"><i class="bi bi-journal-text"></i> Notes</span>
      <span class="v">{{ detail.notes }}</span>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
      <div class="card modal">
        <h2 style="margin: 0 0 4px; font-size: 18px">
          {{ modal.editing ? "Edit entry" : "Add entry" }}
        </h2>

        <label for="m-appsrc"><i class="bi bi-globe"></i> App / source</label>
        <input id="m-appsrc" v-model="modal.appsource" type="text" />

        <label for="m-user"><i class="bi bi-person"></i> Username</label>
        <input id="m-user" v-model="modal.username" type="text" autocomplete="off" />

        <label for="m-pass"><i class="bi bi-shield-lock"></i> Password</label>
        <input id="m-pass" v-model="modal.password" type="password" autocomplete="off" />

        <label for="m-notes"><i class="bi bi-journal-text"></i> Notes</label>
        <input id="m-notes" v-model="modal.notes" type="text" autocomplete="off" />

<p v-if="error" class="error">{{ error }}</p>
    <p v-if="notice" class="notice">{{ notice }}</p>

        <div class="row" style="justify-content: flex-end">
          <button class="ghost" style="color: var(--muted)" @click="modal.open = false"><i class="bi bi-x-circle"></i> Cancel</button>
          <button :disabled="busy" @click="save"><i class="bi bi-check-lg"></i> Save</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>