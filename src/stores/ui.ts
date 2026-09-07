import { ref } from 'vue'
import { defineStore } from 'pinia'

/** Transient UI state shared across screens (not persisted). */
export const useUiStore = defineStore('ui', () => {
  const loadSheetOpen = ref(false)

  function openLoadSheet() {
    loadSheetOpen.value = true
  }

  function closeLoadSheet() {
    loadSheetOpen.value = false
  }

  return { loadSheetOpen, openLoadSheet, closeLoadSheet }
})
