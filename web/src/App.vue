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
  <div class="page">
    <div v-if="!state.ready" class="loading">Loading&hellip;</div>
    <template v-else-if="!state.setup">
      <SetupView />
    </template>
    <template v-else-if="!state.token">
      <LoginView />
    </template>
    <template v-else-if="!state.unlocked">
      <UnlockView />
    </template>
    <template v-else>
      <VaultView />
    </template>
  </div>
</template>