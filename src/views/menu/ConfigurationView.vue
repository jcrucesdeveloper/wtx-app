<script setup lang="ts">
import { storeToRefs } from 'pinia'
import AppPage from '@/components/AppPage.vue'
import ColorPicker from '@/components/ColorPicker.vue'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
const { accent } = storeToRefs(theme)
</script>

<template>
  <AppPage title="Configuration">
    <div class="group">
      <h2 class="group__title">Accent color</h2>
      <p class="group__hint">Pick the color used across the app.</p>
      <ColorPicker v-model="accent" />
    </div>
  </AppPage>
</template>

<style scoped>
.group {
  padding: 16px;
  border-radius: 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.group__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-heading);
}

.group__hint {
  font-size: 13px;
  opacity: 0.7;
  margin: 2px 0 16px;
}
</style>
