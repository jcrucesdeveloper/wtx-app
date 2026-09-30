<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Sparkles } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import ColorPicker from '@/components/ColorPicker.vue'
import ThemeModePicker from '@/components/ThemeModePicker.vue'
import UnitPicker from '@/components/UnitPicker.vue'
import LanguagePicker from '@/components/LanguagePicker.vue'
import AccountSection from '@/components/social/AccountSection.vue'
import { useThemeStore } from '@/stores/theme'
import { useSettingsStore } from '@/stores/settings'
import { useRoutinesStore } from '@/stores/routines'
import { useSessionsStore } from '@/stores/sessions'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useLocaleStore } from '@/stores/locale'
import { useNotificationsStore } from '@/stores/notifications'
import { useAdsStore } from '@/stores/ads'
import { AdService } from '@/services/ads'
import { NotificationService } from '@/services/notifications'
import { sessionDateStrs } from '@/lib/sessionDates'
import { SUPPORT_EMAIL } from '@/config/legal'
import { parseSessionText } from '@/lib/parseSession'
import {
  buildDataExportZip,
  downloadDataExport,
  importedSessionAddedAt,
  parseDataExportZip,
} from '@/lib/exportData'

const { t } = useI18n()

const theme = useThemeStore()
const { accent, mode } = storeToRefs(theme)

const settings = useSettingsStore()
const { defaultUnit } = storeToRefs(settings)

const localeStore = useLocaleStore()
const { locale } = storeToRefs(localeStore)

const routines = useRoutinesStore()
const sessions = useSessionsStore()
const activeSession = useActiveSessionStore()

const exported = ref(false)

async function exportData() {
  const zip = buildDataExportZip(routines.routines, sessions.sessions)
  try {
    await downloadDataExport(zip)
  } catch (err) {
    // Writing the file to the app's cache failed — nothing was handed off.
    console.error('[export] failed', err)
    return
  }
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
        ? t('settings.importSuccess', {
            routines: t('settings.importedRoutines', { count: routinesAdded }, routinesAdded),
            sessions: t('settings.importedSessions', { count: sessionsAdded }, sessionsAdded),
          })
        : t('settings.importNothing')
  } catch {
    importError.value = t('settings.importError')
  } finally {
    importing.value = false
  }
}

function resetAllData() {
  if (!confirm(t('settings.deleteAllConfirm'))) return
  routines.resetToDefaults()
  sessions.clear()
  activeSession.discard()
}

const appVersion = __APP_VERSION__

/**
 * Apple expects apps with user content to offer a way to reach the developer.
 * Hidden until VITE_SUPPORT_EMAIL is set, rather than showing a dead link.
 */
