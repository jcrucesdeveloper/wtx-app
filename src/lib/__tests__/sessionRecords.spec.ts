import { describe, it, expect } from 'vitest'
import { allTimeBestsByExercise, detectPersonalRecords } from '../sessionRecords'
import { serializeSession, type SessionDraft } from '../serializeSession'
import { parseSessionText } from '../parseSession'
import type { WorkoutSession } from '../wtx'

function draft(overrides: Partial<SessionDraft> = {}): SessionDraft {
  return {
    name: 'Push Day',
    date: '2026-09-18',
    unit: 'kg',
    exercises: [],
    ...overrides,
  }
}

function bench(weight: number, reps: number): SessionDraft['exercises'][number] {
  return {
    name: 'Bench Press',
    kind: 'reps',
    sets: 1,
    reps,
    weight,
    note: '',
    loggedSets: [{ id: '1', type: 'number', weight, reps, completed: true }],
  }
}

function session(exercises: SessionDraft['exercises']): WorkoutSession {
  const result = parseSessionText(serializeSession(draft({ exercises })))
  if (!result.ok) throw new Error(result.error)
  return result.session
}

describe('allTimeBestsByExercise', () => {
  it('picks the heaviest working set per exercise across sessions', () => {
    const bests = allTimeBestsByExercise([session([bench(80, 6)]), session([bench(85, 4)])])
    expect(bests.get('bench press')).toEqual({ weight: 85, reps: 4 })
  })

  it('matches exercise names case- and whitespace-insensitively', () => {
    const bests = allTimeBestsByExercise([session([bench(80, 6)])])
    expect(bests.get('bench press')).toEqual({ weight: 80, reps: 6 })
  })
})

describe('detectPersonalRecords', () => {
  it('reports no records with no prior history', () => {
    const finished = session([bench(80, 6)])
    expect(detectPersonalRecords(finished, new Map())).toEqual([])
  })

  it('reports a record when this session lifts heavier than the all-time best', () => {
    const priorBests = allTimeBestsByExercise([session([bench(80, 6)])])
    const finished = session([bench(85, 4)])

    expect(detectPersonalRecords(finished, priorBests)).toEqual([
      {
        exerciseName: 'Bench Press',
        weight: 85,
        reps: 4,
        previousWeight: 80,
        previousReps: 6,
      },
    ])
  })

  it('does not report a record for more reps at the same weight', () => {
    const priorBests = allTimeBestsByExercise([session([bench(80, 6)])])
    const finished = session([bench(80, 10)])

    expect(detectPersonalRecords(finished, priorBests)).toEqual([])
  })

  it('does not report a record for a lighter or equal top set', () => {
    const priorBests = allTimeBestsByExercise([session([bench(80, 6)])])
    const finished = session([bench(75, 8)])

    expect(detectPersonalRecords(finished, priorBests)).toEqual([])
  })
})
