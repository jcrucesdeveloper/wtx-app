import { describe, it, expect } from 'vitest'
import { findLastLoggedExercise, findLastSessionForRoutine } from '../sessionMatch'
import type { StoredRoutine } from '@/stores/routines'
import type { StoredSession } from '@/stores/sessions'

const ROUTINE = { id: 'r1', filename: 'push-day.wtt' } as StoredRoutine

function stored(
  id: string,
  addedAt: number,
  name: string,
  bench: number,
  extra: Partial<StoredSession> = {},
): StoredSession {
  const rawText = `# ${name} - 2026-09-01
unit: kg

Bench Press | 1x8 | ${bench}
1 | ${bench} | 8
`
  return { id, filename: `${id}.wts`, rawText, addedAt, ...extra }
}

const benchOf = (s: ReturnType<typeof findLastSessionForRoutine>) =>
  s?.exercises[0]?.loggedSets[0]?.weight

describe('findLastSessionForRoutine', () => {
  it('prefers the newest session started from this routine', () => {
    const sessions = [
      stored('a', 1, 'Push Day', 60, { routineId: 'r1' }),
      stored('b', 2, 'Push Day', 70, { routineId: 'r1' }),
      stored('c', 3, 'Pull Day', 99, { routineId: 'r2' }),
    ]
    expect(benchOf(findLastSessionForRoutine(sessions, ROUTINE, 'Push Day'))).toBe(70)
  })

  it('keeps the id match when the routine was renamed since', () => {
    const sessions = [stored('a', 1, 'Old Name', 60, { routineId: 'r1' })]
    expect(benchOf(findLastSessionForRoutine(sessions, ROUTINE, 'Push Day'))).toBe(60)
  })

  it('prefers an id match over a newer session that only shares the name', () => {
    const sessions = [
      stored('a', 1, 'Push Day', 60, { routineId: 'r1' }),
      stored('b', 2, 'Push Day', 80, { routineId: 'room-copy' }),
    ]
    expect(benchOf(findLastSessionForRoutine(sessions, ROUTINE, 'Push Day'))).toBe(60)
  })

  it('falls back to the newest session with the same name, trimmed and case-insensitive', () => {
    const sessions = [
      stored('a', 1, 'Push Day', 60, { routineId: 'deleted' }),
      stored('b', 2, 'push day', 75, { routineId: 'room-copy' }),
      stored('c', 3, 'Legs', 99, { routineId: 'r3' }),
    ]
    expect(benchOf(findLastSessionForRoutine(sessions, ROUTINE, '  PUSH DAY '))).toBe(75)
  })

  it("still matches older sessions by the routine's filename", () => {
    const legacy = stored('a', 1, 'Something Else', 55)
    legacy.rawText = legacy.rawText.replace('unit: kg', 'template: push-day.wtt\nunit: kg')
    expect(benchOf(findLastSessionForRoutine([legacy], ROUTINE, 'Push Day'))).toBe(55)
  })

  it('finds nothing for a routine never done', () => {
    const sessions = [stored('a', 1, 'Pull Day', 60, { routineId: 'r2' })]
    expect(findLastSessionForRoutine(sessions, ROUTINE, 'Push Day')).toBeUndefined()
    expect(findLastSessionForRoutine(sessions, ROUTINE)).toBeUndefined()
  })
})

describe('findLastLoggedExercise', () => {
  it('returns the newest logged occurrence in any session', () => {
    const sessions = [stored('a', 1, 'Push Day', 60), stored('b', 2, 'Chest', 65)]
    expect(findLastLoggedExercise(sessions, ' bench press')?.loggedSets[0]?.weight).toBe(65)
  })
})
