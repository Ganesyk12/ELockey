<script setup lang="ts">
import { ref } from "vue";
import { api } from "../api";
import { setToken, state } from "../state";

const username = ref("");
const masterKey = ref("");
const showKey = ref(false);
const error = ref("");
const busy = ref(false);

async function submit() {
  error.value = "";
  if (!username.value.trim() || !masterKey.value) {
    error.value = "Username and master key are required.";
    return;
  }
  busy.value = true;
  try {
    await api.register(username.value.trim(), masterKey.value);
    const { token } = await api.login(username.value.trim(), masterKey.value);
    setToken(token);
    await api.setKey(masterKey.value);
    await api.unlock(masterKey.value);
    state.unlocked = true;
    state.setup = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="card">
    <h1>ELockey Vault</h1>
    <p class="subtitle">First run — create the vault owner. The master key below is used to encrypt all credentials.</p>

    <label for="su-user"><i class="bi bi-person"></i> Username</label>
    <input id="su-user" v-model="username" type="text" autocomplete="username" />

    <label for="su-key"><i class="bi bi-key"></i> Master key</label>
    <div class="input-wrap">
      <input
        id="su-key"
        v-model="masterKey"
        :type="showKey ? 'text' : 'password'"
        autocomplete="new-password"
      />
      <button type="button" class="toggle" :aria-label="showKey ? 'Hide master key' : 'Show master key'" @click="showKey = !showKey">
        <i class="bi" :class="showKey ? 'bi-eye-slash' : 'bi-eye'"></i>
        {{ showKey ? "Hide" : "Show" }}
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="row">
      <button :disabled="busy" @click="submit">
        <i class="bi bi-key-fill"></i>
        {{ busy ? "Setting up…" : "Create vault" }}
      </button>
    </div>
  </div>
</template>