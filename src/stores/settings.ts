import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const UNIT_STORAGE_KEY = 'wtx:default-unit'
const SAVE_TARGET_STORAGE_KEY = 'wtx:session-save-target'
const SHARE_TO_FEED_STORAGE_KEY = 'wtx:share-to-feed-default'

export type WeightUnit = 'kg' | 'lb'

/** Where a finished workout is kept: synced to the account, or on this device only. */
export type SessionSaveTarget = 'profile' | 'device'

function readStoredUnit(): WeightUnit {
  try {
    return localStorage.getItem(UNIT_STORAGE_KEY) === 'lb' ? 'lb' : 'kg'
  } catch {
    return 'kg'
  }
}

function readStoredSaveTarget(): SessionSaveTarget {
  try {
    return localStorage.getItem(SAVE_TARGET_STORAGE_KEY) === 'device' ? 'device' : 'profile'
  } catch {
    return 'profile'
  }
}

/** Defaults on: only people who already chose to follow you ever see a shared session. */
function readStoredShareToFeedDefault(): boolean {
  try {
    return localStorage.getItem(SHARE_TO_FEED_STORAGE_KEY) !== '0'
  } catch {
    return true
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

  /** Last save target picked when finishing a workout — preselected next time. */
  const sessionSaveTarget = ref<SessionSaveTarget>(readStoredSaveTarget())

  watch(sessionSaveTarget, (value) => {
    try {
      localStorage.setItem(SAVE_TARGET_STORAGE_KEY, value)
    } catch {
      /* storage unavailable — keep the in-memory value */
    }
  })

  function setSessionSaveTarget(value: SessionSaveTarget) {
    sessionSaveTarget.value = value
  }

  /** Last "share to feed" choice picked when finishing a workout — preselected next time. */
  const shareToFeedDefault = ref<boolean>(readStoredShareToFeedDefault())

  watch(shareToFeedDefault, (value) => {
    try {
      localStorage.setItem(SHARE_TO_FEED_STORAGE_KEY, value ? '1' : '0')
    } catch {
      /* storage unavailable — keep the in-memory value */
    }
  })

  function setShareToFeedDefault(value: boolean) {
    shareToFeedDefault.value = value
  }

  return {
    defaultUnit,
    setDefaultUnit,
    sessionSaveTarget,
    setSessionSaveTarget,
    shareToFeedDefault,
    setShareToFeedDefault,
  }
})
