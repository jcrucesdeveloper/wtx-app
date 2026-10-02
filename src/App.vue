<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppTabBar from './components/AppTabBar.vue'
import GetAppBanner from './components/GetAppBanner.vue'
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
  <div class="app-shell" :class="{ 'app-shell--bare': !showChrome }">
    <!-- Not over a workout in progress: that screen is for logging, nothing else. -->
    <GetAppBanner v-if="showChrome && route.name !== 'active-session'" />
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
  /*
   * The web view runs edge-to-edge (viewport-fit=cover on iOS, Android 15+
   * edge-to-edge), so keep the scrolling content out from under the status
   * bar / notch / Dynamic Island and the landscape side cutouts. The tab bar
   * pads for the bottom (home indicator / gesture nav) itself.
   */
  padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);
}

/* No tab bar (onboarding): the content itself reaches the bottom edge. */
.app-shell--bare {
  padding-bottom: env(safe-area-inset-bottom);
}

.app-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
