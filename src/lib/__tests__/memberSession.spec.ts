import { describe, it, expect } from 'vitest'
import { buildMemberSession, type MemberSetLog, type PlannedExercise } from '../memberSession'

const routine: PlannedExercise[] = [
  { name: 'Bench Press', kind: 'reps', sets: 4, specificSets: [{ label: 'W' }, { label: '1' }] },
  { name: 'Squat', kind: 'reps', sets: 3 },
  { name: 'Plank', kind: 'time', sets: 2 },
]

let seq = 0
const log = (
  user_id: string,
  exercise_name: string,
  weight: number,
  reps: number,
  minute: number,
  set_type: MemberSetLog['set_type'] = 'number',
): MemberSetLog => ({
  id: `s${++seq}`,
  user_id,
  exercise_name,
  set_type,
  weight,
  reps,
  completed_at: new Date(Date.UTC(2026, 8, 25, 18, minute)).toISOString(),
})

const logs = [
  log('ana', 'Bench Press', 70, 8, 8),
  log('ana', 'bench press', 40, 10, 5, 'W'),
  log('ana', 'Bench Press', 72.5, 6, 11),
  log('ana', 'Bench Press', 60, 10, 13, 'D'),
  log('ana', 'Cable Fly', 15, 12, 20),
  log('tomi', 'Squat', 100, 5, 9),
]

describe('buildMemberSession', () => {
  const session = buildMemberSession(routine, 'ana', logs)

  it('lists routine exercises in order, then exercises added mid-workout', () => {
    expect(session.exercises.map((e) => e.name)).toEqual(['Bench Press', 'Squat', 'Plank', 'Cable Fly'])
    expect(session.exercises[3]!.planned).toBeNull()
  })

  it('plans working sets without warm-ups', () => {
    expect(session.exercises.map((e) => e.planned)).toEqual([3, 3, 2, null])
    expect(session.planned).toBe(8)
  })

  it('labels sets in the order they were done, numbering only working sets', () => {
    expect(session.exercises[0]!.sets.map((s) => [s.label, s.weight, s.reps])).toEqual([
      ['W', 40, 10],
      ['1', 70, 8],
      ['2', 72.5, 6],
      ['D', 60, 10],
    ])
  })

  it('counts done sets like the active session (drop sets count, warm-ups do not)', () => {
    expect(session.exercises[0]!.done).toBe(3)
    expect(session.done).toBe(4)
  })

  it('marks the exercise of their latest set as current', () => {
    expect(session.currentExercise).toBe('Cable Fly')
    expect(session.exercises.filter((e) => e.current).map((e) => e.name)).toEqual(['Cable Fly'])
  })

  it('ignores other members and handles someone who has not started', () => {
    const empty = buildMemberSession(routine, 'nobody', logs)
    expect(empty.done).toBe(0)
    expect(empty.currentExercise).toBeNull()
    expect(empty.exercises.every((e) => e.sets.length === 0)).toBe(true)
  })
})
