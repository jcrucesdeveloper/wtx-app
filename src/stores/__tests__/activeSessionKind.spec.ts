import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useSessionsStore } from '@/stores/sessions'
import { WorkoutParser } from '@/lib/wtx'
import { parseSessionText } from '@/lib/parseSession'
import { isTimeExercise } from '@/lib/sessionTime'
import type { StoredRoutine } from '@/stores/routines'

const ROUTINE = { id: 'r1', filename: 'legs.wtt' } as StoredRoutine

const TEMPLATE = `# Legs
unit: kg

Squat | reps 3x5 | 100 | rest 2m
W | 60 | 5
Treadmill | time 10m
`

function startWorkout() {
  const store = useActiveSessionStore()
  store.start(ROUTINE, WorkoutParser.parseTemplate(TEMPLATE))
  return store
}

function exercise(store: ReturnType<typeof useActiveSessionStore>, index: number) {
  return store.session!.draft.exercises[index]!
}

describe('activeSession.setExerciseKind', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('switches a rep-based exercise to time, keeping its set types', () => {
    const store = startWorkout()
    store.setExerciseKind(0, 'time')

    const switched = exercise(store, 0)
    expect(switched.kind).toBe('time')
    expect(switched.weight).toBe(0)
    expect(switched.reps).toBe(60)
    expect(switched.loggedSets.map((s) => s.type)).toEqual(['W', 'number', 'number'])
  })

  it('clears logged and typed sets: 5 reps are not 5 seconds', () => {
    const store = startWorkout()
    const ids = exercise(store, 0).loggedSets.map((s) => s.id)
    store.updateSet(0, ids[1]!, { weight: 100, reps: 5 })
    store.completeSet(0, ids[1]!)
    store.updateSet(0, ids[2]!, { weight: 100, reps: null })

    store.setExerciseKind(0, 'time')

    const switched = exercise(store, 0)
    expect(
      switched.loggedSets.every((s) => !s.completed && s.weight === null && s.reps === null),
    ).toBe(true)
    expect(switched.loggedSets.some((s) => ids.includes(s.id))).toBe(false)
    expect(switched.loggedSets.every((s) => s.ghostReps === undefined)).toBe(true)
  })

  it('stops the rest timer running for that exercise', () => {
    const store = startWorkout()
    const id = exercise(store, 0).loggedSets[1]!.id
    store.completeSet(0, id)
    expect(store.session!.restEndsAt).not.toBeNull()

    store.setExerciseKind(0, 'time')
    expect(store.session!.restEndsAt).toBeNull()
  })

  it('does nothing when the kind is unchanged or the index is out of range', () => {
    const store = startWorkout()
    const before = exercise(store, 1).loggedSets.map((s) => s.id)
    store.setExerciseKind(1, 'time')
    store.setExerciseKind(9, 'reps')
    expect(exercise(store, 1).loggedSets.map((s) => s.id)).toEqual(before)
  })

  it('prefills from the last time it was logged the same way', () => {
    useSessionsStore().add(
      `# Cardio - 2026-09-01
unit: kg

Squat | 1x45 | 0 | time
1 | 0 | 45
`,
      'other',
      1000,
    )
    const store = startWorkout()
    store.setExerciseKind(0, 'time')
    const switched = exercise(store, 0)
    expect(switched.reps).toBe(45)
    expect(switched.loggedSets[1]).toMatchObject({ ghostReps: 45, ghostFromLast: true })
  })

  it('logs a timed set with no weight and saves it as time', () => {
    const store = startWorkout()
    const set = exercise(store, 1).loggedSets[0]!
    store.updateSet(1, set.id, { weight: 40, reps: 615 })
    store.completeSet(1, set.id)
    expect(set.weight).toBe(0)

    const stored = store.finish()
    const result = parseSessionText(stored.rawText)
    if (!result.ok) throw new Error(result.error)
    const treadmill = result.session.exercises[1]!
    expect(isTimeExercise(treadmill.note)).toBe(true)
    expect(treadmill.loggedSets[0]).toMatchObject({ weight: 0, reps: 615 })
    expect(result.session.totalVolume).toBe(0)
  })

  it('switches back to weight × reps', () => {
    const store = startWorkout()
    store.setExerciseKind(1, 'reps')
    const switched = exercise(store, 1)
    expect(switched.kind).toBe('reps')
    expect(switched.reps).toBe(10)
  })
})
