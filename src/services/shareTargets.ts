import { Capacitor, registerPlugin } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { facebookAppId, type InstalledTargets, type SharePlatform } from '@/lib/shareDestinations'
import { toBase64 } from '@/services/nativeShare'

/**
 * One-tap sharing into a named app (Instagram, WhatsApp), through the app's
 * own plugin: android/app/src/main/java/com/wtxworkout/app/ShareTargetsPlugin.java.
 * Android only; elsewhere nothing is installed as far as this is concerned,
 * and the sheet offers the system share instead.
 */
export type ShareTarget = keyof InstalledTargets

interface ShareOptions {
  target: ShareTarget
  file: string
  mimeType: string
  text?: string
  clipboard?: string
  appId?: string
  sticker?: boolean
  topColor?: string
  bottomColor?: string
}

interface WtxShareTargetsPlugin {
  available(): Promise<InstalledTargets>
  share(options: ShareOptions): Promise<{ route: 'story' | 'send' }>
}

const WtxShareTargets = registerPlugin<WtxShareTargetsPlugin>('WtxShareTargets')

export function sharePlatform(): SharePlatform {
  if (!Capacitor.isNativePlatform()) return 'web'
  return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
}

const NONE: InstalledTargets = { instagram: false, whatsapp: false }

/** Which of the direct apps this phone has. Never throws: an older build without the plugin has none. */
export async function installedTargets(): Promise<InstalledTargets> {
  if (sharePlatform() !== 'android') return NONE
  try {
    const found = await WtxShareTargets.available()
    return { instagram: !!found.instagram, whatsapp: !!found.whatsapp }
  } catch (err) {
    console.warn('[share] direct targets unavailable', err)
    return NONE
  }
}

/** The Facebook App ID Instagram's story editor needs, from the build's env; `null` without one. */
export function configuredFacebookAppId(): string | null {
  return facebookAppId(import.meta.env.VITE_FACEBOOK_APP_ID)
}

/**
 * Hands the image to one app. Resolves with how it went in: `story` when
 * Instagram's story editor opened, `send` for a plain share into the app.
 * Resolves `null` when the app can't be opened (uninstalled meanwhile, or no
 * plugin), so the caller can use the system sheet instead.
 */
export async function shareToTarget(
  target: ShareTarget,
  image: { bytes: Uint8Array; mimeType: string; extension: string },
  options: {
    text?: string
    clipboard?: string
    sticker?: boolean
    colors?: { top: string; bottom: string }
  } = {},
): Promise<'story' | 'send' | null> {
  if (sharePlatform() !== 'android') return null
  const { uri } = await Filesystem.writeFile({
    path: `wtx-workout-${target}.${image.extension}`,
    data: toBase64(image.bytes),
    directory: Directory.Cache,
  })
  const appId = target === 'instagram' ? configuredFacebookAppId() : null
  try {
    const { route } = await WtxShareTargets.share({
      target,
      file: uri,
      mimeType: image.mimeType,
      ...(options.text ? { text: options.text } : {}),
      ...(options.clipboard ? { clipboard: options.clipboard } : {}),
      ...(appId ? { appId } : {}),
      ...(options.sticker ? { sticker: true } : {}),
      ...(options.colors
        ? { topColor: options.colors.top, bottomColor: options.colors.bottom }
        : {}),
    })
    return route
  } catch (err) {
    console.warn(`[share] ${target} could not be opened`, err)
    return null
  }
}
