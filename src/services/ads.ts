import { Capacitor } from '@capacitor/core'
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob'
import { useAdsStore } from '@/stores/ads'

/**
 * Google's public test ad unit IDs — always serve test creatives regardless of
 * account/app, safe to ship as the default so dev builds and anyone without a
 * real AdMob account never risk serving (or accidentally clicking) real ads.
 * https://developers.google.com/admob/android/test-ads / .../ios/test-ads
 */
const TEST_AD_UNIT_IDS = {
  interstitialAndroid: 'ca-app-pub-3940256099942544/1033173712',
  interstitialIos: 'ca-app-pub-3940256099942544/4411468910',
} as const

/**
 * Ad test mode — ON unless a production build explicitly opts out with
 * VITE_ADMOB_TESTING=false. While on, every ad request uses Google's test ad
 * unit (the plugin's `isTesting` swaps the ID) so a dev/sideloaded build can't
 * serve or register clicks on real ads even with real IDs configured.
 */
const AD_TEST_MODE = import.meta.env.DEV || import.meta.env.VITE_ADMOB_TESTING !== 'false'

function isNativePlatform(): boolean {
  return Capacitor.getPlatform() !== 'web'
}

function interstitialAdUnitId(): string {
  if (Capacitor.getPlatform() === 'ios') {
    return import.meta.env.VITE_ADMOB_INTERSTITIAL_ID_IOS || TEST_AD_UNIT_IDS.interstitialIos
  }
  return import.meta.env.VITE_ADMOB_INTERSTITIAL_ID_ANDROID || TEST_AD_UNIT_IDS.interstitialAndroid
}

let initPromise: Promise<void> | null = null
let interstitialReady = false
/** UMP's verdict for this launch; stays false if the consent flow couldn't run. */
let canRequestAds = false

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

  /** Pre-loads an interstitial so it's ready by the time a session finishes. */
  async loadInterstitial(): Promise<void> {
    const ads = useAdsStore()
    if (!isNativePlatform() || ads.adsRemoved || interstitialReady) return
    // Never request an ad before consent (UMP) and ATT have been resolved —
    // a session can start while those prompts are still on screen.
    await AdService.initAds()
    if (!canRequestAds || interstitialReady) return
    try {
      await AdMob.prepareInterstitial({
        adId: interstitialAdUnitId(),
        isTesting: AD_TEST_MODE,
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

/**
 * Order matters:
 * 1. `initialize` first — the plugin only wires its consent executor to the
 *    native view controller inside `initialize` (on iOS `showConsentForm`
 *    rejects with "No ViewController" otherwise). Starting the SDK doesn't
 *    request any ad by itself.
 * 2. UMP consent (GDPR / US state privacy) — shows the form when required and
 *    tells us whether ads may be requested at all.
 * 3. iOS App Tracking Transparency — after UMP, as Google recommends, and
 *    before any ad request, so personalized ads only use the IDFA with the
 *    user's permission. Skipped if UMP's own IDFA explainer already asked.
 * Ads are only loaded after all of this resolves (see `loadInterstitial`).
 */
async function doInit(): Promise<void> {
  try {
    await AdMob.initialize({ initializeForTesting: AD_TEST_MODE })
  } catch (err) {
    console.error('[ads] initialize failed', err)
    return
  }

  try {
    let consent = await AdMob.requestConsentInfo()
    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
      consent = await AdMob.showConsentForm()
    }
    // `canRequestAds` exists since plugin 7.0.3; treat a missing value as allowed.
    canRequestAds = consent.canRequestAds !== false
  } catch (err) {
    // Without a consent answer we can't know whether ads are allowed for this
    // user (e.g. EEA), so skip ads for this launch rather than risk it.
    console.error('[ads] consent flow failed', err)
    canRequestAds = false
  }

  if (Capacitor.getPlatform() === 'ios') {
    try {
      const { status } = await AdMob.trackingAuthorizationStatus()
      if (status === 'notDetermined') await AdMob.requestTrackingAuthorization()
    } catch (err) {
      console.error('[ads] tracking authorization request failed', err)
    }
  }
}
