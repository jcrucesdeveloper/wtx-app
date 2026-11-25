import { Capacitor, registerPlugin } from '@capacitor/core'
import { AdMob, AdmobConsentStatus, type AdmobConsentInfo } from '@capacitor-community/admob'
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

/**
 * One switch per app: VITE_ADS_ANDROID and VITE_ADS_IOS. Each is off unless set
 * to `true`, so one app can show ads while the other stays ad-free, even when
 * both are built from the same env. Where ads are off the Mobile Ads SDK is
 * never initialised: no consent form, no iOS tracking prompt and no ad request.
 * The web app never shows ads.
 */
export function adsEnabledFor(
  platform: string,
  env: { VITE_ADS_ANDROID?: string; VITE_ADS_IOS?: string },
): boolean {
  if (platform === 'android') return env.VITE_ADS_ANDROID === 'true'
  if (platform === 'ios') return env.VITE_ADS_IOS === 'true'
  return false
}

function adsAvailable(): boolean {
  return adsEnabledFor(Capacitor.getPlatform(), import.meta.env)
}

/**
 * Start.io, the stand-in network while AdMob can't serve (Android only,
 * `VITE_AD_PROVIDER=startio`). Native side: android/.../StartioPlugin.java.
 * AdMob's SDK still runs Google's consent form (UMP) either way, so the
 * consent flow and the "Ad privacy settings" row don't change.
 */
const Startio = registerPlugin<{
  initialize(options: { appId: string; testing: boolean }): Promise<void>
  prepareInterstitial(): Promise<void>
  showInterstitial(): Promise<{ shown: boolean }>
}>('WtxStartio')

function usesStartio(): boolean {
  return Capacitor.getPlatform() === 'android' && import.meta.env.VITE_AD_PROVIDER === 'startio'
}

function interstitialAdUnitId(): string {
  if (Capacitor.getPlatform() === 'ios') {
    return import.meta.env.VITE_ADMOB_INTERSTITIAL_ID_IOS || TEST_AD_UNIT_IDS.interstitialIos
  }
  return import.meta.env.VITE_ADMOB_INTERSTITIAL_ID_ANDROID || TEST_AD_UNIT_IDS.interstitialAndroid
}

/**
 * At most one interstitial per this window. AdMob forbids an interstitial
 * after every user action; a finish is a natural break, but two short
 * workouts back to back shouldn't mean two ads.
 */
export const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000

/**
 * The ad opens this long after Done, once the history screen is there: a
 * finger still on the glass mustn't land on the ad (accidental clicks are
 * invalid traffic), and it reads as a break rather than as the button's result.
 */
export const INTERSTITIAL_DELAY_MS = 400

const LAST_SHOWN_STORAGE_KEY = 'wtx:interstitial-shown-at'

/** Whether the cooldown since the last interstitial has run out. */
export function interstitialCooledDown(lastShownAt: number | null, now: number): boolean {
  return lastShownAt === null || now - lastShownAt >= INTERSTITIAL_COOLDOWN_MS
}

