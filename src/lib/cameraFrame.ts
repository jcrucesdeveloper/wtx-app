/**
 * The pure pieces of the framed camera: where the card sits on the screen,
 * where the photo sits on the card, and what a failed camera means. The
 * camera itself is in src/services/liveCamera.ts and FramedCamera.vue.
 *
 * What you see is what you get: the live preview fills the card's photo slot
 * with `object-fit: cover`, which is the same centred cover crop the card
 * draws the photo with (coverCrop), and the card is drawn over it by the same
 * code that draws the shared image.
 */
import {
  photoRect,
  workoutCardFrame,
  type WorkoutCardData,
  type WorkoutCardFormat,
} from '@/lib/workoutCard'

export type CameraFacing = 'user' | 'environment'

/** The largest `width`×`height` box of the frame's shape that fits in the room, never larger than it. */
export function fitFrame(
  roomWidth: number,
  roomHeight: number,
  frameWidth: number,
  frameHeight: number,
): { width: number; height: number } {
  if (roomWidth <= 0 || roomHeight <= 0 || frameWidth <= 0 || frameHeight <= 0) {
    return { width: 0, height: 0 }
  }
  const scale = Math.min(roomWidth / frameWidth, roomHeight / frameHeight)
  return { width: Math.floor(frameWidth * scale), height: Math.floor(frameHeight * scale) }
}

/** Where the photo sits on the card, in percent of the card, for laying HTML over the image. */
export function photoAreaPercent(
  data: Pick<WorkoutCardData, 'highlight'>,
  format: WorkoutCardFormat = 'story',
): { left: string; top: string; width: string; height: string } {
  const frame = workoutCardFrame(format)
  const rect = photoRect(data, format)
  const pct = (value: number, of: number) => `${(value / of) * 100}%`
  return {
    left: pct(rect.x, frame.width),
    top: pct(rect.y, frame.height),
    width: pct(rect.width, frame.width),
    height: pct(rect.height, frame.height),
  }
}

/**
 * Why the camera didn't start. `denied`: the user (or the OS) said no, so
 * another camera won't do better — on Android the system camera intent even
 * throws once the CAMERA permission is refused. `unavailable`: no camera, it
 * is busy, or the web view can't stream one; the system camera may still work.
 */
export type CameraFailure = 'denied' | 'unavailable'

export function cameraFailure(err: unknown): CameraFailure {
  const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : ''
  return name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError'
    ? 'denied'
    : 'unavailable'
}

/**
 * Whether the preview is shown as a mirror. A front camera is, as every
 * camera app does; a webcam that doesn't say which way it faces is a front
 * one in practice. The photo is kept as it was seen, so the card matches.
 */
export function isMirrored(requested: CameraFacing, reported?: string): boolean {
  if (reported === 'user') return true
  if (reported === 'environment') return false
  return requested === 'user'
}

export function otherFacing(facing: CameraFacing): CameraFacing {
  return facing === 'user' ? 'environment' : 'user'
}

/** The size a captured frame is kept at: as shot, with its long side no more than `maxLong`. */
export function captureSize(
  width: number,
  height: number,
  maxLong = 2160,
): { width: number; height: number } {
  const scale = Math.min(1, maxLong / Math.max(width, height, 1))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}
