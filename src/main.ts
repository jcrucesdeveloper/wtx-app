import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { App as CapacitorApp } from '@capacitor/app'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { AdService } from './services/ads'
import { initCrashReporting } from './services/crashReporting'
import { setAnalyticsProvider, track } from './services/analytics'
import { supabaseAnalytics } from './services/supabaseAnalytics'
import { NotificationService } from './services/notifications'
import { initDeepLinks } from './services/deepLinks'
import { useAuthStore } from './stores/auth'
import { useRoomStore } from './stores/room'
import { useSyncStore } from './stores/sync'
import { useSessionsStore } from './stores/sessions'
import { useNotificationsStore } from './stores/notifications'
import { sessionDateStrs } from './lib/sessionDates'
import { closeTopOverlay } from './lib/backStack'

const app = createApp(App)

initCrashReporting(app)
app.use(createPinia())
app.use(router)
app.use(i18n)

// Before mount, so a link that launched the app is routed as early as possible.
initDeepLinks(router)

app.mount('#app')

// Accounts are optional: this restores a stored session (and starts sync) if there is one.
const auth = useAuthStore()
void auth.init()
// Created up front so it can follow the active session's sets during a group workout.
useRoomStore()

setAnalyticsProvider(supabaseAnalytics)
track('app_opened')

// Re-plan the reminder each time the app opens, so it reflects "trained today" accurately.
if (useNotificationsStore().remindersEnabled) {
  void NotificationService.schedule(sessionDateStrs(useSessionsStore()))
}

// Coming back to the app is a good moment to pick up changes from other devices.
CapacitorApp.addListener('appStateChange', ({ isActive }) => {
  if (isActive && auth.isLoggedIn) void useSyncStore().syncNow()
})

AdService.initAds()

// On Android, back first closes the topmost open sheet/dialog, then routes back
// through in-app history before exiting (no-op outside native).
CapacitorApp.addListener('backButton', () => {
  if (closeTopOverlay()) return
  if (window.history.state?.back) {
    router.back()
  } else {
    CapacitorApp.exitApp()
  }
})
