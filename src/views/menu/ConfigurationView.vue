<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Sparkles } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import ColorPicker from '@/components/ColorPicker.vue'
import ThemeModePicker from '@/components/ThemeModePicker.vue'
import UnitPicker from '@/components/UnitPicker.vue'
import { useThemeStore } from '@/stores/theme'
import { useSettingsStore } from '@/stores/settings'
import { useRoutinesStore } from '@/stores/routines'
import { useSessionsStore } from '@/stores/sessions'
import { useActiveSessionStore } from '@/stores/activeSession'
import { parseSessionText } from '@/lib/parseSession'
import {
  buildDataExportZip,
  downloadDataExport,
  importedSessionAddedAt,
  parseDataExportZip,
} from '@/lib/exportData'

const theme = useThemeStore()
const { accent, mode } = storeToRefs(theme)

const settings = useSettingsStore()
const { defaultUnit } = storeToRefs(settings)

const routines = useRoutinesStore()
const sessions = useSessionsStore()
const activeSession = useActiveSessionStore()

const exported = ref(false)

function exportData() {
  const zip = buildDataExportZip(routines.routines, sessions.sessions)
  downloadDataExport(zip)
  exported.value = true
  setTimeout(() => {
    exported.value = false
  }, 1500)
}

const importing = ref(false)
const importMessage = ref('')
const importError = ref('')

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  importMessage.value = ''
  importError.value = ''
  importing.value = true

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const parsed = parseDataExportZip(bytes)

    let routinesAdded = 0
    for (const { filename, rawText } of parsed.routines) {
      if (routines.findByText(rawText)) continue
      try {
        routines.add(rawText, filename)
        routinesAdded++
      } catch {
        /* not a valid .wtt — skip it */
      }
    }

    const existingSessionTexts = new Set(sessions.sessions.map((s) => s.rawText))
    let sessionsAdded = 0
    for (const { filename, rawText } of parsed.sessions) {
      if (existingSessionTexts.has(rawText)) continue
      const result = parseSessionText(rawText)
      if (!result.ok) continue
      const addedAt = importedSessionAddedAt(filename, result.session.date)
      sessions.add(rawText, undefined, addedAt)
      existingSessionTexts.add(rawText)
      sessionsAdded++
    }

    importMessage.value =
      routinesAdded || sessionsAdded
        ? `Imported ${routinesAdded} routine${routinesAdded === 1 ? '' : 's'} and ${sessionsAdded} session${sessionsAdded === 1 ? '' : 's'}.`
        : 'Nothing new to import — everything in that file is already here.'
  } catch {
    importError.value = 'Could not read that file — pick a .zip exported from WTX.'
  } finally {
    importing.value = false
  }
}

function resetAllData() {
  if (!confirm('Delete every routine and session? This cannot be undone.')) return
  routines.clear()
  sessions.clear()
  activeSession.discard()
}

const appVersion = __APP_VERSION__

/** No-op until ads/payment is wired up — the card is tappable but doesn't do anything yet. */
function onRemoveAdsClick() {}
</script>

<template>
  <AppPage title="Configuration">
    <div class="stack">
      <button type="button" class="cta" @click="onRemoveAdsClick">
        <span class="cta__icon">
          <Sparkles :size="18" :stroke-width="2.25" />
        </span>
        <span class="cta__body">
          <span class="cta__title">Remove ads forever</span>
          <span class="cta__hint">One-time payment. No subscriptions, no ads, ever.</span>
        </span>
        <span class="cta__price">$2.99</span>
      </button>

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
        <h2 class="group__title">Units</h2>
        <p class="group__hint">Used for new routines. Existing ones keep their own unit.</p>
        <UnitPicker v-model="defaultUnit" />
      </div>

      <div class="group">
        <h2 class="group__title">Data</h2>
        <p class="group__hint">Download every template and session as a .zip of .wtt/.wts files.</p>
        <button type="button" class="export-btn" @click="exportData">
          {{ exported ? 'Exported' : 'Export all data' }}
        </button>

        <p class="group__hint group__hint--spaced">Restore templates and sessions from an export.</p>
        <label class="import-btn" :class="{ 'import-btn--busy': importing }">
          <input type="file" accept=".zip" :disabled="importing" @change="onImportFile" />
          {{ importing ? 'Importing…' : 'Import data' }}
        </label>
        <p v-if="importMessage" class="msg">{{ importMessage }}</p>
        <p v-if="importError" class="msg msg--error">{{ importError }}</p>

        <p class="group__hint group__hint--spaced">Permanently erase every routine and session.</p>
        <button type="button" class="danger-btn" @click="resetAllData">Delete all data</button>
      </div>

      <div class="group">
        <h2 class="group__title">About</h2>
        <p class="group__hint group__hint--tight">WTX v{{ appVersion }}</p>
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

.cta {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--color-accent) 35%, var(--color-border));
  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-background-soft));
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.cta:active {
  background: color-mix(in srgb, var(--color-accent) 16%, var(--color-background-soft));
}

.cta__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #fff;
  background: var(--color-accent);
}

.cta__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.cta__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-heading);
}

.cta__hint {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 2px;
}

.cta__price {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--color-accent);
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

.group__hint--spaced {
  margin-top: 16px;
}

.group__hint--tight {
  margin-bottom: 0;
}

.export-btn,
.import-btn,
.danger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  border: none;
  border-radius: var(--radius-md);
  padding: 13px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  cursor: pointer;
}

.export-btn {
  color: #fff;
  background: var(--color-accent);
}

.import-btn {
  position: relative;
  color: var(--color-text);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border-hover);
  overflow: hidden;
}

.import-btn--busy {
  opacity: 0.7;
  cursor: default;
}

.import-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.import-btn input:disabled {
  cursor: default;
}

.danger-btn {
  color: #e11d48;
  background: transparent;
  border: 1px solid #e11d4855;
}

.msg {
  font-size: 12px;
  margin: 8px 0 0;
  opacity: 0.7;
}

.msg--error {
  color: #e11d48;
  opacity: 1;
}
</style>
