import { Capacitor } from '@capacitor/core'
import { Camera, MediaTypeSelection } from '@capacitor/camera'

/**
 * A photo for the share card, from the camera or the gallery. It is only ever
 * read into memory to be drawn on the card: it isn't stored by the app, never
 * saved to the gallery on its own, and never uploaded.
 *
 * In the app it goes through @capacitor/camera (the system camera, and the
 * system photo picker, which needs no permission). On the web it is a file
 * input; `capture` asks a phone's browser for the camera, and a desktop
 * browser ignores it and opens the file picker.
 */
export type PhotoSource = 'camera' | 'gallery'

/** Whether to offer the camera as its own choice: in the app, and on a touch screen that likely has one. */
export function canTakePhoto(): boolean {
  if (Capacitor.isNativePlatform()) return true
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
}

/** The user backed out of the camera or the picker: not an error. */
function isCancel(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return /cancel/i.test(message)
}

/** Loads an image URL into an element the canvas can draw. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('photo could not be read'))
    image.src = src
  })
}

/** On the web: opens a file input and resolves with the file, or null when dismissed. */
function pickFile(source: PhotoSource): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    if (source === 'camera') input.setAttribute('capture', 'environment')
    input.hidden = true
    let settled = false
    const done = (file: File | null) => {
      if (settled) return
      settled = true
      input.remove()
      window.removeEventListener('focus', onFocus)
      resolve(file)
    }
    // Where a browser has no `cancel` event, focus coming back to the page
    // without a `change` soon after means the picker was dismissed.
    const onFocus = () => setTimeout(() => done(input.files?.[0] ?? null), 1000)
    input.addEventListener('change', () => done(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => done(null))
    window.addEventListener('focus', onFocus)
    // Some browsers only open an input that is in the document.
    document.body.appendChild(input)
    input.click()
  })
}

/**
 * Asks for a photo and resolves with it loaded, or `null` when the user backed
 * out. Throws when the photo can't be had (the camera permission was denied,
 * or the file isn't an image the browser can read).
 */
export async function pickPhoto(source: PhotoSource): Promise<HTMLImageElement | null> {
  if (!Capacitor.isNativePlatform()) {
    const file = await pickFile(source)
    if (!file) return null
    const url = URL.createObjectURL(file)
    try {
      return await loadImage(url)
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  try {
    // No target size: how the plugin fits one differs by platform, and the
    // card crops the photo itself (see coverCrop).
    const options = { quality: 90, correctOrientation: true }
    const result =
      source === 'camera'
        ? await Camera.takePhoto({ ...options, saveToGallery: false })
        : (await Camera.chooseFromGallery({ ...options, mediaType: MediaTypeSelection.Photo }))
            .results[0]
    const src = result?.webPath ?? (result?.uri ? Capacitor.convertFileSrc(result.uri) : '')
    return src ? await loadImage(src) : null
  } catch (err) {
    if (isCancel(err)) return null
    throw err
  }
}
