import { Capacitor } from '@capacitor/core'
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  type AdMobBannerSize,
} from '@capacitor-community/admob'
import { useAdsStore } from '@/stores/ads'

/**
 * Google's public test ad unit IDs — always serve test creatives regardless of
 * account/app, safe to ship as the default so dev builds and anyone without a
 * real AdMob account never risk serving (or accidentally clicking) real ads.
 * https://developers.google.com/admob/android/test-ads / .../ios/test-ads
 */
const TEST_AD_UNIT_IDS = {
  bannerAndroid: 'ca-app-pub-3940256099942544/9214589741',
  bannerIos: 'ca-app-pub-3940256099942544/2934735716',
  interstitialAndroid: 'ca-app-pub-3940256099942544/1033173712',
  interstitialIos: 'ca-app-pub-3940256099942544/4411468910',
} as const

function isNativePlatform(): boolean {
  return Capacitor.getPlatform() !== 'web'
}

function bannerAdUnitId(): string {
  if (Capacitor.getPlatform() === 'ios') {
    return import.meta.env.VITE_ADMOB_BANNER_ID_IOS || TEST_AD_UNIT_IDS.bannerIos
  }
  return import.meta.env.VITE_ADMOB_BANNER_ID_ANDROID || TEST_AD_UNIT_IDS.bannerAndroid
}

function interstitialAdUnitId(): string {
  if (Capacitor.getPlatform() === 'ios') {
    return import.meta.env.VITE_ADMOB_INTERSTITIAL_ID_IOS || TEST_AD_UNIT_IDS.interstitialIos
  }
  return import.meta.env.VITE_ADMOB_INTERSTITIAL_ID_ANDROID || TEST_AD_UNIT_IDS.interstitialAndroid
}

let initPromise: Promise<void> | null = null
let interstitialReady = false

/**
 * Thin wrapper around @capacitor-community/admob. Every call is a safe no-op
 * on web and once the user has removed ads — callers never need to check
 * platform or the ads store themselves.
 */
export const AdService = {
  /** Runs the Mobile Ads SDK init, consent (UMP), and iOS ATT flows. Call once at startup. */
  initAds(): Promise<void> {
    if (!isNativePlatform()) return Promise.resolve()
    if (!initPromise) initPromise = doInit()
    return initPromise
  },

  async showBanner(): Promise<void> {
    const ads = useAdsStore()
    if (!isNativePlatform() || ads.adsRemoved) return
    try {
      await AdMob.showBanner({
        adId: bannerAdUnitId(),
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        isTesting: import.meta.env.DEV,
      })
    } catch (err) {
      console.error('[ads] showBanner failed', err)
    }
  },

  async hideBanner(): Promise<void> {
    if (!isNativePlatform()) return
    document.documentElement.style.setProperty('--ad-banner-height', '0px')
    try {
      await AdMob.removeBanner()
    } catch (err) {
      console.error('[ads] hideBanner failed', err)
    }
  },

  /** Pre-loads an interstitial so it's ready by the time a session finishes. */
  async loadInterstitial(): Promise<void> {
    const ads = useAdsStore()
    if (!isNativePlatform() || ads.adsRemoved || interstitialReady) return
    try {
      await AdMob.prepareInterstitial({
        adId: interstitialAdUnitId(),
        isTesting: import.meta.env.DEV,
      })
      interstitialReady = true
    } catch (err) {
      console.error('[ads] prepareInterstitial failed', err)
    }
  },

  async showInterstitial(): Promise<void> {
    const ads = useAdsStore()
    if (!isNativePlatform() || ads.adsRemoved || !interstitialReady) return
    interstitialReady = false
    try {
      await AdMob.showInterstitial()
    } catch (err) {
      console.error('[ads] showInterstitial failed', err)
    }
  },
}

async function doInit(): Promise<void> {
  try {
    const consent = await AdMob.requestConsentInfo()
    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
      await AdMob.showConsentForm()
    }
  } catch (err) {
    console.error('[ads] consent flow failed', err)
  }

  if (Capacitor.getPlatform() === 'ios') {
    try {
      await AdMob.requestTrackingAuthorization()
    } catch (err) {
      console.error('[ads] tracking authorization request failed', err)
    }
  }

  try {
    await AdMob.initialize({ initializeForTesting: import.meta.env.DEV })
  } catch (err) {
    console.error('[ads] initialize failed', err)
  }

  AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => {
    document.documentElement.style.setProperty('--ad-banner-height', `${size.height}px`)
  })
}
