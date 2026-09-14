<script setup lang="ts">
import { storeToRefs } from 'pinia'
import AppPage from '@/components/AppPage.vue'
import ColorPicker from '@/components/ColorPicker.vue'
import ThemeModePicker from '@/components/ThemeModePicker.vue'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
const { accent, mode } = storeToRefs(theme)
</script>

<template>
  <AppPage title="Configuration">
    <div class="stack">
      <div class="group">
        <h2 class="group__title">Theme</h2>
        <p class="group__hint">Native follows your device's setting.</p>
        <ThemeModePicker v-model="mode" />
      </div>

      <div class="group">
        <h2 class="group__title">Accent color</h2>
        <p class="group__hint">Pick the color used across the app.</p>
        <ColorPicker v-model="accent" />
      </div>
    </div>
  </AppPage>
</template>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.group {
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.group__title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: var(--color-heading);
}

.group__hint {
  font-size: 13px;
  opacity: 0.7;
  margin: 2px 0 16px;
}
</style>
