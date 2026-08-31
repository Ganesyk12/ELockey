<script setup lang="ts">
import { ref } from "vue";
import { api } from "../api";
import { setToken, state } from "../state";

const mode = ref<"login" | "register">("login");
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
    if (mode.value === "register") {
      await api.register(username.value.trim(), password.value);
      state.notice = `Account "${username.value.trim()}" created. Set your master key below.`;
    }
    const { token } = await api.login(username.value.trim(), password.value);
    setToken(token);
    state.unlocked = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

function toggleMode() {
  mode.value = mode.value === "login" ? "register" : "login";
  error.value = "";
  state.notice = "";
}

async function submitOnEnter(e: KeyboardEvent) {
  if (e.key === "Enter") await submit();
}
</script>

<template>
  <div class="card">
    <h1>ELockey Vault</h1>
    <p v-if="mode === 'login'" class="subtitle">Log in to your vault.</p>
    <p v-else class="subtitle">Create an account. You'll set your master key next.</p>

    <label for="li-user"><i class="bi bi-person"></i> Username</label>
    <input id="li-user" v-model="username" type="text" autocomplete="username" @keydown="submitOnEnter" />

    <label for="li-pass"><i class="bi bi-shield-lock"></i> Password</label>
    <input id="li-pass" v-model="password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" @keydown="submitOnEnter" />

    <p v-if="error" class="error">{{ error }}</p>

    <button :disabled="busy" @click="submit">
      <i class="bi" :class="mode === 'login' ? 'bi-box-arrow-in-right' : 'bi-person-plus'"></i>
      {{ busy ? (mode === "login" ? "Logging in…" : "Creating…") : (mode === "login" ? "Log in" : "Create account") }}
    </button>

    <button class="ghost toggle-mode" :disabled="busy" @click="toggleMode">
      <i class="bi" :class="mode === 'login' ? 'bi-person-plus' : 'bi-box-arrow-in-right'"></i>
      {{ mode === "login" ? "Create an account" : "Log in instead" }}
    </button>
  </div>
</template>