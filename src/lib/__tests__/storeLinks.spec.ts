import { describe, it, expect } from 'vitest'
import { detectMobileOs, storeUrl } from '../storeLinks'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

describe('detectMobileOs', () => {
  it('recognises the two phone platforms', () => {
    expect(detectMobileOs(IPHONE)).toBe('ios')
    expect(detectMobileOs(ANDROID)).toBe('android')
  })

  it('is null on a desktop browser', () => {
    expect(detectMobileOs(DESKTOP)).toBeNull()
  })
})

describe('storeUrl', () => {
  it('is null until the store ID is configured', () => {
    expect(storeUrl('android', {}, 'tiktok')).toBeNull()
    expect(storeUrl('ios', { playStoreId: 'com.wtxworkout.app' }, 'tiktok')).toBeNull()
  })

  it('tags the Play link with the source as an install referrer', () => {
    expect(storeUrl('android', { playStoreId: 'com.wtxworkout.app' }, 'tiktok')).toBe(
      'https://play.google.com/store/apps/details?id=com.wtxworkout.app&referrer=utm_source%3Dtiktok%26utm_medium%3Dweb-banner',
    )
  })

  it('tags the App Store link as a campaign when the provider ID is known', () => {
    expect(
      storeUrl('ios', { appStoreId: '123456789', appStoreProviderId: '987' }, 'share-routine'),
    ).toBe('https://apps.apple.com/app/id123456789?pt=987&ct=share-routine&mt=8')
  })

  it('links the App Store plainly without a provider ID', () => {
    expect(storeUrl('ios', { appStoreId: '123456789' }, 'tiktok')).toBe(
      'https://apps.apple.com/app/id123456789',
    )
  })

  it('labels an untagged visit as web', () => {
    expect(storeUrl('android', { playStoreId: 'com.wtxworkout.app' }, null)).toContain(
      'utm_source%3Dweb%26',
    )
  })
})
