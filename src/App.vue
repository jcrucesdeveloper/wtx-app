<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppTabBar from './components/AppTabBar.vue'
import LoadRoutineSheet from './components/load/LoadRoutineSheet.vue'
import WtxActionSheet from './components/wtx/WtxActionSheet.vue'
import CreateRoutineSheet from './components/wtx/CreateRoutineSheet.vue'
import StartTrainingSheet from './components/routine/StartTrainingSheet.vue'
import ResumeSessionBanner from './components/session/ResumeSessionBanner.vue'
import { useThemeStore } from './stores/theme'
import { useUiStore } from './stores/ui'

// Initialise the theme so the stored accent color is applied on load.
useThemeStore()

const ui = useUiStore()
</script>

<template>
  <div class="app-shell">
    <main class="app-content">
      <RouterView v-slot="{ Component, route }">
        <Transition :name="(route.meta.transition as string | undefined) ?? ''" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <ResumeSessionBanner />
    <AppTabBar @menu="ui.open('menu')" />
    <WtxActionSheet />
    <StartTrainingSheet />
    <LoadRoutineSheet />
    <CreateRoutineSheet />
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
