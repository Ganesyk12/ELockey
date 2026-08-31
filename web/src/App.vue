<script setup lang="ts">
import { onMounted } from "vue";
import { api } from "./api";
import { state, toggleTheme } from "./state";
import SetupView from "./views/SetupView.vue";
import LoginView from "./views/LoginView.vue";
import UnlockView from "./views/UnlockView.vue";
import VaultView from "./views/VaultView.vue";

onMounted(async () => {
  try {
    const res = await api.status();
    state.setup = res.setup;
  } finally {
    state.ready = true;
  }
});
</script>

<template>
  <button
    v-if="state.ready && !state.unlocked"
    class="icon-btn theme-fab"
    title="Toggle theme"
    aria-label="Toggle theme"
    @click="toggleTheme"
  >
    <i class="bi" :class="state.theme === 'dark' ? 'bi-sun' : 'bi-moon'"></i>
  </button>

  <div v-if="!state.ready" class="auth-page">
    <div class="loading">Loading&hellip;</div>
  </div>
  <div v-else-if="!state.setup" class="auth-page">
    <SetupView />
  </div>
  <div v-else-if="!state.token" class="auth-page">
    <LoginView />
  </div>
  <div v-else-if="!state.unlocked" class="auth-page">
    <UnlockView />
  </div>
  <div v-else>
    <VaultView />
  </div>
</template>