import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { App as CapacitorApp } from '@capacitor/app'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { AdService } from './services/ads'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')

AdService.initAds()

// On Android, route back through in-app history before exiting (no-op outside native).
CapacitorApp.addListener('backButton', () => {
  if (window.history.state?.back) {
    router.back()
  } else {
    CapacitorApp.exitApp()
  }
})
