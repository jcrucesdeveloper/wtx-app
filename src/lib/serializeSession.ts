import type { WorkoutSession, WorkoutTemplate } from '@/lib/wtx'
import { withTimeMarker } from '@/lib/sessionTime'

/** One set row in an {@link ActiveSession} draft, as logged live. */
export interface SessionSetDraft {
  /** Stable row id for `:key`/removal — the `.wts` label is derived, not stored. */
  id: string
  isWarmup: boolean
  /** `null` = not yet entered. */
  weight: number | null
  /** Reps, or seconds held for a `kind: 'time'` exercise. `null` = not yet entered. */
  reps: number | null
  completed: boolean
  /** "Last time" placeholder — display only, never serialized. */
  ghostWeight?: number
  ghostReps?: number
}

/** One exercise being logged in an {@link ActiveSession} draft. */
export interface SessionExerciseDraft {
  name: string
  /** From the source template's exercise kind; not user-editable in v1. */
  kind: 'reps' | 'time'
  /** Planned header set count. */
  sets: number
  /** Planned reps, or planned duration in seconds if `kind === 'time'`. */
  reps: number
  /** Planned/target weight. */
  weight: number
  /** Drives the rest timer; not part of the `.wts` grammar, never serialized. */
  restSeconds?: number
  note: string
  loggedSets: SessionSetDraft[]
}

/** The editable shape behind an in-progress workout session. */
export interface SessionDraft {
  name: string
  /** `YYYY-MM-DD`, local time. */
  date: string
  /** `template:` metadata line — the `.wtt` file this session follows. */
  templateFilename?: string
  unit?: string
  notes?: string
  exercises: SessionExerciseDraft[]
}

export function newSetId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  }
}

/** `YYYY-MM-DD` in local time (not `toISOString()`, which is UTC). */
function todayLocal(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** The last logged working set for an exercise, matched by name (trimmed, case-insensitive). */
function findLastExercise(lastSession: WorkoutSession | undefined, name: string) {
  if (!lastSession) return undefined
  const target = name.trim().toLowerCase()
  return lastSession.exercises.find((e) => e.name.trim().toLowerCase() === target)
}

/**
 * Builds a fresh {@link SessionDraft} from a routine's parsed template, one
 * empty working-set row per planned set, ghosted with values from the most
 * recent matching session (if any) as a "last time" placeholder.
 */
export function draftFromTemplate(
  template: WorkoutTemplate,
  templateFilename: string,
  lastSession?: WorkoutSession,
): SessionDraft {
  const exercises: SessionExerciseDraft[] = template.exercises.map((exercise) => {
    const last = findLastExercise(lastSession, exercise.name)
    const lastWorking = last?.workingSets ?? []

    const templateWeight = exercise.targetWeight ?? undefined
    const templateReps = exercise.kind === 'time' ? exercise.durationSeconds : exercise.targetReps

    const loggedSets: SessionSetDraft[] = Array.from({ length: exercise.sets }, (_, i) => {
      const ghost = lastWorking[i] ?? lastWorking[lastWorking.length - 1]
      return {
        id: newSetId(),
        isWarmup: false,
        weight: null,
        reps: null,
        completed: false,
        ghostWeight: ghost?.weight ?? templateWeight,
        ghostReps: ghost?.reps ?? templateReps,
      }
    })

    return {
      name: exercise.name,
      kind: exercise.kind,
      sets: exercise.sets,
      reps: exercise.kind === 'time' ? (exercise.durationSeconds ?? 0) : (exercise.targetReps ?? 0),
      weight: exercise.targetWeight ?? 0,
      restSeconds: exercise.restSeconds,
      note: '',
      loggedSets,
    }
  })

  return {
    name: template.name,
    date: todayLocal(),
    templateFilename,
    unit: template.unit,
    notes: '',
    exercises,
  }
}

/**
 * Serializes an in-progress or finished {@link SessionDraft} to `.wts` text.
 *
 * Only completed sets are written. An exercise with zero completed sets still
 * gets its header line, so a skipped exercise shows up as incomplete rather
 * than vanishing.
 */
export function serializeSession(draft: SessionDraft): string {
  const lines: string[] = [`# ${draft.name.trim() || 'Session'} - ${draft.date}`]

  if (draft.templateFilename) lines.push(`template: ${draft.templateFilename}`)
  if (draft.unit?.trim()) lines.push(`unit: ${draft.unit.trim()}`)
  if (draft.notes?.trim()) lines.push(`notes: ${draft.notes.trim().replace(/\s*\n\s*/g, ' ')}`)

  lines.push('')

  for (const exercise of draft.exercises) {
    const name = exercise.name.trim().replace(/\|/g, '/') || 'Exercise'
    const weight = Number.isFinite(exercise.weight) ? exercise.weight : 0
    const note = exercise.kind === 'time' ? withTimeMarker(exercise.note) : exercise.note.trim()

    const header = [name, `${exercise.sets}x${exercise.reps}`, String(weight)]
    if (note) header.push(note)
    lines.push(header.join(' | '))

    let workingIndex = 0
    for (const set of exercise.loggedSets) {
      if (!set.completed || set.weight === null || set.reps === null) continue
      const label = set.isWarmup ? 'W' : String(++workingIndex)
      const setWeight = Number.isFinite(set.weight) ? set.weight : 0
      lines.push(`${label} | ${setWeight} | ${set.reps}`)
    }
  }

  return lines.join('\n') + '\n'
}
