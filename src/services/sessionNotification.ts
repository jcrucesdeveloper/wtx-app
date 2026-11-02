import { watch } from 'vue'
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { Router } from 'vue-router'
import { i18n } from '@/i18n'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useSettingsStore } from '@/stores/settings'
import {
  buildSessionNotification,
  type NotificationFace,
  type SessionNotificationContent,
} from '@/lib/sessionNotificationContent'
import { REST_STEP_SECONDS } from '@/lib/restTime'
import { findCatalogEntryByName } from '@/lib/exercises/exerciseCatalog'
import { buildWearProjection } from '@/lib/wearProjection'
import { parseConfirmedRest, type ConfirmedRest, type WearProjection } from '@/lib/wearProtocol'
import { newUuid } from '@/lib/uuid'
import type { ActiveSession } from '@/stores/activeSession'

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
  /** Buzz when the rest runs out while the app is in the background (the setting). */
  vibrateOnRestEnd: boolean
  /** Names the session, and the running rest and its revision, to the native rest host. */
  sessionId: string
  restId: string
  restRev: number
  /** The deadline and length JS holds for that rest (epoch ms, ms); 0 without one. */
  jsRestEndsAt: number
  restDurationMs: number
  /** What the watch shows; the host adds the rest's timing. */
  wear: WearProjection
}

/** The host's answer to a rest adjustment: whether it applied, and the rest it left. */
interface AdjustRestResult {
  accepted: boolean
  reason?: string
  sessionId?: string
  restId?: string
  restRev?: number
  restEndsAt?: number
  restDurationSeconds?: number
}

/** The app's own plugin: android/app/src/main/java/com/wtxworkout/app/SessionNotificationPlugin.java. */
interface WtxSessionNotificationPlugin {
  show(options: ShowOptions): Promise<void>
  /** Ends the workout's notification; `reason` tells the watch how the session ended. */
  stop(options?: { reason?: 'finished' | 'discarded' }): Promise<void>
  /**
   * The one place the running rest's deadline is changed from the phone's controls,
   * the notification and the watch alike: the host applies it, once, and answers with
   * the rest it left.
   */
  adjustRest(options: {
    commandId: string
    sessionId: string
    restId: string
    deltaSeconds: number
  }): Promise<AdjustRestResult>
  /** The rest as the host holds it; empty when it holds none. */
  getRestState(): Promise<Partial<ConfirmedRest>>
  addListener(event: 'tap', listener: () => void): Promise<PluginListenerHandle>
  /** The host changed the rest on its own (notification action, watch): adopt this. */
  addListener(
    event: 'restState',
    listener: (event: ConfirmedRest) => void,
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

/** An exercise's name as the app shows it in the current language (display only). */
function displayExerciseName(name: string): string {
  if (i18n.global.locale.value !== 'es') return name
  return findCatalogEntryByName(name)?.nameEs ?? name
}

function toShowOptions(
  content: SessionNotificationContent,
  vibrateOnRestEnd: boolean,
  session: ActiveSession,
): ShowOptions {
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
    vibrateOnRestEnd,
    sessionId: session.id,
    // The rest JS holds, expired or not: the host decides by `restRev`, not by the deadline.
    restId: session.restId ?? '',
    restRev: session.restRev,
    jsRestEndsAt: session.restEndsAt ?? 0,
    restDurationMs: Math.round((session.restDurationSeconds ?? 0) * 1000),
    wear: buildWearProjection(
      session,
      (key, params) => i18n.global.t(key, params ?? {}),
      displayExerciseName,
      vibrateOnRestEnd,
    ),
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

/** Set by `initSessionNotification`; `null` where there is no native host (web, iOS). */
let host: {
  adjust: (deltaSeconds: number) => Promise<void>
} | null = null

/**
 * Moves the running rest by `deltaSeconds`: what the − and + buttons on the rest
 * panel call. On Android the native host applies the change (the same one that
 * serves the notification and the watch) and JS adopts the rest it confirms; where
 * there is no host, or it can't answer, the store applies it on its own clock.
 */
export async function adjustRest(deltaSeconds: number): Promise<void> {
  const store = useActiveSessionStore()
  if (!host) return store.adjustRestTimer(deltaSeconds)
  return host.adjust(deltaSeconds)
}

/**
 * Keeps an ongoing "workout in progress" notification in step with the
 * active session: "Resting" over a big native countdown with what comes
 * next (and −/+/skip actions), or the current exercise and next set under
 * the workout clock. It can't be swiped away while the workout runs; tapping
 * it opens the session; finishing or discarding removes it.
 *
 * The same native side is the session's rest host for the Wear OS app: it is sent
 * the rest's identity and what the watch shows, and tells JS (the `restState`
 * event, `getRestState`) when it moved the rest on its own.
 *
 * Android only for now; a no-op on the web and iOS.
 */
export function initSessionNotification(router: Router) {
  if (!isSupported()) return

  const store = useActiveSessionStore()
  const settings = useSettingsStore()
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastSent = ''
  let shown = false

  void WtxSessionNotification.addListener('tap', () => {
    if (store.isActive) void router.push({ name: 'active-session' })
  })

  // The host moved the rest (a notification action, the watch): adopt its confirmed state.
  void WtxSessionNotification.addListener('restState', (event) => {
    const confirmed = parseConfirmedRest(event)
    if (confirmed) store.applyConfirmedRest(confirmed)
  })

  /** Asks the host for the rest it holds and adopts it. */
  async function reconcile() {
    const confirmed = parseConfirmedRest(await WtxSessionNotification.getRestState())
    if (confirmed) store.applyConfirmedRest(confirmed)
  }
  store.setRestReconciler(reconcile)
  // The page was paused (the app in the background, the screen off): hear the host first.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && store.session) void reconcile().catch(() => {})
  })

  async function flush() {
    timer = undefined
    const session = store.session
    const content = buildSessionNotification(session, (key, params) =>
      i18n.global.t(key, params ?? {}),
    )
    if (!session || !content) return
    const options = toShowOptions(content, settings.vibrateOnRestEnd, session)
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

  /** Sends what is pending now, so the host knows the rest before a change to it. */
  async function flushNow() {
    clearTimeout(timer)
    await flush()
  }

  host = {
    async adjust(deltaSeconds) {
      const session = store.session
      if (!session?.restEndsAt || !session.restId) return
      try {
        await flushNow()
        const result = await WtxSessionNotification.adjustRest({
          commandId: newUuid(),
          sessionId: session.id,
          restId: session.restId,
          deltaSeconds,
        })
        if (!result.accepted) {
          // Refused (the host holds another rest or none): what JS has is wrong; take the host's word.
          await reconcile()
          return
        }
        const confirmed = parseConfirmedRest(result)
        if (confirmed) store.applyConfirmedRest(confirmed)
      } catch (err) {
        // The host could not be reached: apply it here, as on the web.
        console.error('[sessionNotification] adjustRest failed', err)
        store.adjustRestTimer(deltaSeconds)
      }
    },
  }

  watch(
    [() => store.session, () => i18n.global.locale.value, () => settings.vibrateOnRestEnd],
    () => {
      if (!store.session) {
        clearTimeout(timer)
        timer = undefined
        lastSent = ''
        if (shown) {
          shown = false
          void WtxSessionNotification.stop({ reason: store.lastEnd?.reason }).catch(() => {})
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
