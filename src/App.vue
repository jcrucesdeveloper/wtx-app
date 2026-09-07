<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppTabBar from './components/AppTabBar.vue'
import { useThemeStore } from './stores/theme'

// Initialise the theme so the stored accent color is applied on load.
useThemeStore()
</script>

<template>
  <div class="app-shell">
    <main class="app-content">
      <RouterView />
    </main>
    <AppTabBar />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.app-content {
  flex: 1;
  overflow-y: auto;
}
</style>
