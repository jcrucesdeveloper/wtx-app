import { describe, it, expect } from 'vitest'
import { buildRoomSummary, groupCelebrationTier } from '../roomSummary'
import type { MemberSetLog, PlannedExercise } from '../memberSession'
import type { TeamMember } from '../teamProgress'

const routine: PlannedExercise[] = [
  { name: 'Squat', kind: 'reps', sets: 2 },
  { name: 'Plank', kind: 'time', sets: 1 },
]
// Planned working sets per person: 3.

const at = (minute: number) => new Date(Date.UTC(2026, 9, 16, 18, minute)).toISOString()
let seq = 0
const log = (user_id: string, exercise_name: string, weight: number, reps: number, minute: number): MemberSetLog => ({
  id: `s${++seq}`,
  user_id,
  exercise_name,
  set_type: 'number',
  weight,
  reps,
  completed_at: at(minute),
})
const member = (userId: string, finishedMinute: number | null = null): TeamMember => ({
  userId,
  displayName: userId.toUpperCase(),
  finishedAt: finishedMinute === null ? null : at(finishedMinute),
})

const allDone = [
  log('ana', 'Squat', 60, 5, 5),
  log('jaco', 'Squat', 100, 5, 6),
  log('ana', 'Squat', 62.5, 5, 9),
  log('jaco', 'Squat', 100, 6, 12),
  log('jaco', 'Plank', 0, 60, 15),
  log('ana', 'Plank', 10, 45, 18),
]

describe('buildRoomSummary', () => {
  it('adds the team up against the plan and keeps everyone in join order', () => {
    const summary = buildRoomSummary({
      routine,
      members: [member('jaco', 20), member('ana', 22)],
      logs: allDone,
      startedAt: at(0),
    })
    expect(summary.team).toEqual({
      done: 6,
      total: 6,
      sets: 6,
      volume: 100 * 5 + 100 * 6 + 60 * 5 + 62.5 * 5,
      finished: 2,
      members: 2,
      allFinished: true,
    })
    expect(summary.members.map((m) => m.userId)).toEqual(['jaco', 'ana'])
    expect(summary.members[0]).toMatchObject({ done: 3, planned: 3, seconds: 20 * 60 })
    expect(summary.seconds).toBe(22 * 60)
  })

  it("gives each member their own heaviest set, never one measured against the others", () => {
    const summary = buildRoomSummary({ routine, members: [member('jaco'), member('ana')], logs: allDone, startedAt: at(0) })
    expect(summary.members[0]!.highlight).toEqual({
      kind: 'top-set',
      exercise: 'Squat',
      set: { weight: 100, reps: 6 },
      timed: false,
    })
    expect(summary.members[1]!.highlight).toMatchObject({ exercise: 'Squat', set: { weight: 62.5, reps: 5 } })
  })

  it('falls back to the longest hold, and to nothing for a member with no sets', () => {
    const summary = buildRoomSummary({
      routine,
      members: [member('jaco'), member('tomi')],
      logs: [log('jaco', 'Plank', 0, 50, 1), log('jaco', 'Plank', 0, 70, 2)],
      startedAt: at(0),
    })
    expect(summary.members[0]!.highlight).toEqual({
      kind: 'top-set',
      exercise: 'Plank',
      set: { weight: 0, reps: 70 },
      timed: true,
    })
    expect(summary.members[1]!.highlight).toEqual({ kind: 'none' })
  })

  it('lists cleared exercises and finishes in the order they happened', () => {
    const summary = buildRoomSummary({
      routine,
      members: [member('jaco', 20), member('ana', 22)],
      logs: allDone,
      startedAt: at(0),
    })
    expect(summary.moments).toEqual([
      { kind: 'cleared', exercise: 'Squat', at: at(12) },
      { kind: 'cleared', exercise: 'Plank', at: at(18) },
      { kind: 'finished', userId: 'jaco', at: at(20) },
      { kind: 'finished', userId: 'ana', at: at(22) },
    ])
  })

  it('has no team time while someone is still going', () => {
    const summary = buildRoomSummary({
      routine,
      members: [member('jaco', 20), member('ana')],
      logs: allDone.slice(0, 5),
      startedAt: at(0),
    })
    expect(summary.seconds).toBeNull()
    expect(summary.members[1]).toMatchObject({ seconds: null, currentExercise: 'Squat', done: 2 })
    expect(summary.moments.map((m) => m.kind)).toEqual(['cleared', 'finished'])
  })
})

describe('groupCelebrationTier', () => {
  const summaryFor = (members: TeamMember[], logs: MemberSetLog[]) =>
    buildRoomSummary({ routine, members, logs, startedAt: at(0) })

  it('stays calm until everyone has finished the whole plan', () => {
    expect(groupCelebrationTier(summaryFor([member('jaco', 20), member('ana')], allDone))).toBe('routine')
    expect(groupCelebrationTier(summaryFor([member('jaco', 20), member('ana', 22)], allDone.slice(0, 5)))).toBe('routine')
  })

  it('is a win for a complete plan, and an event for three or more', () => {
    expect(groupCelebrationTier(summaryFor([member('jaco', 20), member('ana', 22)], allDone))).toBe('win')
    const tomi = [log('tomi', 'Squat', 80, 5, 7), log('tomi', 'Squat', 80, 5, 10), log('tomi', 'Plank', 0, 30, 16)]
    expect(
      groupCelebrationTier(summaryFor([member('jaco', 20), member('ana', 22), member('tomi', 21)], [...allDone, ...tomi])),
    ).toBe('event')
  })
})
