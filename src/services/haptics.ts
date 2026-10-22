import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/** The rest-over buzz: two pulses this long, this far apart (SessionRestEnd.java matches it). */
const REST_OVER_PULSE_MS = 400
const REST_OVER_GAP_MS = 200

function isNativePlatform(): boolean {
  return Capacitor.getPlatform() !== 'web'
}

/** Runs a haptic call on a device, and is a safe no-op everywhere else. */
async function fire(label: string, call: () => Promise<void>): Promise<void> {
  if (!isNativePlatform()) return
  try {
    await call()
  } catch (err) {
    console.error(`[haptics] ${label} failed`, err)
  }
}

/**
 * The app's haptic vocabulary, named by what happened rather than by how it
 * feels, so the same event always feels the same wherever it is fired.
 *
 * From lightest to heaviest:
 *   selection  a value stepped or an option changed
 *   light      a set logged
 *   medium     something bigger landed — an exercise or the workout completed
 *   success    a record or a milestone
 *   heavy      a rare moment — a new plate
 * and, apart from that scale:
 *   warning    something needs attention
 *   restOver   the rest timer ran out (a real vibration, if the setting is on)
 *   error      something failed
 *
 * Every call is a safe no-op on web — callers never need to check platform
 * themselves. Web browsers have no haptics API to fall back to, so these are
 * genuinely silent there, not just degraded; they can only be judged on a
 * real device or simulator.
 */
export const HapticsService = {
  /** A value stepped or an option changed — the faintest tick. */
  selection(): Promise<void> {
    return fire('selection', async () => {
      await Haptics.selectionStart()
      await Haptics.selectionChanged()
      await Haptics.selectionEnd()
    })
  },

  /** A single set completed — a light tap, not attention-grabbing. */
  light(): Promise<void> {
    return fire('impact', () => Haptics.impact({ style: ImpactStyle.Light }))
  },

  /** Something bigger landed: the last set of an exercise, or the workout. */
  medium(): Promise<void> {
    return fire('impact', () => Haptics.impact({ style: ImpactStyle.Medium }))
  },

  /** A rare moment worth feeling, such as a new plate. */
  heavy(): Promise<void> {
    return fire('impact', () => Haptics.impact({ style: ImpactStyle.Heavy }))
  },

  /** A personal record or milestone — a distinct positive buzz. */
  success(): Promise<void> {
    return fire('notification', () => Haptics.notification({ type: NotificationType.Success }))
  },

  /** Something needs attention — a short, distinct buzz. */
  warning(): Promise<void> {
    return fire('notification', () => Haptics.notification({ type: NotificationType.Warning }))
  },

  /**
   * The rest is over — two long buzzes, a real vibration rather than a tap,
   * so it is felt through a pocket. Same rhythm as the Android notification's.
   */
  restOver(): Promise<void> {
    return fire('vibrate', async () => {
      await Haptics.vibrate({ duration: REST_OVER_PULSE_MS })
      await new Promise((resolve) => setTimeout(resolve, REST_OVER_PULSE_MS + REST_OVER_GAP_MS))
      await Haptics.vibrate({ duration: REST_OVER_PULSE_MS })
    })
  },

  /** Something failed and the user needs to know. */
  error(): Promise<void> {
    return fire('notification', () => Haptics.notification({ type: NotificationType.Error }))
  },
}
