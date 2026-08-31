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
  <div class="auth-card">
    <div class="auth-icon">
      <i class="bi bi-key"></i>
    </div>
    <h1>ELockey Vault</h1>
    <p class="subtitle">First run — create the vault owner.<br />The master key encrypts all credentials.</p>

    <div class="form-group">
      <label for="su-user">Username</label>
      <input id="su-user" v-model="username" type="text" autocomplete="username" placeholder="Choose a username" />
    </div>
    <div class="form-group">
      <label for="su-key">Master key</label>
      <div class="input-wrap">
        <input
          id="su-key"
          v-model="masterKey"
          :type="showKey ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="Choose a strong master key"
        />
        <button type="button" class="toggle-vis" @click="showKey = !showKey">
          <i class="bi" :class="showKey ? 'bi-eye-slash' : 'bi-eye'"></i>
        </button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <button class="btn btn-primary" :disabled="busy" @click="submit">
      {{ busy ? "Setting up..." : "Create vault" }}
    </button>
  </div>
</template>
