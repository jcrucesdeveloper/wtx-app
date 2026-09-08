<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppTabBar from './components/AppTabBar.vue'
import LoadRoutineSheet from './components/load/LoadRoutineSheet.vue'
import WtxActionSheet from './components/wtx/WtxActionSheet.vue'
import CreateRoutineSheet from './components/wtx/CreateRoutineSheet.vue'
import SharePickerSheet from './components/share/SharePickerSheet.vue'
import { useThemeStore } from './stores/theme'
import { useUiStore } from './stores/ui'

// Initialise the theme so the stored accent color is applied on load.
useThemeStore()

const ui = useUiStore()
</script>

<template>
  <div class="app-shell">
    <main class="app-content">
      <RouterView />
    </main>
    <AppTabBar @menu="ui.open('menu')" />
    <WtxActionSheet />
    <LoadRoutineSheet />
    <CreateRoutineSheet />
    <SharePickerSheet />
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
