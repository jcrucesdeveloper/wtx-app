import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useSettingsStore } from '@/stores/settings'
import { WorkoutParser } from '@/lib/wtx'
import type { StoredRoutine } from '@/stores/routines'

const { restOver } = vi.hoisted(() => ({ restOver: vi.fn<() => Promise<void>>(() => Promise.resolve()) }))
vi.mock('@/services/haptics', () => ({
  HapticsService: {
    restOver,
    light: vi.fn<() => void>(),
    medium: vi.fn<() => void>(),
    selection: vi.fn<() => void>(),
  },
}))

const ROUTINE = { id: 'r1', filename: 'push-day.wtt' } as StoredRoutine
const TEMPLATE = `# Push Day
unit: kg

Bench Press | reps 3x8 | 60 | rest 1m30s
`

const T0 = new Date('2026-10-14T10:00:00Z').getTime()

function restingStore() {
  const store = useActiveSessionStore()
  store.start(ROUTINE, WorkoutParser.parseTemplate(TEMPLATE))
  store.completeSet(0, store.session!.draft.exercises[0]!.loggedSets[0]!.id)
  return store
}

/** The rest as the native host would confirm it. */
function confirmed(
  store: ReturnType<typeof useActiveSessionStore>,
  patch: Partial<{ restRev: number; restEndsAt: number | null; restDurationSeconds: number | null }> = {},
) {
  return {
    sessionId: store.session!.id,
    restId: store.session!.restId!,
    restRev: 1,
    restEndsAt: T0 + 105_000,
    restDurationSeconds: 105,
    ...patch,
  }
}

describe('a rest hosted natively', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    restOver.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('identity', () => {
    it('gives a session an id, and every rest its own, starting at revision 0', () => {
      const store = restingStore()
      const first = store.session!.restId
      expect(store.session!.id).toBeTruthy()
      expect(first).toBeTruthy()
      expect(store.session!.restRev).toBe(0)

      store.skipRestTimer()
      expect(store.session!.restId).toBeNull()
      store.startRestTimer(0, 'x', 60)
      expect(store.session!.restId).toBeTruthy()
      expect(store.session!.restId).not.toBe(first)
    })

    it('counts a change to the running rest, so a copy of it can be told apart', () => {
      const store = restingStore()
      store.adjustRestTimer(15)
      expect(store.session!.restRev).toBe(1)
      store.setRestSeconds(0, 120)
      expect(store.session!.restRev).toBe(2)
    })

    it('names sessions and rests it loaded from before they had ids', () => {
      localStorage.setItem(
        'wtx:activeSession',
        JSON.stringify({
          draft: { name: 'Old', date: '2026-10-01', exercises: [] },
          routineId: 'r1',
          startedAt: T0 - 1000,
          restEndsAt: T0 + 30_000,
          restDurationSeconds: 60,
          restExerciseIndex: null,
          restSetId: null,
        }),
      )
      setActivePinia(createPinia())
      const store = useActiveSessionStore()
      expect(store.session!.id).toBeTruthy()
      expect(store.session!.restId).toBeTruthy()
      expect(store.session!.restRev).toBe(0)
    })
  })

  describe('applyConfirmedRest', () => {
    it('replaces the deadline with the confirmed one instead of adding to it', () => {
      const store = restingStore()
      const before = store.session!.restEndsAt!
      expect(store.applyConfirmedRest(confirmed(store))).toBe(true)
      expect(store.session!.restEndsAt).toBe(T0 + 105_000)
      expect(store.session!.restDurationSeconds).toBe(105)
      expect(store.session!.restRev).toBe(1)
      // Applying the same confirmation again changes nothing: the delta is not applied twice.
      expect(store.applyConfirmedRest(confirmed(store))).toBe(false)
      expect(store.session!.restEndsAt).toBe(T0 + 105_000)
      expect(before).toBe(T0 + 90_000)
    })

    it('ignores a confirmation older than what it holds', () => {
      const store = restingStore()
      store.applyConfirmedRest(confirmed(store, { restRev: 3, restEndsAt: T0 + 120_000 }))
      expect(store.applyConfirmedRest(confirmed(store, { restRev: 2, restEndsAt: T0 + 105_000 }))).toBe(false)
      expect(store.session!.restEndsAt).toBe(T0 + 120_000)
    })

    it('ignores one about another rest or another session', () => {
      const store = restingStore()
      expect(store.applyConfirmedRest({ ...confirmed(store), restId: 'an-earlier-rest' })).toBe(false)
      expect(store.applyConfirmedRest({ ...confirmed(store), sessionId: 'another-session' })).toBe(false)
      expect(store.session!.restEndsAt).toBe(T0 + 90_000)
    })

    it('ends the rest the host says is over (skipped, or cut back to zero)', () => {
      const store = restingStore()
      expect(store.applyConfirmedRest(confirmed(store, { restEndsAt: null }))).toBe(true)
      expect(store.session!.restEndsAt).toBeNull()
      expect(store.session!.restId).toBeNull()
    })

    it('does nothing once the session is gone', () => {
      const store = restingStore()
      const stale = confirmed(store)
      store.discard()
      expect(store.applyConfirmedRest(stale)).toBe(false)
    })
  })

  describe('a rest that runs out', () => {
    it('hears the host first: a deadline the host moved while this page was paused is kept', async () => {
      useSettingsStore().setVibrateOnRestEnd(true)
      const store = restingStore()
      // The watch added 15 s while this page was paused; JS still holds the old deadline.
      const reconcile = vi.fn(() => {
        store.applyConfirmedRest(confirmed(store, { restEndsAt: T0 + 105_000 }))
        return Promise.resolve()
      })
      store.setRestReconciler(reconcile)

      vi.setSystemTime(T0 + 91_000)
      await vi.advanceTimersByTimeAsync(1000)

      expect(reconcile).toHaveBeenCalled()
      expect(store.session!.restEndsAt).toBe(T0 + 105_000)
      expect(store.restRemainingSeconds).toBeGreaterThan(0)
      expect(restOver).not.toHaveBeenCalled()
    })

    it('ends it as before when the host has nothing newer', async () => {
      useSettingsStore().setVibrateOnRestEnd(true)
      const store = restingStore()
      store.setRestReconciler(() => Promise.resolve())

      await vi.advanceTimersByTimeAsync(90_000)

      expect(store.session!.restEndsAt).toBeNull()
      expect(restOver).toHaveBeenCalledTimes(1)
    })

    it('asks the host once, not once per second, while it answers', async () => {
      const store = restingStore()
      let release: () => void = () => {}
      const reconcile = vi.fn(() => new Promise<void>((resolve) => (release = resolve)))
      store.setRestReconciler(reconcile)

      await vi.advanceTimersByTimeAsync(93_000)
      expect(reconcile).toHaveBeenCalledTimes(1)
      release()
    })

    it('still ends it if the host cannot be asked', async () => {
      const store = restingStore()
      store.setRestReconciler(() => Promise.reject(new Error('no host')))
      await vi.advanceTimersByTimeAsync(91_000)
      expect(store.session!.restEndsAt).toBeNull()
    })
  })

  describe('how the session ended', () => {
    it('tells finished from discarded, for the watch', () => {
      const store = restingStore()
      const id = store.session!.id
      store.discard()
      expect(store.lastEnd).toEqual({ sessionId: id, reason: 'discarded' })

      store.start(ROUTINE, WorkoutParser.parseTemplate(TEMPLATE))
      expect(store.lastEnd).toBeNull()
      const next = store.session!.id
      store.finish()
      expect(store.lastEnd).toEqual({ sessionId: next, reason: 'finished' })
    })
  })
})
