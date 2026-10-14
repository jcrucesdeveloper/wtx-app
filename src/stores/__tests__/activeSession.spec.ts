import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useSessionsStore } from '@/stores/sessions'
import { WorkoutParser } from '@/lib/wtx'
import type { StoredRoutine } from '@/stores/routines'

const ROUTINE = { id: 'r1', filename: 'push-day.wtt' } as StoredRoutine

const TEMPLATE = `# Push Day
unit: kg

Bench Press | reps 3x8 | 60 | rest 1m30s
W | 40 | 10
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

describe('activeSession.replaceExercise', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('swaps the exercise in place and keeps the rest of the workout', () => {
    const store = startWorkout()
    store.replaceExercise(0, 'Incline Dumbbell Press')

    expect(store.session!.draft.exercises.map((e) => e.name)).toEqual([
      'Incline Dumbbell Press',
      'Overhead Press',
    ])
  })

  it('keeps the shape of the slot: set count, set types and rest', () => {
    const store = startWorkout()
    store.replaceExercise(0, 'Incline Dumbbell Press')

    const swapped = exercise(store, 0)
    expect(swapped.loggedSets.map((s) => s.type)).toEqual(['W', 'number', 'number'])
    expect(swapped.restSeconds).toBe(90)
    expect(swapped.sets).toBe(3)
  })

  it('carries nothing logged over to the new exercise', () => {
    const store = startWorkout()
    const before = exercise(store, 0).loggedSets.map((s) => s.id)
    store.updateSet(0, before[1]!, { weight: 60, reps: 8 })
    store.completeSet(0, before[1]!)
    store.updateNote(0, 'elbows in')

    store.replaceExercise(0, 'Incline Dumbbell Press')

    const swapped = exercise(store, 0)
    expect(swapped.loggedSets.every((s) => !s.completed && s.weight === null && s.reps === null)).toBe(true)
    expect(swapped.loggedSets.some((s) => before.includes(s.id))).toBe(false)
    expect(swapped.note).toBe('')
    expect(swapped.weight).toBe(0)
  })

  it('stops a rest timer that was running for the replaced exercise only', () => {
    const store = startWorkout()
    const setId = exercise(store, 0).loggedSets[1]!.id
    store.completeSet(0, setId)
    expect(store.session!.restEndsAt).not.toBeNull()

    store.replaceExercise(1, 'Lateral Raise')
    expect(store.session!.restEndsAt).not.toBeNull()

    store.replaceExercise(0, 'Incline Dumbbell Press')
    expect(store.session!.restEndsAt).toBeNull()
    expect(store.session!.restExerciseIndex).toBeNull()
  })

  it('prefills from the last time the new exercise was logged, in any routine', () => {
    const sessions = useSessionsStore()
    sessions.add(
      `# Pull Day - 2026-09-01
unit: kg

Incline Dumbbell Press | 2x10 | 24
W | 12 | 15
1 | 24 | 10
2 | 26 | 8
`,
      'other-routine',
      1000,
    )
    const store = startWorkout()
    store.replaceExercise(0, '  incline dumbbell press ')

    const swapped = exercise(store, 0)
    expect(
      swapped.loggedSets.map((s) => [s.type, s.ghostWeight, s.ghostReps, s.ghostFromLast]),
    ).toEqual([
      ['W', 12, 15, true],
      ['number', 24, 10, true],
      ['number', 26, 8, true],
    ])
    expect(swapped.weight).toBe(26)
  })

  it('leaves placeholders empty for an exercise never logged before', () => {
    const store = startWorkout()
    store.replaceExercise(0, 'Incline Dumbbell Press')
    expect(exercise(store, 0).loggedSets.every((s) => s.ghostWeight === undefined)).toBe(true)
  })

  it('ignores an index that is not in the workout', () => {
    const store = startWorkout()
    store.replaceExercise(7, 'Incline Dumbbell Press')
    expect(store.session!.draft.exercises.map((e) => e.name)).toEqual(['Bench Press', 'Overhead Press'])
  })
})
