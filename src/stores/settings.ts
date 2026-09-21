import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const UNIT_STORAGE_KEY = 'wtx:default-unit'

export type WeightUnit = 'kg' | 'lb'

function readStoredUnit(): WeightUnit {
  try {
    return localStorage.getItem(UNIT_STORAGE_KEY) === 'lb' ? 'lb' : 'kg'
  } catch {
    return 'kg'
  }
}

/** App-wide preferences, distinct from {@link useThemeStore}'s display settings. */
export const useSettingsStore = defineStore('settings', () => {
  const defaultUnit = ref<WeightUnit>(readStoredUnit())

  watch(defaultUnit, (value) => {
    try {
      localStorage.setItem(UNIT_STORAGE_KEY, value)
    } catch {
      /* storage unavailable — keep the in-memory value */
    }
  })

  function setDefaultUnit(value: WeightUnit) {
    defaultUnit.value = value
  }

  return { defaultUnit, setDefaultUnit }
})
