import { describe, it, expect } from 'vitest'
import { buildRoomRecap, memberProgress, type RecapSetLog } from '../roomRecap'

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

describe('memberProgress', () => {
  it('counts working sets and reports the latest exercise', () => {
    expect(memberProgress('ana', logs)).toEqual({ sets: 2, currentExercise: 'Squat' })
    expect(memberProgress('nobody', logs)).toEqual({ sets: 0, currentExercise: null })
  })
})
