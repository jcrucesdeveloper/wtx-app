import { describe, it, expect, vi } from 'vitest'

vi.mock('@capacitor-community/admob', () => ({ AdMob: {}, AdmobConsentStatus: {} }))

import { adsEnabledFor } from '@/services/ads'

describe('adsEnabledFor', () => {
  it('shows no ads when the switches are unset or not true', () => {
    expect(adsEnabledFor('android', {})).toBe(false)
    expect(adsEnabledFor('ios', { VITE_ADS_IOS: 'false' })).toBe(false)
    expect(adsEnabledFor('android', { VITE_ADS_ANDROID: 'yes' })).toBe(false)
  })

  it('turns each app on with its own switch only', () => {
    const env = { VITE_ADS_ANDROID: 'true', VITE_ADS_IOS: 'false' }
    expect(adsEnabledFor('android', env)).toBe(true)
    expect(adsEnabledFor('ios', env)).toBe(false)
    expect(adsEnabledFor('ios', { VITE_ADS_IOS: 'true' })).toBe(true)
  })

  it('never shows ads on the web', () => {
    expect(adsEnabledFor('web', { VITE_ADS_ANDROID: 'true', VITE_ADS_IOS: 'true' })).toBe(false)
  })
})
