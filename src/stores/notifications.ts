import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'wtx:reminders-enabled'

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/** Whether workout-reminder local notifications are on — off by default, the user's call. */
export const useNotificationsStore = defineStore('notifications', () => {
  const remindersEnabled = ref<boolean>(readStored())

  watch(remindersEnabled, (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      /* storage unavailable — keep the in-memory value */
    }
  })

  function setRemindersEnabled(value: boolean) {
    remindersEnabled.value = value
  }

  return { remindersEnabled, setRemindersEnabled }
})
