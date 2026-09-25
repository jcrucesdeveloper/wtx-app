import { describe, it, expect } from 'vitest'
import { clearedExercises, lastOneIn, teamProgress, type TeamMember } from '../teamProgress'
import type { MemberSetLog, PlannedExercise } from '../memberSession'

const routine: PlannedExercise[] = [
  { name: 'Bench Press', kind: 'reps', sets: 3, specificSets: [{ label: 'W' }] },
  { name: 'Squat', kind: 'reps', sets: 2 },
]
// Planned working sets per person: Bench 2 (one warm-up) + Squat 2 = 4.

let seq = 0
const log = (user_id: string, exercise_name: string, set_type: MemberSetLog['set_type'] = 'number'): MemberSetLog => ({
  id: `s${++seq}`,
  user_id,
  exercise_name,
  set_type,
  weight: 50,
  reps: 5,
  completed_at: new Date(Date.UTC(2026, 8, 25, 18, seq)).toISOString(),
})

const member = (userId: string, finishedAt: string | null = null): TeamMember => ({
  userId,
  displayName: userId.toUpperCase(),
  finishedAt,
})

describe('teamProgress', () => {
  it('adds everyone up against the plan, keeping each part in join order', () => {
    const logs = [log('ana', 'Bench Press'), log('ana', 'Bench Press'), log('ana', 'Squat'), log('tomi', 'Squat')]
    const progress = teamProgress(routine, [member('tomi'), member('ana')], logs)
    expect(progress).toMatchObject({ plannedPerMember: 4, total: 8, done: 4, finished: 0, members: 2, allFinished: false })
    expect(progress.segments).toEqual([
      { userId: 'tomi', done: 1 },
      { userId: 'ana', done: 3 },
    ])
  })

  it("ignores warm-ups, extra sets and exercises that aren't in the routine", () => {
    const logs = [
      log('ana', 'Bench Press', 'W'),
      log('ana', 'Bench Press'),
      log('ana', 'Bench Press'),
      log('ana', 'Bench Press'),
      log('ana', 'Cable Fly'),
    ]
    expect(teamProgress(routine, [member('ana')], logs).done).toBe(2)
  })

  it('is all finished only when every member has finished', () => {
    const done = new Date().toISOString()
    expect(teamProgress(routine, [member('ana', done), member('tomi')], []).allFinished).toBe(false)
    expect(teamProgress(routine, [member('ana', done), member('tomi', done)], []).allFinished).toBe(true)
  })
})

describe('clearedExercises', () => {
  it('clears an exercise only once every member has done its planned sets', () => {
    const logs = [log('ana', 'Squat'), log('ana', 'Squat'), log('tomi', 'Squat')]
    expect(clearedExercises(routine, ['ana', 'tomi'], logs)).toEqual([])
    expect(clearedExercises(routine, ['ana', 'tomi'], [...logs, log('tomi', 'squat')])).toEqual(['Squat'])
  })
})

describe('lastOneIn', () => {
  const allSets = (userId: string) => [
    log(userId, 'Bench Press'),
    log(userId, 'Bench Press'),
    log(userId, 'Squat'),
    log(userId, 'Squat'),
  ]

  it('names the one member still going once everyone else is done', () => {
    const logs = [...allSets('ana'), log('tomi', 'Bench Press')]
    expect(lastOneIn(routine, [member('ana'), member('tomi')], logs)).toEqual({ userId: 'tomi', name: 'TOMI', setsLeft: 3 })
  })

  it('counts tapping Finish as done, even with sets skipped', () => {
    const logs = [log('tomi', 'Bench Press')]
    const finished = member('ana', new Date().toISOString())
    expect(lastOneIn(routine, [finished, member('tomi')], logs)?.userId).toBe('tomi')
  })

  it('stays quiet while more than one person is still going, or when alone', () => {
    expect(lastOneIn(routine, [member('ana'), member('tomi')], [])).toBeNull()
    expect(lastOneIn(routine, [member('ana')], [])).toBeNull()
  })
})
