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
 * Shares an image through the system sheet, with an optional caption — the
 * route into Instagram / WhatsApp stories and the like.
 *
 * @returns `false` when this browser can't share files, so the caller can
 *   fall back to sharing text. Dismissing the sheet still counts as handled.
 */
export async function shareImage(
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
  text?: string,
): Promise<boolean> {
  if (isNative()) {
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: toBase64(bytes),
      directory: Directory.Cache,
    })
    try {
      await Share.share({ text, files: [uri] })
    } catch {
      /* dismissed */
    }
    return true
  }

  const file = new File([bytes as BlobPart], filename, { type: mimeType })
  if (typeof navigator.canShare !== 'function' || !navigator.canShare({ files: [file] }))
    return false
  try {
    await navigator.share({ files: [file], text })
  } catch {
    /* dismissed */
  }
  return true
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
