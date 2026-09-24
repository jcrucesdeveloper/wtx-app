import { describe, it, expect } from 'vitest'
import { compareSessions } from '../sessionComparisons'
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

describe('compareSessions', () => {
  it('is undefined with no previous session', () => {
    expect(compareSessions(session([bench(80, 6)]), undefined)).toBeUndefined()
  })

  it('is undefined when both sessions logged zero volume', () => {
    const empty = session([])
    expect(compareSessions(empty, empty)).toBeUndefined()
  })

  it('reports a positive volume delta when this session lifted more', () => {
    const previous = session([bench(80, 6)]) // 480
    const current = session([bench(80, 8)]) // 640

    expect(compareSessions(current, previous)).toEqual({
      volumeDelta: 160,
      workingSetsDelta: 0,
      isVolumeUp: true,
    })
  })

  it('reports a negative volume delta when this session lifted less', () => {
    const previous = session([bench(80, 8)]) // 640
    const current = session([bench(80, 6)]) // 480

    expect(compareSessions(current, previous)).toEqual({
      volumeDelta: -160,
      workingSetsDelta: 0,
      isVolumeUp: false,
    })
  })
})
