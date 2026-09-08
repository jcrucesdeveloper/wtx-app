import { describe, it, expect } from 'vitest'
import { serializeTemplate, type RoutineDraft } from '../serializeRoutine'
import { parseTemplateText } from '../parseRoutine'
import { WorkoutParser } from '../wtx'

const repsOnly: RoutineDraft = {
  name: 'Push Day',
  unit: 'kg',
  notes: 'Chest and triceps.',
  tags: ['push', 'upper'],
  exercises: [
    {
      name: 'Bench Press',
      kind: 'reps',
      sets: 4,
      reps: 8,
      durationSeconds: 0,
      weight: 60,
      restSeconds: 90,
    },
    { name: 'Pull Up', kind: 'reps', sets: 3, reps: 8, durationSeconds: 0, weight: 0 },
  ],
}

const timeOnly: RoutineDraft = {
  name: 'Cardio',
  tags: [],
  exercises: [
    { name: 'Warm up', kind: 'time', sets: 1, reps: 0, durationSeconds: 90 },
    { name: 'Run', kind: 'time', sets: 1, reps: 0, durationSeconds: 920 },
  ],
}

const mixed: RoutineDraft = {
  name: 'Full Body',
  unit: 'lb',
  tags: [],
  exercises: [
    { name: 'Warm up', kind: 'time', sets: 1, reps: 0, durationSeconds: 60 },
    {
      name: 'Squat',
      kind: 'reps',
      sets: 5,
      reps: 5,
      durationSeconds: 0,
      weight: 185,
      restSeconds: 150,
      muscleGroup: 'legs',
    },
  ],
}

describe('serializeTemplate', () => {
  it.each([
    ['reps only', repsOnly],
    ['time only', timeOnly],
    ['mixed with metadata', mixed],
  ])('produces parseable .wtt for %s', (_label, draft) => {
    const result = parseTemplateText(serializeTemplate(draft))
    expect(result.ok).toBe(true)
  })

  it('keeps a zero weight (bodyweight) rather than dropping the field', () => {
    const text = serializeTemplate(repsOnly)
    const template = WorkoutParser.parseTemplate(text)
    expect(template.exercises[1]!.targetWeight).toBe(0)
  })

  it('round-trips name, unit, notes, tags and prescriptions', () => {
    const template = WorkoutParser.parseTemplate(serializeTemplate(repsOnly))
    expect(template.name).toBe('Push Day')
    expect(template.unit).toBe('kg')
    expect(template.notes).toBe('Chest and triceps.')
    expect(template.tags).toEqual(['push', 'upper'])
    expect(template.exercises[0]!.sets).toBe(4)
    expect(template.exercises[0]!.targetReps).toBe(8)
    expect(template.exercises[0]!.restSeconds).toBe(90)
  })

  it('is stable across a parse → serialize round-trip of example templates', () => {
    const samples = [
      `# Leg Day\nunit: kg\ndescription: Quads, hamstrings, and glutes.\n\nSquat | reps 4x6 | 80 | rest 2m30s\nCalf Raise | reps 4x15 | 40 | rest 45s\n`,
      `# Pull Day\nunit: kg\n\nDeadlift | reps 3x5 | 100 | rest 3m\nPull Up | reps 4x8 | 0 | rest 2m\n`,
    ]

    for (const original of samples) {
      const parsed = WorkoutParser.parseTemplate(original)
      const draft: RoutineDraft = {
        name: parsed.name,
        unit: parsed.unit,
        notes: parsed.notes,
        tags: parsed.tags,
        exercises: parsed.exercises.map((exercise) => ({
          name: exercise.name,
          kind: exercise.kind,
          sets: exercise.sets,
          reps: exercise.targetReps ?? 0,
          durationSeconds: exercise.durationSeconds ?? 0,
          weight: exercise.targetWeight,
          restSeconds: exercise.restSeconds,
          muscleGroup: exercise.muscleGroup,
        })),
      }

      const reparsed = WorkoutParser.parseTemplate(serializeTemplate(draft))
      expect(reparsed.name).toBe(parsed.name)
      expect(reparsed.exerciseCount).toBe(parsed.exerciseCount)
      expect(reparsed.exercises.map((e) => e.name)).toEqual(parsed.exercises.map((e) => e.name))
      expect(reparsed.exercises.map((e) => e.restSeconds)).toEqual(
        parsed.exercises.map((e) => e.restSeconds),
      )
    }
  })
})
