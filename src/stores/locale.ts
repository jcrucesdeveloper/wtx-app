import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { i18n, SUPPORTED_LOCALES, type Locale } from '@/i18n'

const LOCALE_STORAGE_KEY = 'wtx:locale'

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) return stored as Locale
  } catch {
    /* storage unavailable — fall through to device detection */
  }

  const device = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en'
  return (SUPPORTED_LOCALES as readonly string[]).includes(device) ? (device as Locale) : 'en'
}

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref<Locale>(detectLocale())

  i18n.global.locale.value = locale.value

  watch(locale, (value) => {
    i18n.global.locale.value = value
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, value)
    } catch {
      /* storage unavailable — keep the in-memory value */
    }
  })

  function setLocale(value: Locale) {
    locale.value = value
  }

  return { locale, setLocale }
})
