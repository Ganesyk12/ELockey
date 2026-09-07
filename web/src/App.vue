<script setup lang="ts">
import { onMounted } from "vue";
import { api } from "./api";
import { state, toggleTheme, openDocs } from "./state";
import SetupView from "./views/SetupView.vue";
import LoginView from "./views/LoginView.vue";
import UnlockView from "./views/UnlockView.vue";
import VaultView from "./views/VaultView.vue";
import DocsView from "./views/DocsView.vue";

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
  <DocsView v-if="state.showDocs" />
  <template v-else>
    <div v-if="state.ready && !state.unlocked" class="fab-group">
      <button
        class="icon-btn docs-fab"
        title="Dokumentasi & Panduan"
        aria-label="Dokumentasi & Panduan"
        @click="openDocs"
      >
        <i class="bi bi-book"></i>
      </button>
      <button
        class="icon-btn theme-fab"
        title="Toggle theme"
        aria-label="Toggle theme"
        @click="toggleTheme"
      >
        <i class="bi" :class="state.theme === 'dark' ? 'bi-sun' : 'bi-moon'"></i>
      </button>
    </div>

    <div v-if="!state.ready" class="auth-page">
      <div class="loading">Loading&hellip;</div>
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
</template>