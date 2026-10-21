import { describe, it, expect } from 'vitest'
import {
  STORY_BACKGROUND,
  facebookAppId,
  mixHex,
  shareDestinations,
  stickerStoryColors,
} from '../shareDestinations'

const none = { instagram: false, whatsapp: false }
const both = { instagram: true, whatsapp: true }

describe('shareDestinations', () => {
  it('puts the installed apps first on Android, then save and the share sheet', () => {
    expect(
      shareDestinations({ platform: 'android', installed: both, canShareFiles: false }),
    ).toEqual(['instagram', 'whatsapp', 'save', 'more'])
    expect(
      shareDestinations({
        platform: 'android',
        installed: { instagram: false, whatsapp: true },
        canShareFiles: false,
      }),
    ).toEqual(['whatsapp', 'save', 'more'])
  })

  it('never offers a direct app it cannot open', () => {
    expect(
      shareDestinations({ platform: 'android', installed: none, canShareFiles: true }),
    ).toEqual(['save', 'more'])
    // iOS and the web can't hand an image to one named app.
    for (const platform of ['ios', 'web'] as const) {
      const list = shareDestinations({ platform, installed: both, canShareFiles: true })
      expect(list).not.toContain('instagram')
      expect(list).not.toContain('whatsapp')
    }
  })

  it('leaves the share sheet out of a browser that cannot share a file', () => {
    expect(shareDestinations({ platform: 'web', installed: none, canShareFiles: false })).toEqual([
      'save',
    ])
    expect(shareDestinations({ platform: 'web', installed: none, canShareFiles: true })).toEqual([
      'save',
      'more',
    ])
    expect(shareDestinations({ platform: 'ios', installed: none, canShareFiles: false })).toEqual([
      'save',
      'more',
    ])
  })
})

describe('facebookAppId', () => {
  it('accepts a numeric App ID and nothing else', () => {
    expect(facebookAppId(' 1234567890123 ')).toBe('1234567890123')
    expect(facebookAppId('')).toBeNull()
    expect(facebookAppId(undefined)).toBeNull()
    expect(facebookAppId('abc123')).toBeNull()
    expect(facebookAppId('123')).toBeNull()
  })
})

describe('mixHex', () => {
  it('blends two colours channel by channel', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mixHex('#FF0000', '#0000ff', 2)).toBe('#0000ff')
  })

  it('keeps the valid colour when the other is not one', () => {
    expect(mixHex('#102030', 'red', 0.5)).toBe('#102030')
    expect(mixHex('nope', '#AABBCC', 0.5)).toBe('#aabbcc')
  })
})

describe('stickerStoryColors', () => {
  it('runs from the card background toward the accent', () => {
    const { top, bottom } = stickerStoryColors('#e0263a')
    expect(top).toBe(STORY_BACKGROUND)
    expect(bottom).not.toBe(top)
    expect(bottom).toMatch(/^#[0-9a-f]{6}$/)
  })
})
