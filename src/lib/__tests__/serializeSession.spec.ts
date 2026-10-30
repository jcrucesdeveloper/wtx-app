import { describe, it, expect } from 'vitest'
import { draftFromTemplate, serializeSession, type SessionDraft } from '../serializeSession'
import { parseSessionText } from '../parseSession'
import { isTimeExercise, displayNote } from '../sessionTime'
import { WorkoutParser } from '../wtx'

function draft(overrides: Partial<SessionDraft> = {}): SessionDraft {
  return {
    name: 'Push Day',
    date: '2026-09-18',
    templateFilename: 'push-day.wtt',
    unit: 'kg',
    notes: 'Felt strong today.',
    exercises: [],
    ...overrides,
  }
}

describe('serializeSession', () => {
  it('produces parseable .wts for a session with completed sets', () => {
    const d = draft({
      exercises: [
        {
          name: 'Bench Press',
          kind: 'reps',
          sets: 3,
          reps: 6,
          weight: 80,
          note: '',
          loggedSets: [
            { id: '1', type: 'W', weight: 40, reps: 10, completed: true },
            { id: '2', type: 'number', weight: 80, reps: 6, completed: true },
            { id: '3', type: 'number', weight: 82.5, reps: 5, completed: true },
          ],
        },
      ],
    })

    const result = parseSessionText(serializeSession(d))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.session.name).toBe('Push Day')
    expect(result.session.date).toBe('2026-09-18')
    expect(result.session.template).toBe('push-day.wtt')
    expect(result.session.exercises[0]!.loggedSets).toEqual([
      { label: 'W', weight: 40, reps: 10 },
      { label: '1', weight: 80, reps: 6 },
      { label: '2', weight: 82.5, reps: 5 },
    ])
  })

  it('labels a drop set "D" and excludes it from working-set numbering', () => {
    const d = draft({
      exercises: [
        {
          name: 'Lat Pulldown',
          kind: 'reps',
          sets: 3,
          reps: 10,
          weight: 50,
          note: '',
          loggedSets: [
            { id: '1', type: 'number', weight: 50, reps: 10, completed: true },
            { id: '2', type: 'number', weight: 50, reps: 9, completed: true },
            { id: '3', type: 'D', weight: 35, reps: 12, completed: true },
          ],
        },
      ],
    })

    const result = parseSessionText(serializeSession(d))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.session.exercises[0]!.loggedSets).toEqual([
      { label: '1', weight: 50, reps: 10 },
      { label: '2', weight: 50, reps: 9 },
      { label: 'D', weight: 35, reps: 12 },
    ])
  })

  it('only writes completed sets, skipping empty or in-progress rows', () => {
    const d = draft({
      exercises: [
        {
          name: 'Squat',
          kind: 'reps',
          sets: 3,
          reps: 5,
          weight: 100,
          note: '',
          loggedSets: [
            { id: '1', type: 'number', weight: 100, reps: 5, completed: true },
            { id: '2', type: 'number', weight: null, reps: null, completed: false },
            { id: '3', type: 'number', weight: 100, reps: 4, completed: false },
          ],
        },
      ],
    })

    const result = parseSessionText(serializeSession(d))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.session.exercises[0]!.loggedSets).toHaveLength(1)
  })

  it('still emits the exercise header line when no sets were completed', () => {
    const d = draft({
      exercises: [
        {
          name: 'Skipped Exercise',
          kind: 'reps',
          sets: 3,
          reps: 10,
          weight: 20,
          note: '',
          loggedSets: [],
        },
      ],
    })

    const result = parseSessionText(serializeSession(d))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.session.exercises).toHaveLength(1)
    expect(result.session.exercises[0]!.isComplete).toBe(false)
  })

  it('round-trips a time-based exercise via the reps-as-seconds convention', () => {
    const d = draft({
      exercises: [
        {
          name: 'Plank',
          kind: 'time',
          sets: 3,
          reps: 30,
          weight: 0,
          note: 'keep hips level',
          loggedSets: [
            { id: '1', type: 'number', weight: 0, reps: 32, completed: true },
            { id: '2', type: 'number', weight: 0, reps: 28, completed: true },
          ],
        },
      ],
    })

    const result = parseSessionText(serializeSession(d))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const exercise = result.session.exercises[0]!
    expect(isTimeExercise(exercise.note)).toBe(true)
    expect(displayNote(exercise.note)).toBe('keep hips level')
    expect(exercise.loggedSets.map((s) => s.reps)).toEqual([32, 28])
  })

  it('does not mistake a reps-based exercise for a time-based one', () => {
    const d = draft({
      exercises: [
        {
          name: 'Row',
          kind: 'reps',
          sets: 3,
          reps: 10,
          weight: 40,
          note: 'controlled tempo',
          loggedSets: [],
        },
      ],
    })

    const result = parseSessionText(serializeSession(d))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(isTimeExercise(result.session.exercises[0]!.note)).toBe(false)
    expect(displayNote(result.session.exercises[0]!.note)).toBe('controlled tempo')
  })
})

