<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Sparkles } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import HeaderLink from '@/components/ui/HeaderLink.vue'
import ColorPicker from '@/components/ColorPicker.vue'
import ThemeModePicker from '@/components/ThemeModePicker.vue'
import UnitPicker from '@/components/UnitPicker.vue'
import LanguagePicker from '@/components/LanguagePicker.vue'
import AccountSection from '@/components/social/AccountSection.vue'
import SettingsGroup from '@/components/settings/SettingsGroup.vue'
import SettingsRow from '@/components/settings/SettingsRow.vue'
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
const router = useRouter()

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

function contactSupport() {
  window.location.href = supportHref
}

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
  <AppPage sub :title="t('settings.title')">
    <template #leading>
      <HeaderLink kind="back" />
    </template>

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

      <SettingsGroup :title="t('settings.appearance')">
        <SettingsRow :label="t('settings.theme')">
          <template #below><ThemeModePicker v-model="mode" /></template>
        </SettingsRow>
        <SettingsRow :label="t('settings.accentColor')">
          <template #below><ColorPicker v-model="accent" class="accent" /></template>
        </SettingsRow>
        <SettingsRow :label="t('settings.language')">
          <template #below><LanguagePicker v-model="locale" /></template>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup :title="t('settings.training')">
        <SettingsRow :label="t('settings.units')" :hint="t('settings.unitsHint')">
          <template #below><UnitPicker v-model="defaultUnit" /></template>
        </SettingsRow>
        <SettingsRow :label="t('settings.reminders')" :hint="t('settings.remindersHint')">
          <button
            type="button"
            class="switch"
            role="switch"
            :aria-checked="remindersEnabled"
            :aria-label="t('settings.reminders')"
            @click="toggleReminders"
          >
            <i />
          </button>
          <template v-if="remindersDenied" #below>
            <p class="msg msg--error">{{ t('settings.remindersDenied') }}</p>
          </template>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup :title="t('settings.data')">
        <SettingsRow
          :label="exported ? t('settings.exported') : t('settings.exportData')"
          :hint="t('settings.dataExportHint')"
          action
          @click="exportData"
        />
        <!-- The file input covers the row, so the whole row opens the picker. -->
        <label class="file" :class="{ 'file--busy': importing }">
          <SettingsRow
            :label="importing ? t('settings.importing') : t('settings.importData')"
            :hint="t('settings.dataImportHint')"
          >
            <template v-if="importMessage || importError" #below>
              <p v-if="importMessage" class="msg">{{ importMessage }}</p>
              <p v-if="importError" class="msg msg--error">{{ importError }}</p>
            </template>
          </SettingsRow>
          <input type="file" accept=".zip" :disabled="importing" @change="onImportFile" />
        </label>
        <SettingsRow
          :label="t('settings.deleteAllData')"
          :hint="t('settings.dataDeleteHint')"
          action
          danger
          @click="resetAllData"
        />
      </SettingsGroup>

      <SettingsGroup :title="t('settings.about')">
        <SettingsRow :label="t('settings.version', { version: appVersion })" />
        <SettingsRow
          :label="t('legal.privacy.title')"
          action
          @click="router.push({ name: 'legal', params: { doc: 'privacy' } })"
        />
        <SettingsRow
          :label="t('legal.terms.title')"
          action
          @click="router.push({ name: 'legal', params: { doc: 'terms' } })"
        />
        <SettingsRow
          v-if="supportHref"
          :label="t('settings.contactSupport')"
          action
          @click="contactSupport"
        />
        <SettingsRow
          v-if="privacyOptionsRequired"
          :label="t('settings.adPrivacy')"
          :hint="t('settings.adPrivacyHint')"
          :disabled="openingPrivacyOptions"
          action
          @click="openAdPrivacyOptions"
        />
      </SettingsGroup>
    </div>
  </AppPage>
</template>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-top: 4px;
}

.cta {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
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
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--color-accent);
}

/* All the accent colours on one line. */
.accent.color-picker {
  grid-template-columns: repeat(9, 1fr);
  gap: 8px;
}

/* On or off, read by position and fill; the accent stays out of settings. */
.switch {
  position: relative;
  flex-shrink: 0;
  width: 52px;
  height: 32px;
  border: none;
  border-radius: 999px;
  background: var(--color-background-mute);
  box-shadow: inset 0 0 0 1px var(--color-border-hover);
  cursor: pointer;
}

.switch i {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-text);
}

.switch[aria-checked='true'] {
  background: var(--color-heading);
  box-shadow: none;
}

.switch[aria-checked='true'] i {
  transform: translateX(20px);
  background: var(--color-background);
}

@media (prefers-reduced-motion: no-preference) {
  .switch i {
    transition: transform 0.16s ease-out;
  }
}

.file {
  position: relative;
  display: block;
  cursor: pointer;
}

.file--busy {
  opacity: 0.7;
  cursor: default;
}

.file input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.file input:disabled {
  cursor: default;
}

.msg {
  font-size: 13px;
  line-height: 1.4;
}

.msg--error {
  color: #e11d48;
}
</style>
