import { captureSize, type CameraFacing } from '@/lib/cameraFrame'
import { loadImage } from '@/services/photoPicker'

/**
 * A live camera inside the app, so the share card's frame can be drawn over
 * the preview. It is the web view's own getUserMedia: Capacitor already asks
 * for the CAMERA permission when the web view wants the camera on Android
 * (BridgeWebChromeClient.onPermissionRequest) and grants it on iOS
 * (WebViewDelegationHandler, under NSCameraUsageDescription), so no plugin is
 * needed. Frames are only ever read into memory to be drawn on the card.
 */

/** Whether this web view can stream a camera at all. */
export function canStreamCamera(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    (typeof isSecureContext === 'undefined' || isSecureContext)
  )
}

/** Whether the device lists a camera. Before permission the list is anonymous, but the kind is there. */
export async function hasVideoInput(): Promise<boolean> {
  if (!canStreamCamera() || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
    return false
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.some((device) => device.kind === 'videoinput')
  } catch {
    return false
  }
}

/**
 * Opens the camera facing `facing` (a preference: a laptop's only webcam is
 * used whichever is asked). About 1080p is plenty: the card is 1080 wide.
 */
export function openCamera(facing: CameraFacing): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  })
}

export function closeCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

/** Whether the device has more than one camera to switch between (known once one is open). */
export async function cameraCount(): Promise<number> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((device) => device.kind === 'videoinput').length
  } catch {
    return 0
  }
}

/**
 * The frame on screen now, whole (the card crops it, as it does a gallery
 * photo), mirrored when the preview is, so the photo is what was seen.
 */
export async function captureFrame(
  video: HTMLVideoElement,
  mirrored: boolean,
): Promise<HTMLImageElement> {
  if (!video.videoWidth || !video.videoHeight) throw new Error('camera has no frame yet')
  const size = captureSize(video.videoWidth, video.videoHeight)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  if (mirrored) {
    ctx.translate(size.width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, 0, 0, size.width, size.height)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.92),
  )
  if (!blob) throw new Error('frame could not be encoded')
  const url = URL.createObjectURL(blob)
  try {
    return await loadImage(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}
