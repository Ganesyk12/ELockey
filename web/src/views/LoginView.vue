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
      state.notice = `Account created. Set your master key next.`;
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
</script>

<template>
  <div class="auth-card">
    <div class="auth-icon">
      <i class="bi bi-shield-lock"></i>
    </div>
    <h1>ELockey Vault</h1>
    <p v-if="mode === 'login'" class="subtitle">Log in to access your vault</p>
    <p v-else class="subtitle">Create a new account</p>

    <div class="form-group">
      <label for="li-user">Username</label>
      <input id="li-user" v-model="username" type="text" autocomplete="username" placeholder="Enter username" @keydown.enter="submit" />
    </div>
    <div class="form-group">
      <label for="li-pass">Password</label>
      <input id="li-pass" v-model="password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" placeholder="Enter password" @keydown.enter="submit" />
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <button class="btn btn-primary" :disabled="busy" @click="submit">
      {{ busy ? (mode === "login" ? "Logging in..." : "Creating...") : (mode === "login" ? "Log in" : "Create account") }}
    </button>

    <button class="btn btn-ghost" :disabled="busy" @click="toggleMode">
      {{ mode === "login" ? "Create an account" : "Log in instead" }}
    </button>
  </div>
</template>
