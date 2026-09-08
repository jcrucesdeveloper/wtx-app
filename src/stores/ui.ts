import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/** Bottom sheets that hang off the WTX button — only one is open at a time. */
export type Sheet = 'menu' | 'load' | 'create'

/** Transient UI state shared across screens (not persisted). */
export const useUiStore = defineStore('ui', () => {
  const activeSheet = ref<Sheet | null>(null)

  function open(sheet: Sheet) {
    activeSheet.value = sheet
  }

  function close() {
    activeSheet.value = null
  }

  const menuOpen = computed(() => activeSheet.value === 'menu')
  const loadSheetOpen = computed(() => activeSheet.value === 'load')
  const createSheetOpen = computed(() => activeSheet.value === 'create')

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
    menuOpen,
    loadSheetOpen,
    createSheetOpen,
    openLoadSheet,
    closeLoadSheet,
  }
})
