import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { i18n } from '@/i18n'
import { computeWeekStreak, sessionsThisWeek, toDateStr } from '@/lib/sessionStats'

/** The one reminder this device ever has pending — re-scheduling replaces it. */
const REMINDER_ID = 1
/** Local hour (24h) the reminder fires on a day nothing's been logged yet. */
const REMINDER_HOUR = 18

function isNativePlatform(): boolean {
  return Capacitor.getPlatform() !== 'web'
}

/**
 * On-device workout reminders — no server, no push infrastructure. A single
 * rolling notification, re-scheduled whenever the session log changes so it
 * never fires on a day the user already trained.
 */
export const NotificationService = {
  async requestPermission(): Promise<boolean> {
    if (!isNativePlatform()) return false
    try {
      const { display } = await LocalNotifications.requestPermissions()
      return display === 'granted'
    } catch {
      return false
    }
  },

  /** Drops the pending reminder — call when reminders are turned off. */
  async cancel(): Promise<void> {
    if (!isNativePlatform()) return
    try {
      await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] })
    } catch {
      /* nothing was pending, or the OS call failed — not worth surfacing */
    }
  },

  /**
   * Re-schedules the next reminder from the session log's dates. Skips today
   * if a session is already logged, and leads with the streak once there's
   * one worth protecting.
   */
  async schedule(dateStrs: string[]): Promise<void> {
    if (!isNativePlatform()) return
    await this.cancel()

    const now = new Date()
    const trainedToday = dateStrs.includes(toDateStr(now))
    const streak = computeWeekStreak(dateStrs, now)
    const atRisk = streak > 0 && sessionsThisWeek(dateStrs, now) === 0

    const at = new Date(now)
    at.setHours(REMINDER_HOUR, 0, 0, 0)
    if (trainedToday || at <= now) at.setDate(at.getDate() + 1)

    const t = i18n.global.t
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: REMINDER_ID,
            title: atRisk
              ? t('notifications.streakTitle', { count: streak }, streak)
              : t('notifications.reminderTitle'),
            body: atRisk
              ? t('notifications.streakBody', { count: streak, next: streak + 1 })
              : t('notifications.reminderBody'),
            schedule: { at },
          },
        ],
      })
    } catch (err) {
      console.error('[notifications] schedule failed', err)
    }
  },
}
