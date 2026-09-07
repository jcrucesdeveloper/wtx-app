<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import AppTabBar from './components/AppTabBar.vue'
import { useThemeStore } from './stores/theme'

// Initialise the theme so the stored accent color is applied on load.
useThemeStore()

const router = useRouter()

function onLoad() {
  // Placeholder: kick off loading a routine.
  router.push('/templates')
}
</script>

<template>
  <div class="app-shell">
    <main class="app-content">
      <RouterView />
    </main>
    <AppTabBar @load="onLoad" />
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
