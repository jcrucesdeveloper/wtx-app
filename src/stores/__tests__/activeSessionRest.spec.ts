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
Overhead Press | reps 2x10 | 30
`

function startWorkout() {
  const store = useActiveSessionStore()
  store.start(ROUTINE, WorkoutParser.parseTemplate(TEMPLATE))
  return store
}

function exercise(store: ReturnType<typeof useActiveSessionStore>, index: number) {
  return store.session!.draft.exercises[index]!
}

/** Logs the exercise's first set, which starts its rest if it has one. */
function logFirstSet(store: ReturnType<typeof useActiveSessionStore>, index: number) {
  const setId = exercise(store, index).loggedSets[0]!.id
  store.completeSet(index, setId)
  return setId
}

describe('activeSession rest timer', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-14T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('setRestSeconds', () => {
    it('changes the rest for the rest of this workout', () => {
      const store = startWorkout()
      store.setRestSeconds(1, 120)
      expect(exercise(store, 1).restSeconds).toBe(120)

      logFirstSet(store, 1)
      expect(store.session!.restDurationSeconds).toBe(120)
      expect(store.restRemainingSeconds).toBe(120)
    })

    it('turns the rest off with 0, so logging a set starts none', () => {
      const store = startWorkout()
      store.setRestSeconds(0, 0)
      expect(exercise(store, 0).restSeconds).toBeUndefined()

      logFirstSet(store, 0)
      expect(store.session!.restEndsAt).toBeNull()
    })

    it('re-times a rest already running after that exercise, from when it started', () => {
      const store = startWorkout()
      logFirstSet(store, 0)
      vi.advanceTimersByTime(30_000)

      store.setRestSeconds(0, 120)
      expect(store.session!.restDurationSeconds).toBe(120)
      expect(store.restRemainingSeconds).toBe(90)
    })

    it('ends a running rest now when it is already past the new length', () => {
      const store = startWorkout()
      logFirstSet(store, 0)
      vi.advanceTimersByTime(60_000)

      store.setRestSeconds(0, 30)
      expect(store.restRemainingSeconds).toBe(0)
      vi.advanceTimersByTime(1_000)
      expect(store.session!.restEndsAt).toBeNull()
    })

    it('stops a running rest when that exercise’s rest is turned off', () => {
      const store = startWorkout()
      logFirstSet(store, 0)

      store.setRestSeconds(0, undefined)
      expect(store.session!.restEndsAt).toBeNull()
      expect(store.session!.restExerciseIndex).toBeNull()
    })

    it('leaves a rest running after another exercise alone', () => {
      const store = startWorkout()
      logFirstSet(store, 0)
      const endsAt = store.session!.restEndsAt

      store.setRestSeconds(1, 300)
      expect(store.session!.restEndsAt).toBe(endsAt)
      expect(store.session!.restDurationSeconds).toBe(90)
    })

    it('ignores an exercise that is not there', () => {
      const store = startWorkout()
      store.setRestSeconds(9, 60)
      expect(store.session!.draft.exercises).toHaveLength(2)
    })
  })

  describe('adjustRestTimer', () => {
    it('moves the rest’s length with it, so progress stays a share of the whole', () => {
      const store = startWorkout()
      logFirstSet(store, 0)
      vi.advanceTimersByTime(30_000)

      store.adjustRestTimer(15)
      expect(store.session!.restDurationSeconds).toBe(105)
      expect(store.restRemainingSeconds).toBe(75)

      store.adjustRestTimer(-15)
      expect(store.session!.restDurationSeconds).toBe(90)
      expect(store.restRemainingSeconds).toBe(60)
    })

    it('never takes the length below the time already rested', () => {
      const store = startWorkout()
      logFirstSet(store, 0)
      vi.advanceTimersByTime(80_000)

      store.adjustRestTimer(-15)
      expect(store.restRemainingSeconds).toBe(0)
      expect(store.session!.restDurationSeconds).toBe(80)
    })
  })

  describe('vibrate when the rest ends', () => {
    beforeEach(() => restOver.mockClear())

    it('buzzes once as the rest runs out', () => {
      const store = startWorkout()
      logFirstSet(store, 0)
      vi.advanceTimersByTime(89_000)
      expect(restOver).not.toHaveBeenCalled()

      vi.advanceTimersByTime(2_000)
      expect(restOver).toHaveBeenCalledTimes(1)
      expect(store.session!.restEndsAt).toBeNull()
    })

    it('stays still when the setting is off', () => {
      useSettingsStore().setVibrateOnRestEnd(false)
      const store = startWorkout()
      logFirstSet(store, 0)
      vi.advanceTimersByTime(91_000)
      expect(restOver).not.toHaveBeenCalled()
      expect(store.session!.restEndsAt).toBeNull()
    })

    it('stays still for a rest that ended long before the app noticed', () => {
      const store = startWorkout()
      logFirstSet(store, 0)
      // The app was asleep: no ticks ran, and the clock jumped past the deadline.
      vi.setSystemTime(Date.now() + 120_000)
      vi.advanceTimersByTime(1_000)
      expect(restOver).not.toHaveBeenCalled()
      expect(store.session!.restEndsAt).toBeNull()
    })
  })
})
