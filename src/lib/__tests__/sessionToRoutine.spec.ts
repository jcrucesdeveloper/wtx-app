import { describe, it, expect } from 'vitest'
import { routineDraftFromSession, sessionDiffersFromRoutine } from '../sessionToRoutine'
import { WorkoutParser } from '../wtx'
import type { SessionDraft, SessionExerciseDraft, SessionSetDraft } from '../serializeSession'

const templateText = `# Push Day
unit: kg

Bench Press | reps 4x8 | 60 | rest 90s
Overhead Press | reps 3x10 | 20 | muscle shoulders
`

const template = WorkoutParser.parseTemplate(templateText)

function set(overrides: Partial<SessionSetDraft> = {}): SessionSetDraft {
  return { id: 'set', type: 'number', weight: null, reps: null, completed: false, ...overrides }
}

function exercise(overrides: Partial<SessionExerciseDraft> = {}): SessionExerciseDraft {
  return {
    name: 'Bench Press',
    kind: 'reps',
    sets: 4,
    reps: 8,
    weight: 60,
    note: '',
    loggedSets: [set()],
    ...overrides,
  }
}

function draft(exercises: SessionExerciseDraft[]): SessionDraft {
  return { name: 'Push Day', date: '2026-01-01', unit: 'kg', exercises }
}

describe('sessionDiffersFromRoutine', () => {
  it('is false when the session matches the routine exactly', () => {
    const d = draft([exercise({ name: 'Bench Press' }), exercise({ name: 'Overhead Press' })])
    expect(sessionDiffersFromRoutine(d, template)).toBe(false)
  })

  it('is false when only the order changed', () => {
    const d = draft([exercise({ name: 'Overhead Press' }), exercise({ name: 'Bench Press' })])
    expect(sessionDiffersFromRoutine(d, template)).toBe(false)
  })

  it('is true when an exercise was added', () => {
    const d = draft([
      exercise({ name: 'Bench Press' }),
      exercise({ name: 'Overhead Press' }),
      exercise({ name: 'Incline Dumbbell Press' }),
    ])
    expect(sessionDiffersFromRoutine(d, template)).toBe(true)
  })

  it('is true when an exercise was removed', () => {
    const d = draft([exercise({ name: 'Bench Press' })])
    expect(sessionDiffersFromRoutine(d, template)).toBe(true)
  })

  it('is true when an exercise was renamed', () => {
    const d = draft([exercise({ name: 'Bench Press' }), exercise({ name: 'Dumbbell Press' })])
    expect(sessionDiffersFromRoutine(d, template)).toBe(true)
  })
})

describe('routineDraftFromSession', () => {
  it('keeps the original prescription for retained exercises', () => {
    const d = draft([exercise({ name: 'Bench Press', sets: 4, reps: 12, weight: 999 })])
    const result = routineDraftFromSession(d, template)
    const bench = result.exercises.find((e) => e.name === 'Bench Press')
    expect(bench).toMatchObject({ sets: 4, reps: 8, weight: 60, restSeconds: 90 })
  })

  it('builds a fresh entry for an exercise added mid-session', () => {
    const d = draft([
      exercise({ name: 'Bench Press' }),
      exercise({ name: 'Overhead Press' }),
      exercise({ name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 15 }),
    ])
    const result = routineDraftFromSession(d, template)
    const added = result.exercises.find((e) => e.name === 'Incline Dumbbell Press')
    expect(added).toMatchObject({ sets: 3, reps: 10, weight: 15 })
  })

  it('follows the session order, including a dropped exercise', () => {
    const d = draft([exercise({ name: 'Overhead Press' })])
    const result = routineDraftFromSession(d, template)
    expect(result.exercises.map((e) => e.name)).toEqual(['Overhead Press'])
  })

  it('overrides the routine name when given one', () => {
    const d = draft([exercise({ name: 'Bench Press' })])
    const result = routineDraftFromSession(d, template, 'Push Day (edited)')
    expect(result.name).toBe('Push Day (edited)')
  })
})
