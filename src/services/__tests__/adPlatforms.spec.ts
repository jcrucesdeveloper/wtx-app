import { describe, it, expect, vi } from 'vitest'

vi.mock('@capacitor-community/admob', () => ({ AdMob: {}, AdmobConsentStatus: {} }))

import { adPlatforms } from '@/services/ads'

describe('adPlatforms', () => {
  it('shows no ads when the flag is unset or false', () => {
    expect(adPlatforms(undefined)).toEqual([])
    expect(adPlatforms('')).toEqual([])
    expect(adPlatforms('false')).toEqual([])
  })

  it('turns ads on for both apps with true', () => {
    expect(adPlatforms('true')).toEqual(['android', 'ios'])
  })

  it('keeps every platform not listed ad-free', () => {
    expect(adPlatforms('android')).toEqual(['android'])
    expect(adPlatforms(' Android , ios ')).toEqual(['android', 'ios'])
    expect(adPlatforms('android,web')).toEqual(['android'])
  })
})
