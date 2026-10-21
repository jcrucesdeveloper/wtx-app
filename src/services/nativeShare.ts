import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/**
 * Sharing that works inside the native app too. Capacitor's web view has no
 * `navigator.share` on Android and can't download a blob on either platform,
 * so on native both go through the Share (+ Filesystem) plugins instead.
 */
const isNative = () => Capacitor.isNativePlatform()

/** Whether a system share sheet is available — always in the app, on the web only where the browser has one. */
export function canShare(): boolean {
  if (isNative()) return true
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/** Opens the share sheet for a link and/or text. Resolves quietly when the user dismisses it. */
export async function shareLink(payload: {
  url?: string
  text?: string
  title?: string
}): Promise<void> {
  try {
    if (isNative())
      await Share.share({ title: payload.title, text: payload.text, url: payload.url })
    else await navigator.share(payload)
  } catch {
    /* dismissed */
  }
}

/** Base64 without spreading a large array into `String.fromCharCode` (which overflows the stack). */
export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/**
 * How a share through the system sheet ended: an app was picked, the sheet
 * was dismissed, or (on the web) this browser can't share a file at all.
 */
export type ShareOutcome = 'shared' | 'dismissed' | 'unsupported'

/**
 * Shares an image through the system sheet, with an optional caption — the
 * route into Instagram / WhatsApp stories and the like.
 *
 * @returns `unsupported` when this browser can't share files, so the caller
 *   can save the image instead.
 */
export async function shareImage(
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
  text?: string,
): Promise<ShareOutcome> {
  if (isNative()) {
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: toBase64(bytes),
      directory: Directory.Cache,
    })
    try {
      // Resolves once an app is chosen, rejects when the sheet is dismissed.
      await Share.share({ text, files: [uri] })
      return 'shared'
    } catch {
      return 'dismissed'
    }
  }

  const file = new File([bytes as BlobPart], filename, { type: mimeType })
  if (typeof navigator.canShare !== 'function' || !navigator.canShare({ files: [file] }))
    return 'unsupported'
  try {
    await navigator.share({ files: [file], text })
    return 'shared'
  } catch {
    return 'dismissed'
  }
}

/** Whether this browser can share an image file (always in the app). */
export function canShareFiles(): boolean {
  if (isNative()) return true
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
  try {
    const probe = new File([new Uint8Array([0])], 'probe.png', { type: 'image/png' })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

/**
 * Hands a generated file to the user: a browser download on the web, and on
 * native a copy in the app's cache shared through the system sheet (Save to
 * Files, Drive, email…), since the web view can't download it.
 */
export async function saveFile(
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
): Promise<void> {
  if (!isNative()) {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeType }))
    try {
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
    } finally {
      URL.revokeObjectURL(url)
    }
    return
  }

  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: toBase64(bytes),
    directory: Directory.Cache,
  })
  try {
    await Share.share({ title: filename, files: [uri] })
  } catch {
    /* dismissed */
  }
}

/**
 * Where "save image" puts a picture on this platform:
 * - `download`: the browser downloads it.
 * - `gallery`: Android writes it to Pictures/WTX, where the gallery finds it.
 * - `share-sheet`: iOS can't reach Photos without another plugin, so the
 *   system sheet opens and its own "Save Image" does it.
 */
export type ImageSaveRoute = 'download' | 'gallery' | 'share-sheet'

export function imageSaveRoute(): ImageSaveRoute {
  if (!isNative()) return 'download'
  return Capacitor.getPlatform() === 'android' ? 'gallery' : 'share-sheet'
}

/** The public folder an image is saved to on Android, relative to shared storage. */
export const GALLERY_FOLDER = 'Pictures/WTX'

/**
 * Saves an image on the device; nothing is uploaded. On Android it goes
 * straight into the gallery (the media folders of shared storage take an
 * app's own images without a permission from Android 11). Where that fails —
 * an older Android — it falls back to the share sheet, as on iOS.
 *
 * @returns where the image actually went.
 */
export async function saveImage(
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
): Promise<ImageSaveRoute> {
  const route = imageSaveRoute()
  if (route === 'gallery') {
    try {
      await Filesystem.writeFile({
        path: `${GALLERY_FOLDER}/${filename}`,
        data: toBase64(bytes),
        directory: Directory.ExternalStorage,
        recursive: true,
      })
      return 'gallery'
    } catch (err) {
      console.warn('[save] gallery write failed, using the share sheet', err)
    }
  }
  await saveFile(bytes, filename, mimeType)
  return route === 'download' ? 'download' : 'share-sheet'
}

/** A file name that doesn't overwrite the last one saved, e.g. `wtx-workout-20261014-184205.png`. */
export function timestampedName(base: string, extension: string, at = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp =
    `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}` +
    `-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`
  return `${base}-${stamp}.${extension}`
}
