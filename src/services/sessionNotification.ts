import { watch } from 'vue'
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { Router } from 'vue-router'
import { i18n } from '@/i18n'
import { useActiveSessionStore } from '@/stores/activeSession'
import {
  buildSessionNotification,
  type NotificationFace,
  type SessionNotificationContent,
} from '@/lib/sessionNotificationContent'
import { REST_STEP_SECONDS } from '@/lib/restTime'

interface ShowOptions extends NotificationFace {
  channelName: string
  channelDescription: string
  startedAt: number
  /** Epoch ms the native countdown runs to; 0 when not resting. */
  restEndsAt: number
  afterRest?: NotificationFace
  /** Seconds the − and + rest actions move the rest by. */
  restStep: number
  /** Labels for the rest actions: less, more, skip. */
  lessLabel: string
  moreLabel: string
  skipLabel: string
}

/** A rest action tapped in the notification; the native side has already redrawn it. */
interface RestActionEvent {
  action: 'less' | 'more' | 'skip'
  seconds: number
}

/** The app's own plugin: android/app/src/main/java/com/wtxworkout/app/SessionNotificationPlugin.java. */
interface WtxSessionNotificationPlugin {
  show(options: ShowOptions): Promise<void>
  stop(): Promise<void>
  addListener(event: 'tap', listener: () => void): Promise<PluginListenerHandle>
  addListener(
    event: 'restAction',
    listener: (event: RestActionEvent) => void,
  ): Promise<PluginListenerHandle>
}

const WtxSessionNotification =
  registerPlugin<WtxSessionNotificationPlugin>('WtxSessionNotification')

/** Coalesces bursts (typing a weight) into one native update. */
const UPDATE_DELAY_MS = 500
/** We ask for notification permission once, when the first workout starts. */
const ASKED_KEY = 'wtx:sessionNotification:asked'

/** Only Android has the native side; iOS (Live Activities) is not built yet. */
function isSupported(): boolean {
  return (
    Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('WtxSessionNotification')
  )
}

function toShowOptions(content: SessionNotificationContent): ShowOptions {
  const t = i18n.global.t
  const face = (f: NotificationFace): NotificationFace => ({
    title: f.title,
    body: f.body,
    detail: f.detail,
  })
  return {
    ...face(content),
    channelName: t('sessionNotification.channelName'),
    channelDescription: t('sessionNotification.channelDescription'),
    startedAt: content.startedAt,
    restEndsAt: content.restEndsAt ?? 0,
    ...(content.afterRest ? { afterRest: face(content.afterRest) } : {}),
    restStep: REST_STEP_SECONDS,
    lessLabel: t('sessionNotification.less', { n: REST_STEP_SECONDS }),
    moreLabel: t('sessionNotification.more', { n: REST_STEP_SECONDS }),
    skipLabel: t('sessionNotification.skip'),
  }
}

/** Android 13+ needs POST_NOTIFICATIONS for the notification to show; ask once. */
async function askPermissionOnce(): Promise<void> {
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
    /* the workout goes on without the notification */
  }
}

/**
 * Keeps an ongoing "workout in progress" notification in step with the
 * active session: "Resting" over a big native countdown with what comes
 * next (and −/+/skip actions), or the current exercise and next set under
 * the workout clock. It can't be swiped away while the workout runs; tapping
 * it opens the session; finishing or discarding removes it.
 *
 * Android only for now; a no-op on the web and iOS.
 */
export function initSessionNotification(router: Router) {
  if (!isSupported()) return

  const store = useActiveSessionStore()
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastSent = ''
  let shown = false

  void WtxSessionNotification.addListener('tap', () => {
    if (store.isActive) void router.push({ name: 'active-session' })
  })

  // The native side has already redrawn the notification; bring the store in line.
  void WtxSessionNotification.addListener('restAction', ({ action, seconds }) => {
    if (!store.session?.restEndsAt) return
    if (action === 'skip') store.skipRestTimer()
    else store.adjustRestTimer(action === 'less' ? -seconds : seconds)
  })

  async function flush() {
    timer = undefined
    const content = buildSessionNotification(store.session, (key, params) =>
      i18n.global.t(key, params ?? {}),
    )
    if (!content) return
    const options = toShowOptions(content)
    const key = JSON.stringify(options)
    if (key === lastSent) return
    lastSent = key
    shown = true
    try {
      await WtxSessionNotification.show(options)
    } catch (err) {
      console.error('[sessionNotification] show failed', err)
    }
  }

  watch(
    [() => store.session, () => i18n.global.locale.value],
    () => {
      if (!store.session) {
        clearTimeout(timer)
        timer = undefined
        lastSent = ''
        if (shown) {
          shown = false
          void WtxSessionNotification.stop().catch(() => {})
        }
        return
      }
      if (!shown) void askPermissionOnce()
      timer ??= setTimeout(() => void flush(), UPDATE_DELAY_MS)
    },
    { deep: true, immediate: true },
  )

  // A WebView reload keeps the process, and its notification, alive: drop it if no session came back.
  if (!store.session) void WtxSessionNotification.stop().catch(() => {})
}
