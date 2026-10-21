/**
 * Where a workout card can go from the share sheet, in the order the buttons
 * are shown. Pure, so the choice can be tested without a phone.
 *
 * - `instagram` / `whatsapp`: straight into that app, one tap. Android only,
 *   and only when the app is installed: Android lets an app hand an image to
 *   one named app, iOS and the web don't.
 * - `save`:  to the gallery (Android), a download (web), or the system
 *   sheet's "Save Image" (iOS).
 * - `more`:  the system share sheet, for every other app. Left out on a
 *   browser that can't share a file, where it would only download again.
 */
export type ShareDestination = 'instagram' | 'whatsapp' | 'save' | 'more'

export type SharePlatform = 'web' | 'android' | 'ios'

/** The apps the phone has that a card can be sent to directly. */
export interface InstalledTargets {
  instagram: boolean
  whatsapp: boolean
}

export function shareDestinations(input: {
  platform: SharePlatform
  installed: InstalledTargets
  /** The browser can share a file (Web Share level 2). Ignored in the app, which always can. */
  canShareFiles: boolean
}): ShareDestination[] {
  const list: ShareDestination[] = []
  if (input.platform === 'android') {
    if (input.installed.instagram) list.push('instagram')
    if (input.installed.whatsapp) list.push('whatsapp')
  }
  list.push('save')
  if (input.platform !== 'web' || input.canShareFiles) list.push('more')
  return list
}

/**
 * A Facebook App ID, which Instagram requires before it opens its story
 * editor for another app (Meta, Sharing to Stories, since January 2023).
 * Anything that isn't one counts as none.
 */
export function facebookAppId(value: string | undefined | null): string | null {
  const id = value?.trim() ?? ''
  return /^\d{5,20}$/.test(id) ? id : null
}

/** Mixes `#rrggbb` colour `b` into `a` by `amount` (0 = all `a`, 1 = all `b`). */
export function mixHex(a: string, b: string, amount: number): string {
  const valid = (hex: string) => /^#[0-9a-f]{6}$/i.test(hex)
  if (!valid(a)) return valid(b) ? b.toLowerCase() : '#000000'
  if (!valid(b)) return a.toLowerCase()
  const t = Math.min(1, Math.max(0, amount))
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  return (
    '#' +
    [0, 1, 2]
      .map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  )
}

/** The card's own background colour (the app's dark theme). */
export const STORY_BACKGROUND = '#0f1012'

/**
 * The gradient Instagram puts behind a sticker opened in its story editor:
 * the card's dark at the top, turning toward the user's accent at the
 * bottom, so a sticker posted as it is still looks like the app's.
 */
export function stickerStoryColors(accent: string): { top: string; bottom: string } {
  return { top: STORY_BACKGROUND, bottom: mixHex(STORY_BACKGROUND, accent, 0.45) }
}
