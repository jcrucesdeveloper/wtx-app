import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wtx.app',
  appName: 'WTX',
  webDir: 'dist',
  plugins: {
    AdMob: {
      // Google's test-suite mode: always serves Google's own test ads,
      // regardless of ad unit ID. This file isn't processed by Vite (it's read
      // directly by the Capacitor CLI), so flip this to `false` by hand once
      // real AdMob App IDs are set in the native projects for a store release.
      initializeForTesting: true
    }
  }
};

export default config;
