import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useActiveSessionStore } from '@/stores/activeSession'
import { WorkoutParser } from '@/lib/wtx'
import { serializeSession } from '@/lib/serializeSession'
import type { StoredRoutine } from '@/stores/routines'

vi.mock('@/lib/exercises/imageCache', () => ({ warmExerciseImages: () => Promise.resolve() }))

const ROUTINE = { id: 'r1', filename: 'push-day.wtt' } as StoredRoutine

const TEMPLATE = `# Push Day
unit: kg

Bench Press | reps 3x8 | 60 | rest 1m30s
Overhead Press | reps 2x10 | 30
`

type Store = ReturnType<typeof useActiveSessionStore>

function startWorkout() {
  const store = useActiveSessionStore()
  store.start(ROUTINE, WorkoutParser.parseTemplate(TEMPLATE))
  return store
}

const exercise = (store: Store, index: number) => store.session!.draft.exercises[index]!
const setIds = (store: Store, index: number) => exercise(store, index).loggedSets.map((s) => s.id)

function log(store: Store, index: number, setId: string, weight: number, reps: number) {
  store.updateSet(index, setId, { weight, reps })
  store.completeSet(index, setId)
}

/** What finishing now would save, read back the way history reads it. */
function saved(store: Store) {
  return WorkoutParser.parseSession(serializeSession(store.session!.draft))
}

