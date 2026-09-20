<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppPage from '@/components/AppPage.vue'
import ColorPicker from '@/components/ColorPicker.vue'
import ThemeModePicker from '@/components/ThemeModePicker.vue'
import { useThemeStore } from '@/stores/theme'
import { useRoutinesStore } from '@/stores/routines'
import { useSessionsStore } from '@/stores/sessions'
import { buildDataExportZip, downloadDataExport } from '@/lib/exportData'

const theme = useThemeStore()
const { accent, mode } = storeToRefs(theme)

const routines = useRoutinesStore()
const sessions = useSessionsStore()

const exported = ref(false)

function exportData() {
  const zip = buildDataExportZip(routines.routines, sessions.sessions)
  downloadDataExport(zip)
  exported.value = true
  setTimeout(() => {
    exported.value = false
  }, 1500)
}
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

      <div class="group">
        <h2 class="group__title">Data</h2>
        <p class="group__hint">Download every template and session as a .zip of .wtt/.wts files.</p>
        <button type="button" class="export-btn" @click="exportData">
          {{ exported ? 'Exported' : 'Export all data' }}
        </button>
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

.export-btn {
  width: 100%;
  border: none;
  border-radius: var(--radius-md);
  padding: 13px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}
</style>
