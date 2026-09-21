/// <reference types="vite/client" />

/** Injected by vite.config.ts from package.json — the app version shown in Configuration. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** Real AdMob banner ad unit ID for Android. Falls back to Google's test unit when unset. */
  readonly VITE_ADMOB_BANNER_ID_ANDROID?: string
  /** Real AdMob banner ad unit ID for iOS. Falls back to Google's test unit when unset. */
  readonly VITE_ADMOB_BANNER_ID_IOS?: string
  /** Real AdMob interstitial ad unit ID for Android. Falls back to Google's test unit when unset. */
  readonly VITE_ADMOB_INTERSTITIAL_ID_ANDROID?: string
  /** Real AdMob interstitial ad unit ID for iOS. Falls back to Google's test unit when unset. */
  readonly VITE_ADMOB_INTERSTITIAL_ID_IOS?: string
}
