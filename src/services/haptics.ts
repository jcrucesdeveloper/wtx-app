import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

function isNativePlatform(): boolean {
  return Capacitor.getPlatform() !== 'web'
}

/**
 * Thin wrapper around @capacitor/haptics. Every call is a safe no-op on web
 * — callers never need to check platform themselves. Web browsers have no
 * haptics API to fall back to, so these are genuinely silent there, not just
 * degraded; verify on a real device/simulator after `pnpm run cap:sync`.
 */
export const HapticsService = {
  /** A single set completed — a light tap, not attention-grabbing. */
  async light(): Promise<void> {
    if (!isNativePlatform()) return
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch (err) {
      console.error('[haptics] impact failed', err)
    }
  },

  /** A personal record or milestone — a distinct positive buzz. */
  async success(): Promise<void> {
    if (!isNativePlatform()) return
    try {
      await Haptics.notification({ type: NotificationType.Success })
    } catch (err) {
      console.error('[haptics] notification failed', err)
    }
  },

  /** The rest timer ran out. */
  async warning(): Promise<void> {
    if (!isNativePlatform()) return
    try {
      await Haptics.notification({ type: NotificationType.Warning })
    } catch (err) {
      console.error('[haptics] notification failed', err)
    }
  },
}
