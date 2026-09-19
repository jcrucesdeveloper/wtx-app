import { describe, it, expect } from 'vitest'
import { serializeSession, type SessionDraft } from '../serializeSession'
import { parseSessionText } from '../parseSession'
import { isTimeExercise, displayNote } from '../sessionTime'

function draft(overrides: Partial<SessionDraft> = {}): SessionDraft {
  return {
    name: 'Push Day',
    date: '2026-09-18',
    templateFilename: 'push-day.wtt',
    unit: 'kg',
    notes: 'Felt strong today.',
    exercises: [],
    ...overrides,
  }
}

describe('serializeSession', () => {
  it('produces parseable .wts for a session with completed sets', () => {
    const d = draft({
      exercises: [
        {
          name: 'Bench Press',
          kind: 'reps',
          sets: 3,
          reps: 6,
          weight: 80,
          note: '',
          loggedSets: [
            { id: '1', isWarmup: true, weight: 40, reps: 10, completed: true },
            { id: '2', isWarmup: false, weight: 80, reps: 6, completed: true },
            { id: '3', isWarmup: false, weight: 82.5, reps: 5, completed: true },
          ],
        },
      ],
    })

    const result = parseSessionText(serializeSession(d))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.session.name).toBe('Push Day')
    expect(result.session.date).toBe('2026-09-18')
    expect(result.session.template).toBe('push-day.wtt')
    expect(result.session.exercises[0]!.loggedSets).toEqual([
      { label: 'W', weight: 40, reps: 10 },
      { label: '1', weight: 80, reps: 6 },
      { label: '2', weight: 82.5, reps: 5 },
    ])
  })

  it('only writes completed sets, skipping empty or in-progress rows', () => {
    const d = draft({
      exercises: [
        {
          name: 'Squat',
          kind: 'reps',
          sets: 3,
          reps: 5,
          weight: 100,
          note: '',
          loggedSets: [
            { id: '1', isWarmup: false, weight: 100, reps: 5, completed: true },
            { id: '2', isWarmup: false, weight: null, reps: null, completed: false },
            { id: '3', isWarmup: false, weight: 100, reps: 4, completed: false },
          ],
        },
      ],
    })

    const result = parseSessionText(serializeSession(d))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.session.exercises[0]!.loggedSets).toHaveLength(1)
  })

  it('still emits the exercise header line when no sets were completed', () => {
    const d = draft({
      exercises: [
        {
          name: 'Skipped Exercise',
          kind: 'reps',
          sets: 3,
          reps: 10,
          weight: 20,
          note: '',
          loggedSets: [],
        },
      ],
    })

    const result = parseSessionText(serializeSession(d))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.session.exercises).toHaveLength(1)
    expect(result.session.exercises[0]!.isComplete).toBe(false)
  })

  it('round-trips a time-based exercise via the reps-as-seconds convention', () => {
    const d = draft({
      exercises: [
        {
          name: 'Plank',
          kind: 'time',
          sets: 3,
          reps: 30,
          weight: 0,
          note: 'keep hips level',
          loggedSets: [
            { id: '1', isWarmup: false, weight: 0, reps: 32, completed: true },
            { id: '2', isWarmup: false, weight: 0, reps: 28, completed: true },
          ],
        },
      ],
    })

    const result = parseSessionText(serializeSession(d))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const exercise = result.session.exercises[0]!
    expect(isTimeExercise(exercise.note)).toBe(true)
    expect(displayNote(exercise.note)).toBe('keep hips level')
    expect(exercise.loggedSets.map((s) => s.reps)).toEqual([32, 28])
  })

  it('does not mistake a reps-based exercise for a time-based one', () => {
    const d = draft({
      exercises: [
        {
          name: 'Row',
          kind: 'reps',
          sets: 3,
          reps: 10,
          weight: 40,
          note: 'controlled tempo',
          loggedSets: [],
        },
      ],
    })

    const result = parseSessionText(serializeSession(d))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(isTimeExercise(result.session.exercises[0]!.note)).toBe(false)
    expect(displayNote(result.session.exercises[0]!.note)).toBe('controlled tempo')
  })
})
