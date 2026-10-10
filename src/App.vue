<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppTabBar from './components/AppTabBar.vue'
import GetAppBanner from './components/GetAppBanner.vue'
import LoadRoutineSheet from './components/load/LoadRoutineSheet.vue'
import CreateRoutineSheet from './components/wtx/CreateRoutineSheet.vue'
import StartTrainingSheet from './components/routine/StartTrainingSheet.vue'
import ResumeSessionBanner from './components/session/ResumeSessionBanner.vue'
import RoomLiveLayer from './components/social/RoomLiveLayer.vue'
import ShareProfileSheet from './components/social/ShareProfileSheet.vue'
import { useThemeStore } from './stores/theme'
import { useLocaleStore } from './stores/locale'

// Initialise the theme so the stored accent color is applied on load.
useThemeStore()
// Initialise the locale so the stored/detected language is applied on load.
useLocaleStore()

const route = useRoute()

/**
 * Screens that own the whole display, with no tab bar under them: the
 * first-run intro, and a workout from its first set to its summary — a
 * self-contained task whose own dock sits where the tab bar would be.
 */
const BARE_ROUTES = ['onboarding', 'active-session', 'session-complete']
const showChrome = computed(() => !BARE_ROUTES.includes(String(route.name)))
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--bare': !showChrome }">
    <GetAppBanner v-if="showChrome" />
    <main class="app-content">
      <RouterView />
    </main>
    <template v-if="showChrome">
      <ResumeSessionBanner />
      <AppTabBar />
    </template>
    <StartTrainingSheet />
    <LoadRoutineSheet />
    <CreateRoutineSheet />
    <ShareProfileSheet />
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

/* No tab bar: the content itself reaches the bottom edge. */
.app-shell--bare {
  padding-bottom: env(safe-area-inset-bottom);
}

.app-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
