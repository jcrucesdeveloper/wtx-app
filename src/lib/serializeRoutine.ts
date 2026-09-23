import { formatCompactDuration } from '@/lib/format'
import type { WorkoutTemplate } from '@/lib/wtx'

/**
 * Rep-based only. One row per prescribed set, in order, mirroring the active
 * session's per-set rows. `'number'` shows the set's 1-based position;
 * `'W'`/`'D'` mark it as a warm-up/drop set instead.
 */
export interface RoutineDraftSet {
  type: 'number' | 'W' | 'D'
  /** Overridden weight for this set; `undefined` falls back to the exercise's weight. */
  weight?: number
}

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
  /** Optional primary muscle group. Not editable from the form; preserved on round-trip. */
  muscleGroup?: string
  /** Rep-based only. Per-set weight/label overrides; `undefined` entries use the defaults. */
  setRows?: RoutineDraftSet[]
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
export function emptyDraft(unit = 'kg'): RoutineDraft {
  return { name: '', unit, notes: '', tags: [], exercises: [emptyExercise()] }
}

/** A blank rep-based exercise row. */
export function emptyExercise(): RoutineDraftExercise {
  return { name: '', kind: 'reps', sets: 3, reps: 10, durationSeconds: 60 }
}

/**
 * Builds an editable {@link RoutineDraft} from a parsed template, so an existing
 * routine can be reopened in the "Create a routine" form for editing.
 */
export function draftFromTemplate(template: WorkoutTemplate): RoutineDraft {
  const exercises = template.exercises.map((exercise) => ({
    name: exercise.name,
    kind: exercise.kind,
    sets: exercise.kind === 'reps' ? exercise.sets : 3,
    reps: exercise.targetReps ?? 10,
    durationSeconds: exercise.durationSeconds ?? 60,
    weight: exercise.targetWeight,
    restSeconds: exercise.restSeconds,
    muscleGroup: exercise.muscleGroup ?? '',
    setRows:
      exercise.kind === 'reps' && exercise.specificSets?.length
        ? Array.from({ length: exercise.sets }, (_, i): RoutineDraftSet => {
            const entry = exercise.specificSets![i]
            if (!entry) return { type: 'number' }
            const type = entry.label === 'W' || entry.label === 'D' ? entry.label : 'number'
            return { type, weight: entry.weight }
          })
        : undefined,
  }))

  return {
    name: template.name,
    unit: template.unit ?? 'kg',
    notes: template.notes ?? '',
    tags: [...template.tags],
    exercises: exercises.length ? exercises : [emptyExercise()],
  }
}

function positiveInt(value: number, fallback: number): number {
  const n = Math.round(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** A set row is worth writing out only once it diverges from the plain default. */
function isCustomSetRow(row: RoutineDraftSet): boolean {
  return row.type !== 'number' || row.weight !== undefined
}

function serializeExercise(exercise: RoutineDraftExercise): string[] {
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

  const lines = [fields.join(' | ')]

  if (exercise.kind === 'reps' && exercise.setRows?.some(isCustomSetRow)) {
    const count = positiveInt(exercise.sets, 1)
    for (let i = 0; i < count; i++) {
      const row = exercise.setRows[i] ?? { type: 'number' as const }
      const label = row.type === 'number' ? String(i + 1) : row.type
      const weight = row.weight ?? exercise.weight ?? 0
      lines.push(`${label} | ${weight}`)
    }
  }

  return lines
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
  for (const exercise of draft.exercises) lines.push(...serializeExercise(exercise))

  return lines.join('\n') + '\n'
}
