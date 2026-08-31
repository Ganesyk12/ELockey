<script setup lang="ts">
import { onMounted } from "vue";
import { api } from "./api";
import { state } from "./state";
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
  <div v-show="!state.ready" class="auth-page">
    <div class="loading">Loading&hellip;</div>
  </div>
  <div v-show="state.ready && !state.setup" class="auth-page">
    <SetupView />
  </div>
  <div v-show="state.ready && state.setup && !state.token" class="auth-page">
    <LoginView />
  </div>
  <div v-show="state.ready && state.setup && state.token && !state.unlocked" class="auth-page">
    <UnlockView />
  </div>
  <div v-show="state.ready && state.setup && state.token && state.unlocked" class="page">
    <VaultView />
  </div>
</template>