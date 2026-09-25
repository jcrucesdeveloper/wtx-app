import type { RecapSetLog } from '@/lib/roomRecap'

/** A room `set_logs` row, as far as a member's session view needs it. */
export interface MemberSetLog extends RecapSetLog {
  id: string
}

/** The parts of a routine exercise (a `WorkoutExercise`) the view needs. */
export interface PlannedExercise {
  name: string
  kind: 'reps' | 'time'
  sets: number
  specificSets?: { label: string }[]
}

export interface MemberSessionSet {
  id: string
  /** `W`/`D` as-is; working sets numbered 1, 2, … in the order they were done. */
  label: string
  weight: number
  /** Reps, or seconds held for a timed exercise. */
  reps: number
}

export interface MemberSessionExercise {
  name: string
  kind: 'reps' | 'time'
  /** Planned working sets (warm-ups excluded); `null` for exercises added mid-workout. */
  planned: number | null
  /** Completed working sets. */
  done: number
  sets: MemberSessionSet[]
  /** The exercise of their most recent set — what they're on right now. */
  current: boolean
}

export interface MemberSession {
  exercises: MemberSessionExercise[]
  done: number
  planned: number
  /** Exercise name of their latest set, if any. */
  currentExercise: string | null
}

const key = (name: string) => name.trim().toLowerCase()

/** Working sets planned for a routine exercise — the same count the active session shows. */
export function plannedWorkingSets(exercise: PlannedExercise): number {
  if (exercise.kind !== 'reps' || !exercise.specificSets) return exercise.sets
  const warmups = exercise.specificSets.slice(0, exercise.sets).filter((s) => s.label === 'W').length
  return exercise.sets - warmups
}

/**
 * One member's workout so far, rebuilt from the room's set logs: every
 * routine exercise in order (with what they've completed of it), then any
 * exercise they added mid-workout. Matching is by name (trimmed,
 * case-insensitive), like the app's "last time" hints.
 */
export function buildMemberSession(
  routine: PlannedExercise[],
  userId: string,
  logs: MemberSetLog[],
): MemberSession {
  const own = logs
    .filter((l) => l.user_id === userId)
    .sort((a, b) => Date.parse(a.completed_at) - Date.parse(b.completed_at))
  const currentExercise = own[own.length - 1]?.exercise_name ?? null

  const exercises = new Map<string, MemberSessionExercise>()
  for (const planned of routine) {
    if (exercises.has(key(planned.name))) continue
    exercises.set(key(planned.name), {
      name: planned.name,
      kind: planned.kind,
      planned: plannedWorkingSets(planned),
      done: 0,
      sets: [],
      current: false,
    })
  }

  for (const log of own) {
    let exercise = exercises.get(key(log.exercise_name))
    if (!exercise) {
      exercise = { name: log.exercise_name, kind: 'reps', planned: null, done: 0, sets: [], current: false }
      exercises.set(key(log.exercise_name), exercise)
    }
    const working = log.set_type === 'number'
    if (log.set_type !== 'W') exercise.done++
    exercise.sets.push({
      id: log.id,
      label: working ? String(exercise.sets.filter((s) => /^\d+$/.test(s.label)).length + 1) : log.set_type,
      weight: log.weight,
      reps: log.reps,
    })
  }

  if (currentExercise) {
    const current = exercises.get(key(currentExercise))
    if (current) current.current = true
  }

  const list = [...exercises.values()]
  return {
    exercises: list,
    done: list.reduce((sum, e) => sum + e.done, 0),
    planned: list.reduce((sum, e) => sum + (e.planned ?? 0), 0),
    currentExercise,
  }
}
