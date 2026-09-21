import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const ADS_REMOVED_STORAGE_KEY = 'wtx:ads-removed'

function readStoredAdsRemoved(): boolean {
  try {
    return localStorage.getItem(ADS_REMOVED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Whether ads should show at all. No purchase flow exists yet — `setAdsRemoved`
 * is here so a future IAP flow has something real to call, and so QA can flip
 * it manually (e.g. via Vue devtools) without waiting on that flow.
 */
export const useAdsStore = defineStore('ads', () => {
  const adsRemoved = ref<boolean>(readStoredAdsRemoved())

  watch(adsRemoved, (value) => {
    try {
      localStorage.setItem(ADS_REMOVED_STORAGE_KEY, String(value))
    } catch {
      /* storage unavailable — keep the in-memory value */
    }
  })

  function setAdsRemoved(value: boolean) {
    adsRemoved.value = value
  }

  return { adsRemoved, setAdsRemoved }
})
