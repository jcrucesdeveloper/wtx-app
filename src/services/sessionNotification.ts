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
import { findCatalogEntryByName } from '@/lib/exercises/exerciseCatalog'
import { getCachedImageObjectUrl } from '@/lib/exercises/imageCache'

interface NativeFace {
  title: string
  body: string
  /** Base64 JPEG (no `data:` prefix) for the large icon; omitted for none. */
  largeIcon?: string
}

interface ShowOptions extends NativeFace {
  channelName: string
  channelDescription: string
  startedAt: number
  /** Epoch ms the native countdown runs to; 0 when not resting. */
  restEndsAt: number
  afterRest?: NativeFace
}

/** The app's own plugin: android/app/src/main/java/com/wtxworkout/app/SessionNotificationPlugin.java. */
interface WtxSessionNotificationPlugin {
  show(options: ShowOptions): Promise<void>
  stop(): Promise<void>
  addListener(event: 'tap', listener: () => void): Promise<PluginListenerHandle>
}

const WtxSessionNotification =
  registerPlugin<WtxSessionNotificationPlugin>('WtxSessionNotification')

/** Coalesces bursts (typing a weight) into one native update. */
const UPDATE_DELAY_MS = 500
/** Large-icon edge in px — the notification shows it at 64dp or less. */
const ICON_SIZE = 160
/** We ask for notification permission once, when the first workout starts. */
const ASKED_KEY = 'wtx:sessionNotification:asked'

/** Only Android has the native side; iOS (Live Activities) is not built yet. */
function isSupported(): boolean {
  return (
    Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('WtxSessionNotification')
  )
}

const iconCache = new Map<string, Promise<string | undefined>>()

/** The exercise's first image frame from the image cache, scaled down to a small base64 JPEG. */
function exerciseIcon(name: string | null): Promise<string | undefined> {
  if (!name) return Promise.resolve(undefined)
  const entry = findCatalogEntryByName(name)
  if (!entry) return Promise.resolve(undefined)
  let pending = iconCache.get(entry.id)
  if (!pending) {
    pending = encodeIcon(entry.id)
    iconCache.set(entry.id, pending)
  }
  return pending
}

async function encodeIcon(catalogId: string): Promise<string | undefined> {
  const url = await getCachedImageObjectUrl(catalogId, 0)
  if (!url) return undefined
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = ICON_SIZE
    canvas.height = ICON_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    // White square, image centred and contained: the photos are on white.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE)
    const scale = Math.min(ICON_SIZE / image.naturalWidth, ICON_SIZE / image.naturalHeight)
    const w = image.naturalWidth * scale
    const h = image.naturalHeight * scale
    ctx.drawImage(image, (ICON_SIZE - w) / 2, (ICON_SIZE - h) / 2, w, h)
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
  } catch {
    return undefined
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function toNative(face: NotificationFace): Promise<NativeFace> {
  const largeIcon = await exerciseIcon(face.exerciseName)
  return { title: face.title, body: face.body, ...(largeIcon ? { largeIcon } : {}) }
}

async function toShowOptions(content: SessionNotificationContent): Promise<ShowOptions> {
  const t = i18n.global.t
  const [face, afterRest] = await Promise.all([
    toNative(content),
    content.afterRest ? toNative(content.afterRest) : Promise.resolve(undefined),
  ])
  return {
    ...face,
    channelName: t('sessionNotification.channelName'),
    channelDescription: t('sessionNotification.channelDescription'),
    startedAt: content.startedAt,
    restEndsAt: content.restEndsAt ?? 0,
    ...(afterRest ? { afterRest } : {}),
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
 * active session: the current exercise with its image and next set, or a
 * native rest countdown. Tapping it opens the session; finishing or
 * discarding removes it.
 *
 * Android only for now; a no-op on the web and iOS.
 */
export function initSessionNotification(router: Router) {
  if (!isSupported()) return

  const store = useActiveSessionStore()
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastSent = ''
  let shown = false
  /** Bumps per flush, so a slow icon encode can't post over a newer update. */
  let flushSeq = 0

  void WtxSessionNotification.addListener('tap', () => {
    if (store.isActive) void router.push({ name: 'active-session' })
  })

  async function flush() {
    timer = undefined
    const seq = ++flushSeq
    const content = buildSessionNotification(store.session, (key, params) =>
      i18n.global.t(key, params ?? {}),
    )
    if (!content) return
    const options = await toShowOptions(content)
    // The session may have ended, or changed again, while the icon was encoding.
    if (!store.session || seq !== flushSeq) return
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
