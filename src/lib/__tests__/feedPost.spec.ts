import { describe, it, expect } from 'vitest'
import { summarizeWorkout } from '../feedPost'
import { routineDraftFromWorkout } from '../sessionToRoutine'
import { serializeTemplate } from '../serializeRoutine'
import { serializeSession, type SessionDraft } from '../serializeSession'
import { parseSessionText } from '../parseSession'
import { parseTemplateText } from '../parseRoutine'
import type { WorkoutSession } from '../wtx'

type Exercise = SessionDraft['exercises'][number]

function exercise(name: string, sets: [number, number][], opts: Partial<Exercise> = {}): Exercise {
  return {
    name,
    kind: 'reps',
    sets: sets.length,
    reps: sets[0]?.[1] ?? 8,
    weight: sets[0]?.[0] ?? 0,
    note: '',
    loggedSets: sets.map(([weight, reps], i) => ({ id: String(i), type: 'number', weight, reps, completed: true })),
    ...opts,
  }
}

function session(exercises: Exercise[]): WorkoutSession {
  const draft: SessionDraft = { name: 'Push Day', date: '2026-09-25', unit: 'kg', exercises }
  const result = parseSessionText(serializeSession(draft))
  if (!result.ok) throw new Error(result.error)
  return result.session
}

describe('summarizeWorkout', () => {
  it('totals the working sets, reps and volume', () => {
    const summary = summarizeWorkout(
      session([
        exercise('Bench Press', [
          [80, 5],
          [85, 3],
        ]),
        exercise('Push Up', [[0, 20]]),
      ]),
    )
    expect(summary.exerciseCount).toBe(2)
    expect(summary.workingSets).toBe(3)
    expect(summary.totalReps).toBe(28)
    expect(summary.volume).toBe(80 * 5 + 85 * 3)
  })

  it('highlights each exercise by its heaviest set', () => {
    const [bench] = summarizeWorkout(
      session([
        exercise('Bench Press', [
          [80, 5],
          [85, 3],
          [70, 8],
        ]),
      ]),
    ).highlights
    expect(bench).toEqual({ name: 'Bench Press', weight: 85, reps: 3, isTime: false, workingSets: 3 })
  })

  it('caps the highlights and counts the rest', () => {
    const summary = summarizeWorkout(
      session(['Squat', 'Lunge', 'Row', 'Curl', 'Dips'].map((name) => exercise(name, [[10, 10]]))),
      3,
    )
    expect(summary.highlights.map((h) => h.name)).toEqual(['Squat', 'Lunge', 'Row'])
    expect(summary.moreCount).toBe(2)
  })

  it('skips exercises with nothing logged', () => {
    const summary = summarizeWorkout(
      session([exercise('Bench Press', [[80, 5]]), exercise('Dips', [], { sets: 3, reps: 10 })]),
    )
    expect(summary.exerciseCount).toBe(1)
    expect(summary.highlights.map((h) => h.name)).toEqual(['Bench Press'])
    expect(summary.moreCount).toBe(0)
  })

  it('flags timed exercises so the card shows seconds', () => {
    const [plank] = summarizeWorkout(session([exercise('Plank', [[0, 45]], { kind: 'time' })])).highlights
    expect(plank?.isTime).toBe(true)
    expect(plank?.reps).toBe(45)
  })

  it("doesn't count seconds held as reps", () => {
    const summary = summarizeWorkout(
      session([exercise('Plank', [[0, 60]], { kind: 'time' }), exercise('Push Up', [[0, 20]])]),
    )
    expect(summary.totalReps).toBe(20)
  })
})

describe('routineDraftFromWorkout', () => {
  it('turns a logged workout into a routine that parses', () => {
    const workout = session([
      exercise('Bench Press', [
        [80, 5],
        [85, 5],
        [80, 5],
      ]),
      exercise('Plank', [[0, 60]], { kind: 'time' }),
    ])
    const draft = routineDraftFromWorkout(workout, 'Push Day (Ana)')

    expect(draft.name).toBe('Push Day (Ana)')
    expect(draft.exercises[0]).toMatchObject({ name: 'Bench Press', kind: 'reps', sets: 3, reps: 5, weight: 85 })
    expect(draft.exercises[1]).toMatchObject({ name: 'Plank', kind: 'time', durationSeconds: 60 })

    const parsed = parseTemplateText(serializeTemplate(draft))
    expect(parsed.ok && parsed.template.exercises.map((e) => e.name)).toEqual(['Bench Press', 'Plank'])
  })

  it('defaults to the workout name', () => {
    expect(routineDraftFromWorkout(session([exercise('Squat', [[100, 5]])])).name).toBe('Push Day')
  })
})
