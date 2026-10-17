import { describe, it, expect } from 'vitest'
import { pastSessionRecap, type LoggedSession } from '../pastSessionRecap'
import { serializeSession, type SessionDraft } from '../serializeSession'
import { parseSessionText } from '../parseSession'

function bench(weight: number, reps = 5): SessionDraft['exercises'][number] {
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

function logged(id: string, addedAt: number, weight: number, extra: Partial<LoggedSession> = {}): LoggedSession {
  const result = parseSessionText(
    serializeSession({ name: 'Push', date: '2026-09-18', unit: 'kg', exercises: [bench(weight)] }),
  )
  if (!result.ok) throw new Error(result.error)
  return { id, addedAt, routineId: 'push', session: result.session, ...extra }
}

describe('pastSessionRecap', () => {
  it('finds the records a session set against the ones logged before it', () => {
    const a = logged('a', 1, 80)
    const b = logged('b', 2, 90)
    const c = logged('c', 3, 100)
    const recap = pastSessionRecap(b, [c, b, a])
    expect(recap.personalRecords).toEqual([
      expect.objectContaining({ exerciseName: 'Bench Press', weight: 90, previousWeight: 80 }),
    ])
  })

  it('ignores sessions logged later', () => {
    const a = logged('a', 1, 80)
    const b = logged('b', 2, 70)
    const c = logged('c', 3, 60)
    expect(pastSessionRecap(b, [c, b, a]).personalRecords).toEqual([])
  })

  it('compares with the previous session of the same routine', () => {
    const a = logged('a', 1, 80)
    const other = logged('x', 2, 200, { routineId: 'legs' })
    const b = logged('b', 3, 100)
    const recap = pastSessionRecap(b, [b, other, a])
    expect(recap.comparison?.volumeDelta).toBe(100)
    expect(recap.comparison?.isVolumeUp).toBe(true)
  })

  it('has no comparison or time when nothing was recorded', () => {
    const a = logged('a', 1, 80, { routineId: undefined })
    const recap = pastSessionRecap(a, [a])
    expect(recap.comparison).toBeUndefined()
    expect(recap.elapsedSeconds).toBe(0)
  })

  it('keeps what a posted session celebrated', () => {
    const a = logged('a', 1, 80)
    const b = logged('b', 2, 90, {
      feedSnapshot: {
        personalRecords: [],
        comparison: undefined,
        milestone: undefined,
        weekStreak: 3,
        elapsedSeconds: 2700,
      },
    })
    const recap = pastSessionRecap(b, [b, a])
    expect(recap.personalRecords).toEqual([])
    expect(recap.elapsedSeconds).toBe(2700)
    expect(recap.weekStreak).toBe(3)
  })
})