describe('draftFromTemplate', () => {
  it('loads each set\'s type from the template\'s per-set overrides', () => {
    const template = WorkoutParser.parseTemplate(`# Push Day
unit: kg

Bench Press | reps 4x8 | 60 | rest 1m30s
W | 40 | 10
D | 45 | 6
`)

    const draft = draftFromTemplate(template, 'push-day.wtt')
    const types = draft.exercises[0]!.loggedSets.map((s) => s.type)
    expect(types).toEqual(['W', 'D', 'number', 'number'])
  })

  it('ghosts warm-up and working sets from the matching slot of the last session', () => {
    const template = WorkoutParser.parseTemplate(`# Push Day
unit: kg

Bench Press | reps 2x8 | 60
W | 40 | 10
`)

    const lastSession = WorkoutParser.parseSession(`# Push Day - 2026-09-01
unit: kg

Bench Press | 2x8 | 60
W | 35 | 12
1 | 82.5 | 8
2 | 82.5 | 6
`)

    const draft = draftFromTemplate(template, 'push-day.wtt', lastSession)
    const sets = draft.exercises[0]!.loggedSets
    expect(sets.map((s) => ({ type: s.type, ghostWeight: s.ghostWeight, ghostReps: s.ghostReps }))).toEqual([
      { type: 'W', ghostWeight: 35, ghostReps: 12 },
      { type: 'number', ghostWeight: 82.5, ghostReps: 8 },
    ])
  })
  it('matches a repeated exercise to the same occurrence in the last session', () => {
    const template = WorkoutParser.parseTemplate(`# Push Day
unit: kg

Bench Press | reps 1x8 | 60
Fly | reps 1x12 | 10
Bench Press | reps 1x8 | 60
`)
    const lastSession = WorkoutParser.parseSession(`# Push Day - 2026-09-01
unit: kg

Bench Press | 1x8 | 80
1 | 80 | 8
Fly | 1x12 | 12
1 | 12 | 12
Bench Press | 1x8 | 70
1 | 70 | 10
`)

    const draft = draftFromTemplate(template, 'push-day.wtt', lastSession)
    const ghosts = draft.exercises.map((e) => [e.loggedSets[0]!.ghostWeight, e.loggedSets[0]!.ghostReps])
    expect(ghosts).toEqual([
      [80, 8],
      [12, 12],
      [70, 10],
    ])
  })

  it('falls back to the last time anywhere for an exercise missing from, or skipped in, the last session', () => {
    const template = WorkoutParser.parseTemplate(`# Push Day
unit: kg

Bench Press | reps 1x8 | 60
Dips | reps 1x10 | 0
Fly | reps 1x12 | 10
`)
    const lastSession = WorkoutParser.parseSession(`# Push Day - 2026-09-01
unit: kg

Bench Press | 1x8 | 80
1 | 80 | 8
Fly | 1x12 | 10
`)
    const elsewhere = WorkoutParser.parseSession(`# Chest - 2026-09-03
unit: kg

Dips | 1x10 | 10
1 | 10 | 9
Fly | 1x12 | 14
1 | 14 | 11
Bench Press | 1x8 | 90
1 | 90 | 3
`)
    const lastLogged = (name: string) => elsewhere.exercises.find((e) => e.name === name)

    const draft = draftFromTemplate(template, 'push-day.wtt', lastSession, lastLogged)
    const sets = draft.exercises.map((e) => e.loggedSets[0]!)
    expect(sets.map((s) => [s.ghostWeight, s.ghostReps, s.ghostFromLast])).toEqual([
      [80, 8, true], // the routine's own last session wins over a newer one elsewhere
      [10, 9, true], // not in the last session
      [14, 11, true], // in it, but skipped
    ])
  })

  it("falls back to the routine's plan when the exercise was never logged", () => {
    const template = WorkoutParser.parseTemplate(`# Push Day
unit: kg

Dips | reps 1x10 | 5
`)
    const draft = draftFromTemplate(template, 'push-day.wtt', undefined, () => undefined)
    const set = draft.exercises[0]!.loggedSets[0]!
    expect([set.ghostWeight, set.ghostReps, set.ghostFromLast]).toEqual([5, 10, false])
  })
})
