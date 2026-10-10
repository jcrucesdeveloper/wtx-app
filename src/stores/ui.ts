import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/** The app-wide bottom sheets — only one is open at a time. */
export type Sheet = 'start' | 'group' | 'load' | 'create' | 'shareProfile'

/** Transient UI state shared across screens (not persisted). */
export const useUiStore = defineStore('ui', () => {
  const activeSheet = ref<Sheet | null>(null)

  function open(sheet: Sheet) {
    activeSheet.value = sheet
  }

  function close() {
    activeSheet.value = null
  }

  const startSheetOpen = computed(() => activeSheet.value === 'start')
  /** The same routine picker, but picking creates a group workout room. */
  const groupSheetOpen = computed(() => activeSheet.value === 'group')
  const loadSheetOpen = computed(() => activeSheet.value === 'load')
  const createSheetOpen = computed(() => activeSheet.value === 'create')
  /** Your profile's QR and code, with the ways to send it on. */
  const shareProfileSheetOpen = computed(() => activeSheet.value === 'shareProfile')

  /** @deprecated Prefer `open('load')`. Kept for existing callers. */
  function openLoadSheet() {
    open('load')
  }

  /** @deprecated Prefer `close()`. Kept for existing callers. */
  function closeLoadSheet() {
    close()
  }

  return {
    activeSheet,
    open,
    close,
    startSheetOpen,
    groupSheetOpen,
    loadSheetOpen,
    createSheetOpen,
    shareProfileSheetOpen,
    openLoadSheet,
    closeLoadSheet,
  }
})
