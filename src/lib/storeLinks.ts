export type MobileOs = 'ios' | 'android'

/** Which store, if any, a browser's user agent belongs to. */
export function detectMobileOs(userAgent: string): MobileOs | null {
  if (/android/i.test(userAgent)) return 'android'
  if (/iphone|ipod/i.test(userAgent)) return 'ios'
  return null
}

export interface StoreConfig {
  /** Numeric App Store ID (the digits after `id` in the listing URL). */
  appStoreId?: string
  /** App Store Connect provider ID, needed for campaign links to show up in App Analytics. */
  appStoreProviderId?: string
  /** Google Play package name. */
  playStoreId?: string
}

/**
 * The store listing for `os`, tagged with where the visitor came from so the
 * store consoles can attribute the install (Play: install referrer; App
 * Store: campaign link). `null` until that store's ID is configured.
 */
export function storeUrl(os: MobileOs, config: StoreConfig, source: string | null): string | null {
  const campaign = source ?? 'web'
  if (os === 'android') {
    const id = config.playStoreId?.trim()
    if (!id) return null
    const referrer = `utm_source=${campaign}&utm_medium=web-banner`
    return `https://play.google.com/store/apps/details?id=${encodeURIComponent(id)}&referrer=${encodeURIComponent(referrer)}`
  }
  const id = config.appStoreId?.trim()
  if (!id) return null
  const provider = config.appStoreProviderId?.trim()
  const query = provider
    ? `?pt=${encodeURIComponent(provider)}&ct=${encodeURIComponent(campaign)}&mt=8`
    : ''
  return `https://apps.apple.com/app/id${encodeURIComponent(id)}${query}`
}
