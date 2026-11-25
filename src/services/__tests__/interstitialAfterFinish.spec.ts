import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const admob = vi.hoisted(() => ({
  initialize: vi.fn<(opts: unknown) => Promise<void>>(async () => {}),
  requestConsentInfo: vi.fn<() => Promise<Record<string, unknown>>>(async () => ({
    status: 'OBTAINED',
    isConsentFormAvailable: false,
    canRequestAds: true,
    privacyOptionsRequirementStatus: 'NOT_REQUIRED',
  })),
  showConsentForm: vi.fn<() => Promise<unknown>>(),
  trackingAuthorizationStatus: vi.fn<() => Promise<{ status: string }>>(async () => ({
    status: 'authorized',
  })),
  requestTrackingAuthorization: vi.fn<() => Promise<void>>(),
  prepareInterstitial: vi.fn<(opts: unknown) => Promise<void>>(async () => {}),
  showInterstitial: vi.fn<() => Promise<void>>(async () => {}),
}))

vi.mock('@capacitor-community/admob', () => ({
  AdMob: admob,
  AdmobConsentStatus: { REQUIRED: 'REQUIRED' },
}))
const startio = vi.hoisted(() => ({
  initialize: vi.fn<(opts: unknown) => Promise<void>>(async () => {}),
  prepareInterstitial: vi.fn<() => Promise<void>>(async () => {}),
  showInterstitial: vi.fn<() => Promise<{ shown: boolean }>>(async () => ({ shown: true })),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android' },
  registerPlugin: () => startio,
}))

import {
  INTERSTITIAL_COOLDOWN_MS,
  INTERSTITIAL_DELAY_MS,
  interstitialCooledDown,
} from '@/services/ads'

// The service keeps whether an ad is loaded in module state: each test gets a
// fresh copy, as a fresh app launch would.
let AdService: typeof import('@/services/ads').AdService
let useAdsStore: typeof import('@/stores/ads').useAdsStore

describe('interstitialCooledDown', () => {
  it('allows the first ad ever', () => {
    expect(interstitialCooledDown(null, 1_000)).toBe(true)
  })

  it('waits out the cooldown after an ad', () => {
    const shownAt = 1_000_000
    expect(interstitialCooledDown(shownAt, shownAt + INTERSTITIAL_COOLDOWN_MS - 1)).toBe(false)
    expect(interstitialCooledDown(shownAt, shownAt + INTERSTITIAL_COOLDOWN_MS)).toBe(true)
  })
})

describe('AdService.showAfterFinish (after Done on the finish screen)', () => {
  beforeEach(async () => {
    vi.resetModules()
    ;({ AdService } = await import('@/services/ads'))
    ;({ useAdsStore } = await import('@/stores/ads'))
    vi.stubEnv('VITE_ADS_ANDROID', 'true')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-13T10:00:00Z'))
    localStorage.clear()
    setActivePinia(createPinia())
    admob.showInterstitial.mockClear()
    admob.prepareInterstitial.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  async function finish() {
    const shown = AdService.showAfterFinish()
    await vi.advanceTimersByTimeAsync(INTERSTITIAL_DELAY_MS)
    return shown
  }

  it('shows the preloaded interstitial after the delay, then preloads the next', async () => {
    await AdService.loadInterstitial()
    expect(admob.prepareInterstitial).toHaveBeenCalledTimes(1)

    const shown = AdService.showAfterFinish()
    await vi.advanceTimersByTimeAsync(INTERSTITIAL_DELAY_MS - 1)
    expect(admob.showInterstitial).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(await shown).toBe(true)
    expect(admob.showInterstitial).toHaveBeenCalledTimes(1)
    await vi.runAllTimersAsync()
    expect(admob.prepareInterstitial).toHaveBeenCalledTimes(2)
  })

  it('shows at most one ad per cooldown', async () => {
    await AdService.loadInterstitial()
    expect(await finish()).toBe(true)
    await vi.runAllTimersAsync()

    // A second short workout right after: no ad, even with one preloaded.
    vi.setSystemTime(Date.now() + 60_000)
    expect(await finish()).toBe(false)
    expect(admob.showInterstitial).toHaveBeenCalledTimes(1)

    // Once the cooldown has passed, the next finish shows one again.
    vi.setSystemTime(Date.now() + INTERSTITIAL_COOLDOWN_MS)
    expect(await finish()).toBe(true)
    expect(admob.showInterstitial).toHaveBeenCalledTimes(2)
  })

  it('skips quietly when no ad has loaded', async () => {
    admob.prepareInterstitial.mockRejectedValueOnce(new Error('No fill'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await AdService.loadInterstitial()
    expect(await finish()).toBe(false)
    expect(admob.showInterstitial).not.toHaveBeenCalled()
  })

  it('never shows an ad once ads are removed', async () => {
    useAdsStore().setAdsRemoved(true)
    await AdService.loadInterstitial()
    expect(await finish()).toBe(false)
    expect(admob.showInterstitial).not.toHaveBeenCalled()
  })

  it('never shows an ad where the app has ads off', async () => {
    vi.stubEnv('VITE_ADS_ANDROID', 'false')
    expect(await finish()).toBe(false)
    expect(admob.showInterstitial).not.toHaveBeenCalled()
  })
})

describe('AdService with Start.io (VITE_AD_PROVIDER=startio)', () => {
  beforeEach(async () => {
    vi.resetModules()
    ;({ AdService } = await import('@/services/ads'))
    vi.stubEnv('VITE_ADS_ANDROID', 'true')
    vi.stubEnv('VITE_AD_PROVIDER', 'startio')
    vi.stubEnv('VITE_STARTIO_APP_ID', '123456789')
    vi.useFakeTimers()
    localStorage.clear()
    setActivePinia(createPinia())
    for (const fn of [...Object.values(startio), admob.prepareInterstitial, admob.showInterstitial])
      fn.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('starts Start.io after consent and serves the ad from it, not AdMob', async () => {
    await AdService.loadInterstitial()
    expect(startio.initialize).toHaveBeenCalledWith({ appId: '123456789', testing: true })
    expect(startio.prepareInterstitial).toHaveBeenCalledTimes(1)

    const shown = AdService.showAfterFinish()
    await vi.advanceTimersByTimeAsync(INTERSTITIAL_DELAY_MS)
    expect(await shown).toBe(true)
    expect(startio.showInterstitial).toHaveBeenCalledTimes(1)
    expect(admob.prepareInterstitial).not.toHaveBeenCalled()
    expect(admob.showInterstitial).not.toHaveBeenCalled()
  })

  it('never starts Start.io when consent says no ads', async () => {
    admob.requestConsentInfo.mockResolvedValueOnce({
      status: 'OBTAINED',
      isConsentFormAvailable: false,
      canRequestAds: false,
      privacyOptionsRequirementStatus: 'REQUIRED',
    })
    await AdService.loadInterstitial()
    expect(startio.initialize).not.toHaveBeenCalled()
    expect(startio.prepareInterstitial).not.toHaveBeenCalled()
  })
})
