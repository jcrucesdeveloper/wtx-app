<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppTabBar from './components/AppTabBar.vue'
import LoadRoutineSheet from './components/load/LoadRoutineSheet.vue'
import WtxActionSheet from './components/wtx/WtxActionSheet.vue'
import CreateRoutineSheet from './components/wtx/CreateRoutineSheet.vue'
import StartTrainingSheet from './components/routine/StartTrainingSheet.vue'
import ResumeSessionBanner from './components/session/ResumeSessionBanner.vue'
import RoomLiveLayer from './components/social/RoomLiveLayer.vue'
import { useThemeStore } from './stores/theme'
import { useUiStore } from './stores/ui'
import { useLocaleStore } from './stores/locale'

// Initialise the theme so the stored accent color is applied on load.
useThemeStore()
// Initialise the locale so the stored/detected language is applied on load.
useLocaleStore()

const ui = useUiStore()
const route = useRoute()
// The first-run intro is a standalone flow — no tab bar/banner underneath it.
const showChrome = computed(() => route.name !== 'onboarding')
</script>

<template>
  <div class="app-shell">
    <main class="app-content">
      <RouterView />
    </main>
    <template v-if="showChrome">
      <ResumeSessionBanner />
      <AppTabBar @menu="ui.open('menu')" />
    </template>
    <WtxActionSheet />
    <StartTrainingSheet />
    <LoadRoutineSheet />
    <CreateRoutineSheet />
    <RoomLiveLayer />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
