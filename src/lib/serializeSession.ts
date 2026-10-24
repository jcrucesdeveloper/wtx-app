import type { WorkoutSession, WorkoutTemplate } from '@/lib/wtx'
import { isTimeExercise, withTimeMarker } from '@/lib/sessionTime'
import { newUuid } from '@/lib/uuid'

/**
 * A set's type, driving both its `.wts` label and how it's numbered:
 * `'number'` sets get sequential 1-based labels, `'W'`/`'D'` (warm-up/drop
 * set) are shown as-is and don't consume a number.
 */
export type SessionSetType = 'number' | 'W' | 'D'

/** One set row in an {@link ActiveSession} draft, as logged live. */
export interface SessionSetDraft {
  /** Stable row id for `:key`/removal — the `.wts` label is derived, not stored. */
  id: string
  type: SessionSetType
  /** `null` = not yet entered. */
  weight: number | null
  /** Reps, or seconds held for a `kind: 'time'` exercise. `null` = not yet entered. */
  reps: number | null
  completed: boolean
  /** "Last time" placeholder — display only, never serialized. */
  ghostWeight?: number
  ghostReps?: number
  /** The placeholder comes from the last session, not from the routine's plan. Display only. */
  ghostFromLast?: boolean
}

/** One exercise being logged in an {@link ActiveSession} draft. */
export interface SessionExerciseDraft {
  name: string
  /** From the source template's exercise kind; switchable mid-session (`setExerciseKind`). */
  kind: 'reps' | 'time'
  /** Planned header set count. */
  sets: number
  /** Planned reps, or planned duration in seconds if `kind === 'time'`. */
  reps: number
  /** Planned/target weight. */
  weight: number
  /** Drives the rest timer; not part of the `.wts` grammar, never serialized. */
  restSeconds?: number
  /**
   * In a group workout, this exercise's position in the room's routine — how
   * the host's order finds it (see `roomOrder`). Kept through a swap; unset
   * for exercises added mid-workout. Never serialized.
   */
  slot?: number
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
  return newUuid()
}

/**
 * A timed exercise is logged once — how long the plank or the treadmill
 * lasted — so it holds exactly one entry, a plain working set (a warm-up or
 * drop set means nothing for a duration). Brings any other shape down to
 * that one: the longest logged entry if any is logged, else the first; an
 * empty list gets a blank entry. Sets already in that shape come back as-is.
 */
export function singleTimedEntry(sets: SessionSetDraft[]): SessionSetDraft[] {
  if (sets.length === 1 && sets[0]!.type === 'number') return sets
  const logged = sets.filter((s) => s.completed)
  const keep = logged.length
    ? logged.reduce((best, s) => ((s.reps ?? 0) > (best.reps ?? 0) ? s : best))
    : sets[0]
  if (!keep) return [{ id: newSetId(), type: 'number', weight: null, reps: null, completed: false }]
  return [{ ...keep, type: 'number' }]
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
    const found = findLastExercise(lastSession, exercise.name)
    // Last time it was switched to the other kind: 8 reps are not 8 seconds, so no prefill.
    const last =
      found && isTimeExercise(found.note) === (exercise.kind === 'time') ? found : undefined
    const lastWorking = last?.workingSets ?? []
    const lastWarmup = last?.warmupSets ?? []

    const templateWeight = exercise.targetWeight ?? undefined
    const templateReps = exercise.kind === 'time' ? exercise.durationSeconds : exercise.targetReps

    let workingCursor = 0
    let warmupCursor = 0

    // A timed exercise is one entry (see `singleTimedEntry`), ghosted with last time's longest.
    const timed = exercise.kind === 'time'
    const loggedSets: SessionSetDraft[] = Array.from(
      { length: timed ? 1 : exercise.sets },
      (_, i) => {
        const override = timed ? undefined : exercise.specificSets?.[i]
        const type: SessionSetDraft['type'] =
          override?.label === 'W' || override?.label === 'D' ? override.label : 'number'

        const ghost = timed
          ? last?.topSet
          : type === 'W'
            ? (lastWarmup[warmupCursor++] ?? lastWarmup[lastWarmup.length - 1])
            : (lastWorking[workingCursor++] ?? lastWorking[lastWorking.length - 1])

        return {
          id: newSetId(),
          type,
          weight: null,
          reps: null,
          completed: false,
          ghostWeight: ghost?.weight ?? override?.weight ?? templateWeight,
          ghostReps: ghost?.reps ?? override?.reps ?? templateReps,
          ghostFromLast: ghost !== undefined,
        }
      },
    )

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

    // A timed exercise is logged once, whatever its planned set count was before a switch.
    const sets = exercise.kind === 'time' ? 1 : exercise.sets
    const header = [name, `${sets}x${exercise.reps}`, String(weight)]
    if (note) header.push(note)
    lines.push(header.join(' | '))

    let workingIndex = 0
    for (const set of exercise.loggedSets) {
      if (!set.completed || set.weight === null || set.reps === null) continue
      const label = set.type === 'number' ? String(++workingIndex) : set.type
      // A timed set has no weight: zero keeps it out of volume and weight records.
      const setWeight = exercise.kind === 'time' || !Number.isFinite(set.weight) ? 0 : set.weight
      lines.push(`${label} | ${setWeight} | ${set.reps}`)
    }
  }

  return lines.join('\n') + '\n'
}
