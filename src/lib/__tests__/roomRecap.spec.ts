import { describe, it, expect } from 'vitest'
import { buildRoomRecap, memberProgress, type RecapSetLog } from '../roomRecap'
import type { PlannedExercise } from '../memberSession'

const log = (
  user_id: string,
  exercise_name: string,
  weight: number,
  reps: number,
  minute: number,
  set_type: RecapSetLog['set_type'] = 'number',
): RecapSetLog => ({
  user_id,
  exercise_name,
  set_type,
  weight,
  reps,
  completed_at: new Date(Date.UTC(2026, 8, 25, 18, minute)).toISOString(),
})

const logs = [
  log('jaco', 'Bench Press', 40, 10, 5, 'W'),
  log('jaco', 'Bench Press', 70, 8, 8),
  log('ana', 'bench press', 45, 10, 8),
  log('jaco', 'Bench Press', 70, 9, 11),
  log('ana', 'Squat', 60, 5, 20),
  log('stranger', 'Bench Press', 200, 1, 9),
]

describe('buildRoomRecap', () => {
  const recap = buildRoomRecap(['jaco', 'ana'], logs)

  it('totals working sets and volume per member, skipping warm-ups and non-members', () => {
    expect(recap.totals).toEqual([
      { userId: 'jaco', sets: 2, volume: 70 * 8 + 70 * 9 },
      { userId: 'ana', sets: 2, volume: 45 * 10 + 60 * 5 },
    ])
  })

  it('groups exercises by name in first-worked order, with each best set', () => {
    expect(recap.exercises.map((e) => e.exercise)).toEqual(['Bench Press', 'Squat'])
    expect(recap.exercises[0]!.entries).toEqual([
      { userId: 'jaco', sets: 2, best: { weight: 70, reps: 9 } },
      { userId: 'ana', sets: 1, best: { weight: 45, reps: 10 } },
    ])
    expect(recap.exercises[1]!.entries[0]).toEqual({ userId: 'jaco', sets: 0, best: null })
  })
})

describe('buildRoomRecap with the routine', () => {
  const routine: PlannedExercise[] = [
    { name: 'Squat', kind: 'reps', sets: 3 },
    { name: 'Plank', kind: 'time', sets: 2 },
    { name: 'Bench Press', kind: 'reps', sets: 3 },
  ]

  it("follows the routine's order, then exercises added mid-workout as first worked", () => {
    const recap = buildRoomRecap(
      ['jaco', 'ana'],
      [log('ana', 'Curl', 10, 12, 1), log('jaco', 'bench press', 70, 8, 2), log('ana', 'Squat', 60, 5, 3)],
      routine,
    )
    expect(recap.exercises.map((e) => e.exercise)).toEqual(['Squat', 'Bench Press', 'Curl'])
    expect(recap.exercises.map((e) => e.kind)).toEqual(['reps', 'reps', 'reps'])
  })

  it('keeps timed sets out of volume and takes the longest hold as the best', () => {
    const recap = buildRoomRecap(
      ['jaco'],
      [log('jaco', 'Plank', 20, 45, 1), log('jaco', 'Plank', 0, 90, 2), log('jaco', 'Squat', 100, 5, 3)],
      routine,
    )
    expect(recap.totals).toEqual([{ userId: 'jaco', sets: 3, volume: 500 }])
    const plank = recap.exercises.find((e) => e.exercise === 'Plank')!
    expect(plank.kind).toBe('time')
    expect(plank.entries[0]!.best).toEqual({ weight: 0, reps: 90 })
  })
})

describe('memberProgress', () => {
  it('counts working sets and reports the latest exercise', () => {
    expect(memberProgress('ana', logs)).toEqual({ sets: 2, currentExercise: 'Squat' })
    expect(memberProgress('nobody', logs)).toEqual({ sets: 0, currentExercise: null })
  })
})