function readLastShownAt(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_SHOWN_STORAGE_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function writeLastShownAt(value: number) {
  try {
    localStorage.setItem(LAST_SHOWN_STORAGE_KEY, String(value))
  } catch {
    /* storage unavailable — the cooldown just resets with the app */
  }
}

let initPromise: Promise<void> | null = null
let interstitialReady = false
/** UMP's verdict for this launch; stays false if the consent flow couldn't run. */
let canRequestAds = false

/**
 * Records UMP's answer: whether ads may be requested, and whether the user must
 * be offered the "privacy options" entry point (Settings -> About). The plugin
 * doesn't re-export the `PrivacyOptionsRequirementStatus` enum, so compare its
 * string value.
 */
function applyConsentInfo(consent: AdmobConsentInfo) {
  // `canRequestAds` exists since plugin 7.0.3; treat a missing value as allowed.
  canRequestAds = consent.canRequestAds !== false
  useAdsStore().privacyOptionsRequired =
    String(consent.privacyOptionsRequirementStatus) === 'REQUIRED'
}

/**
 * Thin wrapper around @capacitor-community/admob. Every call is a safe no-op
 * on web, in an app whose ads are switched off (`VITE_ADS_ANDROID` / `VITE_ADS_IOS`) and once the user has
 * removed ads — callers never need to check the flag, platform or the ads
 * store themselves.
 */
export const AdService = {
  /** Runs the Mobile Ads SDK init, consent (UMP), and iOS ATT flows. Call once at startup. */
  initAds(): Promise<void> {
    if (!adsAvailable()) return Promise.resolve()
    if (!initPromise) initPromise = doInit()
    return initPromise
  },

  /** Pre-loads an interstitial so it's ready by the time a session finishes. */
  async loadInterstitial(): Promise<void> {
    const ads = useAdsStore()
    if (!adsAvailable() || ads.adsRemoved || interstitialReady) return
    // Never request an ad before consent (UMP) and ATT have been resolved —
    // a session can start while those prompts are still on screen.
    await AdService.initAds()
    if (!canRequestAds || interstitialReady) return
    try {
      if (usesStartio()) {
        await Startio.prepareInterstitial()
      } else {
        await AdMob.prepareInterstitial({
          adId: interstitialAdUnitId(),
          isTesting: AD_TEST_MODE,
        })
      }
      interstitialReady = true
    } catch (err) {
      // Most often "no fill", or an ad unit that doesn't belong to the AdMob
      // App ID in the native build (see android/app/build.gradle).
      console.error('[ads] prepareInterstitial failed', err)
    }
  },

  /**
   * Opens Google's UMP privacy options form so the user can change their ad
   * consent (Google requires this entry point for users UMP asked, e.g. in the
   * EEA/UK). The UI only offers it when `useAdsStore().privacyOptionsRequired`.
   */
  async showPrivacyOptions(): Promise<void> {
    if (!adsAvailable()) return
    await AdService.initAds()
    try {
      await AdMob.showPrivacyOptionsForm()
      // The answer may have changed (e.g. consent withdrawn): refresh it so
      // the next ad request respects it.
      applyConsentInfo(await AdMob.requestConsentInfo())
      if (!canRequestAds) interstitialReady = false
    } catch (err) {
      console.error('[ads] privacy options form failed', err)
    }
  },

  /**
   * Shows the preloaded interstitial, if there is one. Never loads one on the
   * spot: an ad that pops up seconds later, mid-task, is a disallowed
   * "unexpected launch". When nothing is ready this finish simply has no ad.
   * Returns whether an ad was shown.
   */
  async showInterstitial(): Promise<boolean> {
    const ads = useAdsStore()
    if (!adsAvailable() || ads.adsRemoved) return false
    if (!interstitialReady) {
      console.info('[ads] no interstitial ready; skipping')
      return false
    }
    interstitialReady = false
    try {
      if (usesStartio()) return (await Startio.showInterstitial()).shown
      await AdMob.showInterstitial()
      return true
    } catch (err) {
      console.error('[ads] showInterstitial failed', err)
      return false
    } finally {
      // Ready for the next finish, even if this one failed.
      void AdService.loadInterstitial()
    }
  },

  /**
   * The ad after a finished workout, called when the user taps Done on the
   * finish screen: shown after {@link INTERSTITIAL_DELAY_MS}, and only once
   * per {@link INTERSTITIAL_COOLDOWN_MS}. Returns whether an ad was shown.
   */
  async showAfterFinish(): Promise<boolean> {
    if (!adsAvailable() || useAdsStore().adsRemoved) return false
    if (!interstitialCooledDown(readLastShownAt(), Date.now())) {
      console.info('[ads] interstitial cooling down; skipping')
      return false
    }
    await new Promise((resolve) => setTimeout(resolve, INTERSTITIAL_DELAY_MS))
    const shown = await AdService.showInterstitial()
    if (shown) writeLastShownAt(Date.now())
    return shown
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
 * 4. Start.io, when it serves the ads (`VITE_AD_PROVIDER=startio`): only
 *    after UMP allows ads, so it never starts for a user who said no.
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
    applyConsentInfo(consent)
  } catch (err) {
    // Without a consent answer we can't know whether ads are allowed for this
    // user (e.g. EEA), so skip ads for this launch rather than risk it.
    console.error('[ads] consent flow failed', err)
    canRequestAds = false
  }

  if (usesStartio() && canRequestAds) {
    try {
      await Startio.initialize({
        appId: import.meta.env.VITE_STARTIO_APP_ID ?? '',
        testing: AD_TEST_MODE,
      })
    } catch (err) {
      console.error('[ads] Start.io initialize failed', err)
      canRequestAds = false
    }
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
