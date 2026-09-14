import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_ACCENT } from '@/config/theme'

const ACCENT_STORAGE_KEY = 'wtx:accent'
const MODE_STORAGE_KEY = 'wtx:theme-mode'

/** `native` follows the OS/browser color scheme; `light`/`dark` force one. */
export type ThemeMode = 'native' | 'light' | 'dark'

function readStoredAccent(): string {
  try {
    return localStorage.getItem(ACCENT_STORAGE_KEY) ?? DEFAULT_ACCENT
  } catch {
    return DEFAULT_ACCENT
  }
}

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'native'
  } catch {
    return 'native'
  }
}

function applyAccent(value: string) {
  document.documentElement.style.setProperty('--color-accent', value)
}

function applyMode(mode: ThemeMode) {
  if (mode === 'native') {
    delete document.documentElement.dataset.theme
  } else {
    document.documentElement.dataset.theme = mode
  }
}

export const useThemeStore = defineStore('theme', () => {
  const accent = ref(readStoredAccent())
  const mode = ref<ThemeMode>(readStoredMode())

  applyAccent(accent.value)
  applyMode(mode.value)

  watch(accent, (value) => {
    applyAccent(value)
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, value)
    } catch {
      /* storage unavailable — keep the in-memory value */
    }
  })

  watch(mode, (value) => {
    applyMode(value)
    try {
      localStorage.setItem(MODE_STORAGE_KEY, value)
    } catch {
      /* storage unavailable — keep the in-memory value */
    }
  })

  function setAccent(value: string) {
    accent.value = value
  }

  function setMode(value: ThemeMode) {
    mode.value = value
  }

  return { accent, setAccent, mode, setMode }
})
