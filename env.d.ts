/// <reference types="vite/client" />

/** Injected by vite.config.ts from package.json — the app version shown in Configuration. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** Real AdMob interstitial ad unit ID for Android. Falls back to Google's test unit when unset. */
  readonly VITE_ADMOB_INTERSTITIAL_ID_ANDROID?: string
  /** Real AdMob interstitial ad unit ID for iOS. Falls back to Google's test unit when unset. */
  readonly VITE_ADMOB_INTERSTITIAL_ID_IOS?: string
  /** Set to `'false'` for a store build to serve real ads. Anything else keeps AdMob test mode on. */
  readonly VITE_ADMOB_TESTING?: string
  /** Supabase project URL. Accounts, sync and group workouts are disabled when unset. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon (publishable) key. */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /**
   * Public web origin (e.g. `https://wtx.app`) for share links, QR codes and auth
   * email redirects. Falls back to the current origin — required for native builds.
   */
  readonly VITE_PUBLIC_URL?: string
  /** Sentry DSN for crash reporting. Crash reporting is disabled when unset. */
  readonly VITE_SENTRY_DSN?: string

  /** Public contact email shown in the Terms and Privacy Policy (in-app and public/*.html). */
  readonly VITE_SUPPORT_EMAIL?: string
  /** Legal name of the developer (data controller) shown in the Terms and Privacy Policy. */
  readonly VITE_LEGAL_NAME?: string
}