describe('activeSession: deleting a set', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-16T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('takes out a set not yet logged, and keeps the others in order', () => {
    const store = startWorkout()
    const [a, b, c] = setIds(store, 0)
    store.removeSet(0, b!)
    expect(setIds(store, 0)).toEqual([a, c])
  })

  it("takes a logged set out of the workout's totals", () => {
    const store = startWorkout()
    const [a, b] = setIds(store, 0)
    log(store, 0, a!, 60, 8)
    log(store, 0, b!, 70, 5)
    expect(saved(store).totalVolume).toBe(60 * 8 + 70 * 5)

    store.removeSet(0, b!)
    const session = saved(store)
    expect(session.totalVolume).toBe(60 * 8)
    expect(session.totalWorkingSets).toBe(1)
    expect(session.totalReps).toBe(8)
  })

  it('leaves an exercise in the workout, empty, when its last set goes', () => {
    const store = startWorkout()
    for (const id of setIds(store, 1)) store.removeSet(1, id)
    expect(store.session!.draft.exercises).toHaveLength(2)
    expect(exercise(store, 1).loggedSets).toEqual([])
    // Nothing logged for it, so it doesn't count — but saving still works.
    expect(saved(store).exercises[1]!.loggedSets).toEqual([])
  })

  it('ignores a set id that is not there', () => {
    const store = startWorkout()
    const before = setIds(store, 0)
    store.removeSet(0, 'nope')
    store.removeSet(5, before[0]!)
    expect(setIds(store, 0)).toEqual(before)
  })

  describe('undo', () => {
    it('puts a logged set back where it was, with its numbers and type', () => {
      const store = startWorkout()
      const [a, b, c] = setIds(store, 0)
      log(store, 0, a!, 60, 8)
      log(store, 0, b!, 70, 5)
      store.cycleSetType(0, b!) // a warm-up now
      const original = { ...exercise(store, 0).loggedSets[1]! }
      const volume = saved(store).totalVolume

      store.removeSet(0, b!)
      store.restoreSet(0, b!)

      expect(setIds(store, 0)).toEqual([a, b, c])
      expect(exercise(store, 0).loggedSets[1]).toEqual(original)
      expect(saved(store).totalVolume).toBe(volume)
    })

    it('brings back the last set of an exercise', () => {
      const store = startWorkout()
      const ids = setIds(store, 1)
      for (const id of ids) store.removeSet(1, id)
      store.restoreSet(1, ids[ids.length - 1]!)
      expect(setIds(store, 1)).toEqual([ids[ids.length - 1]])
    })

    it('only undoes the last delete', () => {
      const store = startWorkout()
      const [a, b] = setIds(store, 0)
      store.removeSet(0, a!)
      store.removeSet(0, b!)
      store.restoreSet(0, a!)
      expect(setIds(store, 0)).not.toContain(a)
      store.restoreSet(0, b!)
      expect(setIds(store, 0)).toContain(b)
    })

    it('works once', () => {
      const store = startWorkout()
      const [a] = setIds(store, 0)
      store.removeSet(0, a!)
      store.restoreSet(0, a!)
      store.restoreSet(0, a!)
      expect(setIds(store, 0).filter((id) => id === a)).toHaveLength(1)
    })

    it('follows its exercise when the exercises before it change', () => {
      const store = startWorkout()
      const [a] = setIds(store, 1)
      store.removeSet(1, a!)
      store.removeExercise(0)
      // Overhead Press is first now: the undo goes to it there, not to index 1.
      store.restoreSet(1, a!)
      expect(store.session!.draft.exercises).toHaveLength(1)
      store.restoreSet(0, a!)
      expect(setIds(store, 0)[0]).toBe(a)
    })

    it("does nothing once the set's exercise is gone", () => {
      const store = startWorkout()
      const [a] = setIds(store, 1)
      store.removeSet(1, a!)
      store.removeExercise(1)
      store.restoreSet(0, a!)
      expect(setIds(store, 0)).not.toContain(a)
    })

    it('is gone once the workout is discarded and a new one starts', () => {
      const store = startWorkout()
      const [a] = setIds(store, 0)
      store.removeSet(0, a!)
      store.discard()
      startWorkout()
      store.restoreSet(0, a!)
      expect(setIds(store, 0)).not.toContain(a)
    })
  })

  describe('and the rest timer', () => {
    it('stops the rest running after the deleted set', () => {
      const store = startWorkout()
      const [a] = setIds(store, 0)
      log(store, 0, a!, 60, 8)
      expect(store.session!.restSetId).toBe(a)

      store.removeSet(0, a!)
      expect(store.session!.restEndsAt).toBeNull()
      expect(store.session!.restSetId).toBeNull()
    })

    it('leaves a rest after another set running', () => {
      const store = startWorkout()
      const [a, b] = setIds(store, 0)
      log(store, 0, a!, 60, 8)
      store.removeSet(0, b!)
      expect(store.session!.restSetId).toBe(a)
      expect(store.restRemainingSeconds).toBe(90)
    })

    it('picks the rest back up on undo, where it would be by now', () => {
      const store = startWorkout()
      const [a] = setIds(store, 0)
      log(store, 0, a!, 60, 8)
      vi.advanceTimersByTime(10_000)
      store.removeSet(0, a!)
      vi.advanceTimersByTime(3_000)
      store.restoreSet(0, a!)

      expect(store.session!.restSetId).toBe(a)
      expect(store.session!.restExerciseIndex).toBe(0)
      expect(store.session!.restDurationSeconds).toBe(90)
      expect(store.restRemainingSeconds).toBe(77)
    })

    it("doesn't bring back a rest that would be over", () => {
      const store = startWorkout()
      const [a] = setIds(store, 0)
      log(store, 0, a!, 60, 8)
      store.removeSet(0, a!)
      vi.advanceTimersByTime(91_000)
      store.restoreSet(0, a!)
      expect(store.session!.restEndsAt).toBeNull()
    })

    it("doesn't replace a rest started since", () => {
      const store = startWorkout()
      const [a, b] = setIds(store, 0)
      log(store, 0, a!, 60, 8)
      store.removeSet(0, a!)
      log(store, 0, b!, 60, 8)
      store.restoreSet(0, a!)
      expect(store.session!.restSetId).toBe(b)
    })
  })

  it('is saved, and so is the undo, for a resume after reload', async () => {
    const store = startWorkout()
    const [a, b] = setIds(store, 0)
    log(store, 0, a!, 60, 8)
    store.removeSet(0, a!)
    await nextTick()
    vi.advanceTimersByTime(500)
    const stored = () =>
      JSON.parse(localStorage.getItem('wtx:activeSession')!).draft.exercises[0].loggedSets.map(
        (s: { id: string }) => s.id,
      )
    expect(stored()).toEqual([b, expect.any(String)])

    store.restoreSet(0, a!)
    await nextTick()
    vi.advanceTimersByTime(500)
    expect(stored()[0]).toBe(a)

    setActivePinia(createPinia())
    const resumed = useActiveSessionStore()
    expect(resumed.session!.draft.exercises[0]!.loggedSets[0]).toMatchObject({
      id: a,
      completed: true,
      weight: 60,
      reps: 8,
    })
  })
})
