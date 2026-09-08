import { formatCompactDuration } from '@/lib/format'

/** One exercise row in a {@link RoutineDraft}, as edited in the create form. */
export interface RoutineDraftExercise {
  name: string
  kind: 'reps' | 'time'
  /** Rep-based only. */
  sets: number
  /** Rep-based only. */
  reps: number
  /** Time-based only, in seconds. */
  durationSeconds: number
  /** Optional working weight, in the draft's unit. `0` is kept (bodyweight). */
  weight?: number
  /** Optional rest after each set, in seconds. */
  restSeconds?: number
  /** Optional primary muscle group. */
  muscleGroup?: string
}

/** The editable shape behind the "Create a routine" form. */
export interface RoutineDraft {
  name: string
  unit?: string
  notes?: string
  tags: string[]
  exercises: RoutineDraftExercise[]
}

/** A blank draft with one empty rep-based exercise. */
export function emptyDraft(): RoutineDraft {
  return { name: '', unit: 'kg', notes: '', tags: [], exercises: [emptyExercise()] }
}

/** A blank rep-based exercise row. */
export function emptyExercise(): RoutineDraftExercise {
  return { name: '', kind: 'reps', sets: 3, reps: 10, durationSeconds: 60 }
}

function positiveInt(value: number, fallback: number): number {
  const n = Math.round(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function serializeExercise(exercise: RoutineDraftExercise): string {
  const fields: string[] = [exercise.name.trim().replace(/\|/g, '/') || 'Exercise']

  if (exercise.kind === 'time') {
    fields.push(`time ${formatCompactDuration(exercise.durationSeconds) || '0s'}`)
  } else {
    fields.push(`reps ${positiveInt(exercise.sets, 1)}x${positiveInt(exercise.reps, 1)}`)
  }

  if (exercise.weight !== undefined && Number.isFinite(exercise.weight)) {
    fields.push(String(exercise.weight))
  }
  if (exercise.restSeconds) {
    fields.push(`rest ${formatCompactDuration(exercise.restSeconds)}`)
  }
  if (exercise.muscleGroup?.trim()) {
    fields.push(`muscle ${exercise.muscleGroup.trim()}`)
  }

  return fields.join(' | ')
}

/**
 * Serializes a {@link RoutineDraft} to `.wtt` template text.
 *
 * The output is always parseable by `WorkoutParser.parseTemplate` for any draft
 * with a non-empty name and at least one exercise.
 */
export function serializeTemplate(draft: RoutineDraft): string {
  const lines: string[] = [`# ${draft.name.trim() || 'Routine'}`]

  if (draft.unit?.trim()) lines.push(`unit: ${draft.unit.trim()}`)
  if (draft.notes?.trim())
    lines.push(`description: ${draft.notes.trim().replace(/\s*\n\s*/g, ' ')}`)

  const tags = draft.tags.map((tag) => tag.trim()).filter(Boolean)
  if (tags.length) lines.push(`tags: ${tags.join(', ')}`)

  lines.push('')
  for (const exercise of draft.exercises) lines.push(serializeExercise(exercise))

  return lines.join('\n') + '\n'
}
