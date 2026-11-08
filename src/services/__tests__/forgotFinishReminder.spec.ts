import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import type { Router } from 'vue-router'
import type { ActionPerformed } from '@capacitor/local-notifications'
import { useActiveSessionStore } from '@/stores/activeSession'
import { WorkoutParser } from '@/lib/wtx'
import type { StoredRoutine } from '@/stores/routines'

type Scheduled = { notifications: Record<string, unknown>[] }

const platform = vi.hoisted(() => ({ name: 'android' }))
const ln = vi.hoisted(() => {
  const ok = () => Promise.resolve()
  const state = { listener: null as null | ((event: ActionPerformed) => void) }
  return {
    state,
    schedule: vi.fn<(options: Scheduled) => Promise<void>>(ok),
    cancel: vi.fn<(options: object) => Promise<void>>(ok),
    removeDeliveredNotificationsById: vi.fn<(options: object) => Promise<void>>(ok),
    createChannel: vi.fn<(options: object) => Promise<void>>(ok),
    registerActionTypes: vi.fn<(options: object) => Promise<void>>(ok),
    checkPermissions: vi.fn<() => Promise<{ display: string }>>(() =>
      Promise.resolve({ display: 'prompt' }),
    ),
    requestPermissions: vi.fn<() => Promise<{ display: string }>>(() =>
      Promise.resolve({ display: 'granted' }),
    ),
    addListener: vi.fn<(event: string, cb: (event: ActionPerformed) => void) => Promise<object>>(
      (_event, cb) => {
        state.listener = cb
        return Promise.resolve({ remove: ok })
      },
    ),
  }
})

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => platform.name, isNativePlatform: () => platform.name !== 'web' },
}))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: ln }))

const {
  initForgotFinishReminder,
  forgotFinishRoute,
  FORGOT_FINISH_ID,
  FORGOT_FINISH_CHANNEL,
  FORGOT_FINISH_ACTIONS,
} = await import('../forgotFinishReminder')

const ROUTINE = { id: 'r1', filename: 'push-day.wtt' } as StoredRoutine
const TEMPLATE = `# Push Day
unit: kg

Bench Press | reps 3x8 | 60
`
const NOW = Date.parse('2026-11-01T10:00:00Z')
const FIVE_HOURS = 5 * 60 * 60 * 1000

function action(actionId: string, id = FORGOT_FINISH_ID): ActionPerformed {
  return { actionId, notification: { id, title: '', body: '' } }
}

function startWorkout() {
  const store = useActiveSessionStore()
  store.start(ROUTINE, WorkoutParser.parseTemplate(TEMPLATE))
  return store
}

/** When the last scheduled reminder fires, epoch ms. */
function scheduledAt(): number {
  const notification = ln.schedule.mock.lastCall![0].notifications[0]!
  return (notification.schedule as { at: Date }).at.getTime()
}

/** Lets the queued native calls run. */
async function settle() {
  await nextTick()
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

describe('forgotFinishRoute', () => {
  it('opens the finish review for "Finish workout"', () => {
    expect(forgotFinishRoute(action('finish'), true)).toEqual({
      name: 'active-session',
      query: { finish: '1' },
    })
  })

  it('opens the workout for "Keep going" and a plain tap', () => {
    expect(forgotFinishRoute(action('keep-going'), true)).toEqual({ name: 'active-session' })
    expect(forgotFinishRoute(action('tap'), true)).toEqual({ name: 'active-session' })
  })

  it('stays put once the workout is gone, or for another notification', () => {
    expect(forgotFinishRoute(action('finish'), false)).toBeNull()
    expect(forgotFinishRoute(action('tap', 1), true)).toBeNull()
  })
})

describe('initForgotFinishReminder', () => {
  const push = vi.fn<(to: unknown) => Promise<void>>(() => Promise.resolve())
  const router = { push } as unknown as Router

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    platform.name = 'android'
    vi.clearAllMocks()
    ln.state.listener = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing on the web', async () => {
    platform.name = 'web'
    initForgotFinishReminder(router)
    startWorkout()
    await settle()
    expect(ln.schedule).not.toHaveBeenCalled()
    expect(ln.addListener).not.toHaveBeenCalled()
  })

  it('schedules it five hours after a workout starts, on its own id, channel and actions', async () => {
    initForgotFinishReminder(router)
    startWorkout()
    await settle()

    expect(ln.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: FORGOT_FINISH_CHANNEL }),
    )
    expect(ln.registerActionTypes).toHaveBeenCalled()
    expect(ln.schedule.mock.lastCall![0].notifications[0]).toMatchObject({
      id: FORGOT_FINISH_ID,
      channelId: FORGOT_FINISH_CHANNEL,
      actionTypeId: FORGOT_FINISH_ACTIONS,
      // Exact would open Android's "Alarms & reminders" screen on every schedule.
      isExactNotification: false,
    })
    expect(scheduledAt()).toBe(NOW + FIVE_HOURS)
  })

  it('cancels it when the workout is finished or discarded', async () => {
    initForgotFinishReminder(router)
    const store = startWorkout()
    await settle()
    vi.clearAllMocks()

    store.discard()
    await settle()
    expect(ln.cancel).toHaveBeenCalledWith({ notifications: [{ id: FORGOT_FINISH_ID }] })
    expect(ln.removeDeliveredNotificationsById).toHaveBeenCalledWith({ ids: [FORGOT_FINISH_ID] })
    expect(ln.schedule).not.toHaveBeenCalled()
  })

  it('moves it to a workout that replaces the old one', async () => {
    initForgotFinishReminder(router)
    startWorkout()
    await settle()

    vi.setSystemTime(NOW + 60_000)
    startWorkout()
    await settle()
    expect(scheduledAt()).toBe(NOW + 60_000 + FIVE_HOURS)
  })

  it('leaves a workout reopened after five hours alone', async () => {
    startWorkout()
    vi.setSystemTime(NOW + FIVE_HOURS + 1)
    initForgotFinishReminder(router)
    await settle()
    expect(ln.cancel).toHaveBeenCalled()
    expect(ln.schedule).not.toHaveBeenCalled()
  })

  it('asks iOS for permission once, when a workout starts', async () => {
    platform.name = 'ios'
    initForgotFinishReminder(router)
    await settle()
    expect(ln.requestPermissions).not.toHaveBeenCalled()

    const store = startWorkout()
    await settle()
    expect(ln.createChannel).not.toHaveBeenCalled()
    expect(ln.requestPermissions).toHaveBeenCalledTimes(1)

    store.discard()
    await settle()
    startWorkout()
    await settle()
    expect(ln.requestPermissions).toHaveBeenCalledTimes(1)
  })

  it('opens the finish review from the notification action', () => {
    initForgotFinishReminder(router)
    startWorkout()
    ln.state.listener!(action('finish'))
    expect(push).toHaveBeenCalledWith({ name: 'active-session', query: { finish: '1' } })
  })
})
