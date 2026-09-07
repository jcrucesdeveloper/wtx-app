import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_ACCENT } from '@/config/theme'

const STORAGE_KEY = 'wtx:accent'

function readStoredAccent(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT
  } catch {
    return DEFAULT_ACCENT
  }
}

function applyAccent(value: string) {
  document.documentElement.style.setProperty('--color-accent', value)
}

export const useThemeStore = defineStore('theme', () => {
  const accent = ref(readStoredAccent())

  applyAccent(accent.value)

  watch(accent, (value) => {
    applyAccent(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* storage unavailable — keep the in-memory value */
    }
  })

  function setAccent(value: string) {
    accent.value = value
  }

  return { accent, setAccent }
})
