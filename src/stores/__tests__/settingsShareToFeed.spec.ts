import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '@/stores/settings'

const KEY = 'wtx:share-to-feed-default'

describe('settings: share to feed default', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('is on until the user unticks it (accepted with the Terms on sign-up)', () => {
    expect(useSettingsStore().shareToFeedDefault).toBe(true)
  })

  it("keeps the user's last choice", () => {
    localStorage.setItem(KEY, '1')
    expect(useSettingsStore().shareToFeedDefault).toBe(true)

    setActivePinia(createPinia())
    localStorage.setItem(KEY, '0')
    expect(useSettingsStore().shareToFeedDefault).toBe(false)
  })
})
