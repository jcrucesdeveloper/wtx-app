import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { App as CapacitorApp } from '@capacitor/app'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// On Android, route back through in-app history before exiting (no-op outside native).
CapacitorApp.addListener('backButton', () => {
  if (window.history.state?.back) {
    router.back()
  } else {
    CapacitorApp.exitApp()
  }
})
