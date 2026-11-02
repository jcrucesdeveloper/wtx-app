import { watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications, type ActionPerformed } from '@capacitor/local-notifications'
import type { Router } from 'vue-router'
import { i18n } from '@/i18n'
import { FORGOT_FINISH_AFTER_MS, forgotFinishReminderAt } from '@/lib/forgotFinishReminder'
import { useActiveSessionStore } from '@/stores/activeSession'

/**
 * Its own id: the daily reminder is 1 and the ongoing workout notification
 * (SessionNotificationPlugin) is 4201, so none of them replaces another.
 */
export const FORGOT_FINISH_ID = 4202
/** Android channel and iOS category / action type, both apart from the workout notification's. */
export const FORGOT_FINISH_CHANNEL = 'wtx_forgot_finish'
export const FORGOT_FINISH_ACTIONS = 'wtx_forgot_finish'
export const ACTION_FINISH = 'finish'
export const ACTION_KEEP_GOING = 'keep-going'
/** We ask iOS for notification permission once, when the first workout starts. */
const ASKED_KEY = 'wtx:forgotFinish:asked'

function isNative(): boolean {
  return Capacitor.getPlatform() !== 'web'
}

/** Android asks in sessionNotification; iOS has nothing else asking yet. */
async function askPermissionOnceOnIos(): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return
  try {
    if (localStorage.getItem(ASKED_KEY)) return
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    return
  }
  try {
    const { display } = await LocalNotifications.checkPermissions()
    if (display === 'prompt' || display === 'prompt-with-rationale') {
      await LocalNotifications.requestPermissions()
    }
  } catch {
    /* the workout goes on without the reminder */
  }
}

/** The channel and the actions carry translated labels, so they're set again when the language changes. */
async function registerLabels(): Promise<void> {
  const t = i18n.global.t
  if (Capacitor.getPlatform() === 'android') {
    try {
      await LocalNotifications.createChannel({
        id: FORGOT_FINISH_CHANNEL,
        name: t('forgotFinish.channelName'),
        description: t('forgotFinish.channelDescription'),
        // A question meant to be seen (unlike the silent ongoing one), so it may peek in.
        importance: 4,
        visibility: 1,
      })
    } catch {
      /* falls back to the plugin's default channel */
    }
  }
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: FORGOT_FINISH_ACTIONS,
          actions: [
            // Both open the app: finishing always goes through the review sheet, never blind.
            { id: ACTION_FINISH, title: t('forgotFinish.finish'), foreground: true },
            { id: ACTION_KEEP_GOING, title: t('forgotFinish.keepGoing'), foreground: true },
          ],
        },
      ],
    })
  } catch {
    /* the notification still shows, just without its buttons */
  }
}

async function cancel(): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: FORGOT_FINISH_ID }] })
  } catch {
    /* nothing was pending */
  }
  try {
    // iOS keeps a delivered one in Notification Center after cancelling the request.
    await LocalNotifications.removeDeliveredNotificationsById({ ids: [FORGOT_FINISH_ID] })
  } catch {
    /* nothing was delivered */
  }
}

async function schedule(at: number): Promise<void> {
  const t = i18n.global.t
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: FORGOT_FINISH_ID,
          title: t('forgotFinish.title'),
          body: t('forgotFinish.body', { hours: FORGOT_FINISH_AFTER_MS / 3_600_000 }),
          channelId: FORGOT_FINISH_CHANNEL,
          actionTypeId: FORGOT_FINISH_ACTIONS,
          autoCancel: true,
          // Inexact (the app has no exact-alarm permission); a few minutes late is fine.
          schedule: { at: new Date(at), allowWhileIdle: true },
        },
      ],
    })
  } catch (err) {
    console.error('[forgotFinish] schedule failed', err)
  }
}

/**
 * Where an action on the reminder leads, or `null` to stay put: the workout
 * is gone (finished or discarded since), or it isn't this notification.
 */
export function forgotFinishRoute(event: ActionPerformed, hasWorkout: boolean) {
  if (event.notification?.id !== FORGOT_FINISH_ID || !hasWorkout) return null
  if (event.actionId === ACTION_FINISH) {
    return { name: 'active-session', query: { finish: '1' } } as const
  }
  return { name: 'active-session' } as const
}

/**
 * "Did you forget to finish your workout?" — a local notification scheduled
 * {@link forgotFinishReminderAt five hours} after the workout started, so it
 * fires with the app in the background or closed. Rescheduled when a new
 * workout replaces the old one, cancelled when it's finished or discarded.
 *
 * "Finish workout" opens the finish review sheet rather than saving from the
 * notification: the user sees the time, name and sharing choices first, and
 * a stray tap on a lock screen can't post a workout. "Keep going" (or a tap)
 * opens the workout. There's no discard action: one tap would lose it.
 *
 * Android and iOS; a no-op on the web.
 */
export function initForgotFinishReminder(router: Router) {
  if (!isNative()) return
  const store = useActiveSessionStore()

  void LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const to = forgotFinishRoute(event, store.isActive)
    if (to) void router.push(to)
  })

  // Native calls run one after another, so a cancel never lands after the schedule that followed it.
  let queue: Promise<void> = Promise.resolve()
  function enqueue(job: () => Promise<void>) {
    queue = queue.then(job, job)
  }

  watch(
    () => i18n.global.locale.value,
    () => enqueue(registerLabels),
    { immediate: true },
  )

  watch(
    [() => store.session?.startedAt, () => i18n.global.locale.value],
    ([startedAt], previous) => {
      const at = forgotFinishReminderAt(startedAt, Date.now())
      if (startedAt !== undefined && previous?.[0] === undefined) void askPermissionOnceOnIos()
      enqueue(async () => {
        await cancel()
        if (at !== null) await schedule(at)
      })
    },
    { immediate: true },
  )
}
