import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wtx.app',
  appName: 'WTX',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      // Android 15+ (targetSdk 35+) forces edge-to-edge. With `css` (Capacitor's
      // default, set explicitly here) the web view honours `viewport-fit=cover`
      // from index.html on Chromium 140+ and exposes the real
      // `env(safe-area-inset-*)` values, which App.vue / AppTabBar / BottomSheet
      // pad for; on older WebViews Capacitor pads the web view natively instead.
      // The hint avoids a layout jump before the meta tag is read.
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover'
    },
    AdMob: {
      // Test mode flag, copied into the native capacitor.config.json by
      // `cap sync`/`cap copy`. This file isn't processed by Vite (the Capacitor
      // CLI reads it in Node), so it uses a plain process env var rather than a
      // VITE_* one: test mode stays on unless you run
      // `ADMOB_TESTING=false npx cap sync` for a store release.
      //
      // NOTE: @capacitor-community/admob 8.x doesn't read this key natively —
      // the switch that actually forces Google's test ads is VITE_ADMOB_TESTING
      // in src/services/ads.ts (passed to `initialize`/`prepareInterstitial`).
      // Keep both in step; see README "Store release checklist".
      initializeForTesting: process.env.ADMOB_TESTING !== 'false'
    }
  }
};

export default config;
