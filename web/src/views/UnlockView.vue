<script setup lang="ts">
import { ref } from "vue";
import { api, ApiError } from "../api";
import { state } from "../state";

const masterKey = ref("");
const error = ref("");
const busy = ref(false);

async function submit() {
  error.value = "";
  if (!masterKey.value) {
    error.value = "Master key is required.";
    return;
  }
  busy.value = true;
  try {
    try {
      await api.unlock(masterKey.value);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        await api.setKey(masterKey.value);
        await api.unlock(masterKey.value);
      } else {
        throw e;
      }
    }
    state.unlocked = true;
    state.notice = "";
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

async function logout() {
  try { await api.lock(); } catch { /* ignore */ }
  localStorage.removeItem("elockey.token");
  state.token = null;
  state.unlocked = false;
}
</script>

<template>
  <div class="auth-card">
    <div class="auth-icon" style="background: rgba(16, 185, 129, 0.12); color: #10b981">
      <i class="bi bi-lock"></i>
    </div>
    <h1>Unlock Vault</h1>
    <p class="subtitle">Enter your master key to decrypt your credentials</p>

    <p v-if="state.notice" class="notice">{{ state.notice }}</p>

    <div class="form-group">
      <label for="uk-key">Master key</label>
      <input id="uk-key" v-model="masterKey" type="password" autocomplete="current-password" placeholder="Enter master key" @keydown.enter="submit" />
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <button class="btn btn-primary" :disabled="busy" @click="submit">
      {{ busy ? "Unlocking..." : "Unlock" }}
    </button>

    <button class="btn btn-ghost" @click="logout">
      <i class="bi bi-box-arrow-left"></i> Log out
    </button>
  </div>
</template>