const supportHref = SUPPORT_EMAIL
  ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`WTX v${appVersion}`)}`
  : ''

/**
 * Hides the "Remove ads" purchase card until a real In-App Purchase flow exists.
 * App Review rejects a tappable price that does nothing (guideline 2.1), and a
 * working one must go through StoreKit / Play Billing (guideline 3.1.1) — not a
 * web checkout. Flip to `true` only once `onRemoveAdsClick` starts a real IAP.
 */
const REMOVE_ADS_PURCHASE_ENABLED = false

/** No-op until an IAP flow is wired up; the card is hidden by the flag above. */
function onRemoveAdsClick() {}

// Google's UMP requires a way to change ad consent later for users it asked
// (EEA/UK/...); only native builds show ads, and the store stays false on web.
const { privacyOptionsRequired } = storeToRefs(useAdsStore())
const openingPrivacyOptions = ref(false)

async function openAdPrivacyOptions() {
  if (openingPrivacyOptions.value) return
  openingPrivacyOptions.value = true
  try {
    await AdService.showPrivacyOptions()
  } finally {
    openingPrivacyOptions.value = false
  }
}

const notifications = useNotificationsStore()
const { remindersEnabled } = storeToRefs(notifications)
const remindersDenied = ref(false)

async function toggleReminders() {
  if (remindersEnabled.value) {
    notifications.setRemindersEnabled(false)
    await NotificationService.cancel()
    return
  }
  remindersDenied.value = false
  const granted = await NotificationService.requestPermission()
  if (!granted) {
    remindersDenied.value = true
    return
  }
  notifications.setRemindersEnabled(true)
  await NotificationService.schedule(sessionDateStrs(sessions))
}
</script>

<template>
  <AppPage :title="t('settings.title')">
    <div class="stack">
      <button
        v-if="REMOVE_ADS_PURCHASE_ENABLED"
        type="button"
        class="cta"
        @click="onRemoveAdsClick"
      >
        <span class="cta__icon">
          <Sparkles :size="18" :stroke-width="2.25" />
        </span>
        <span class="cta__body">
          <span class="cta__title">{{ t('settings.removeAds') }}</span>
          <span class="cta__hint">{{ t('settings.removeAdsHint') }}</span>
        </span>
        <span class="cta__price">$2.99</span>
      </button>

      <AccountSection />

      <div class="group">
        <h2 class="group__title">{{ t('settings.theme') }}</h2>
        <p class="group__hint">{{ t('settings.themeHint') }}</p>
        <ThemeModePicker v-model="mode" />
      </div>

      <div class="group">
        <h2 class="group__title">{{ t('settings.language') }}</h2>
        <p class="group__hint">{{ t('settings.languageHint') }}</p>
        <LanguagePicker v-model="locale" />
      </div>

      <div class="group">
        <h2 class="group__title">{{ t('settings.accentColor') }}</h2>
        <p class="group__hint">{{ t('settings.accentColorHint') }}</p>
        <ColorPicker v-model="accent" />
      </div>

      <div class="group">
        <h2 class="group__title">{{ t('settings.units') }}</h2>
        <p class="group__hint">{{ t('settings.unitsHint') }}</p>
        <UnitPicker v-model="defaultUnit" />
      </div>

      <div class="group">
        <h2 class="group__title">{{ t('settings.data') }}</h2>
        <p class="group__hint">{{ t('settings.dataExportHint') }}</p>
        <button type="button" class="export-btn" @click="exportData">
          {{ exported ? t('settings.exported') : t('settings.exportData') }}
        </button>

        <p class="group__hint group__hint--spaced">{{ t('settings.dataImportHint') }}</p>
        <label class="import-btn" :class="{ 'import-btn--busy': importing }">
          <input type="file" accept=".zip" :disabled="importing" @change="onImportFile" />
          {{ importing ? t('settings.importing') : t('settings.importData') }}
        </label>
        <p v-if="importMessage" class="msg">{{ importMessage }}</p>
        <p v-if="importError" class="msg msg--error">{{ importError }}</p>

        <p class="group__hint group__hint--spaced">{{ t('settings.dataDeleteHint') }}</p>
        <button type="button" class="danger-btn" @click="resetAllData">
          {{ t('settings.deleteAllData') }}
        </button>
      </div>

      <div class="group">
        <h2 class="group__title">{{ t('settings.reminders') }}</h2>
        <p class="group__hint">{{ t('settings.remindersHint') }}</p>
        <button type="button" class="export-btn" @click="toggleReminders">
          {{ remindersEnabled ? t('settings.remindersOn') : t('settings.enableReminders') }}
        </button>
        <p v-if="remindersDenied" class="msg msg--error">{{ t('settings.remindersDenied') }}</p>
      </div>

      <div class="group">
        <h2 class="group__title">{{ t('settings.about') }}</h2>
        <p class="group__hint group__hint--tight">{{ t('settings.version', { version: appVersion }) }}</p>
        <p class="group__hint group__hint--tight legal-links">
          <RouterLink :to="{ name: 'legal', params: { doc: 'privacy' } }">{{ t('legal.privacy.title') }}</RouterLink>
          ·
          <RouterLink :to="{ name: 'legal', params: { doc: 'terms' } }">{{ t('legal.terms.title') }}</RouterLink>
          <template v-if="supportHref">
            ·
            <a :href="supportHref">{{ t('settings.contactSupport') }}</a>
          </template>
        </p>
        <template v-if="privacyOptionsRequired">
          <p class="group__hint group__hint--spaced">{{ t('settings.adPrivacyHint') }}</p>
          <button
            type="button"
            class="import-btn"
            :disabled="openingPrivacyOptions"
            @click="openAdPrivacyOptions"
          >
            {{ t('settings.adPrivacy') }}
          </button>
        </template>
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

.legal-links a {
  color: var(--color-accent);
}
</style>
