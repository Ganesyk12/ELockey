<script setup lang="ts">
import { ref } from "vue";
import { api } from "../api";
import { setToken, state } from "../state";

const username = ref("");
const password = ref("");
const error = ref("");
const busy = ref(false);

async function submit() {
  error.value = "";
  if (!username.value.trim() || !password.value) {
    error.value = "Username and password are required.";
    return;
  }
  busy.value = true;
  try {
    const { token } = await api.login(username.value.trim(), password.value);
    setToken(token);
    state.unlocked = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

async function submitOnEnter(e: KeyboardEvent) {
  if (e.key === "Enter") await submit();
}
</script>

<template>
  <div class="card">
    <h1>ELockey Vault</h1>
    <p class="subtitle">Log in to your vault.</p>

    <label for="li-user"><i class="bi bi-person"></i> Username</label>
    <input id="li-user" v-model="username" type="text" autocomplete="username" @keydown="submitOnEnter" />

    <label for="li-pass"><i class="bi bi-shield-lock"></i> Password</label>
    <input id="li-pass" v-model="password" type="password" autocomplete="current-password" @keydown="submitOnEnter" />

    <p v-if="error" class="error">{{ error }}</p>

    <button :disabled="busy" @click="submit">
      <i class="bi bi-box-arrow-in-right"></i>
      {{ busy ? "Logging in…" : "Log in" }}
    </button>
  </div>
</template>