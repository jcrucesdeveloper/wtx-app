import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { App as CapacitorApp } from '@capacitor/app'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { AdService } from './services/ads'
import { useAuthStore } from './stores/auth'
import { useSyncStore } from './stores/sync'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')

// Accounts are optional: this restores a stored session (and starts sync) if there is one.
const auth = useAuthStore()
void auth.init()

// Coming back to the app is a good moment to pick up changes from other devices.
CapacitorApp.addListener('appStateChange', ({ isActive }) => {
  if (isActive && auth.isLoggedIn) void useSyncStore().syncNow()
})

AdService.initAds()

// On Android, route back through in-app history before exiting (no-op outside native).
CapacitorApp.addListener('backButton', () => {
  if (window.history.state?.back) {
    router.back()
  } else {
    CapacitorApp.exitApp()
  }
})
