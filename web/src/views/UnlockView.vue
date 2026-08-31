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
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
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
</script>

<template>
  <div class="card">
    <div class="row">
      <h1>Vault locked</h1>
      <a class="link icon-link" title="Log out" aria-label="Log out" @click="logout"><i class="bi bi-box-arrow-right"></i></a>
    </div>
    <p class="subtitle">Enter your master key to decrypt and access your credentials. It is kept in memory only.</p>

    <label for="uk-key"><i class="bi bi-key"></i> Master key</label>
    <input id="uk-key" v-model="masterKey" type="password" autocomplete="current-password" @keydown.enter="submit" />

    <p v-if="error" class="error">{{ error }}</p>

    <button :disabled="busy" @click="submit">
      <i class="bi bi-unlock"></i>
      {{ busy ? "Unlocking…" : "Unlock" }}
    </button>
  </div>
</template>