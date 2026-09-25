import type { SetLogType } from '@/lib/supabase/database.types'

/** The fields of a `set_logs` row the recap needs. */
export interface RecapSetLog {
  user_id: string
  exercise_name: string
  set_type: SetLogType
  weight: number
  reps: number
  completed_at: string
}

export interface BestSet {
  weight: number
  reps: number
}

export interface MemberTotals {
  userId: string
  /** Completed working sets (warm-ups excluded). */
  sets: number
  /** Σ weight × reps over working sets. */
  volume: number
}

export interface ExerciseComparison {
  exercise: string
  entries: { userId: string; sets: number; best: BestSet | null }[]
}

export interface RoomRecap {
  totals: MemberTotals[]
  /** In the order the room first worked each exercise. */
  exercises: ExerciseComparison[]
}

export interface MemberProgress {
  sets: number
  /** Exercise of their most recent set, if any. */
  currentExercise: string | null
}

const key = (name: string) => name.trim().toLowerCase()
const isWorking = (log: RecapSetLog) => log.set_type !== 'W'

/** Heavier wins; equal weight → more reps wins. */
function better(a: BestSet | null, b: BestSet): BestSet {
  if (!a) return b
  if (b.weight !== a.weight) return b.weight > a.weight ? b : a
  return b.reps > a.reps ? b : a
}

function byTime(a: RecapSetLog, b: RecapSetLog) {
  return Date.parse(a.completed_at) - Date.parse(b.completed_at)
}

/**
 * Side-by-side comparison of everyone in a room. Exercises are matched by
 * name (trimmed, case-insensitive), like the app's "last time" hints.
 *
 * @param memberIds - Room members, in display order. Logs from anyone else are ignored.
 */
export function buildRoomRecap(memberIds: string[], logs: RecapSetLog[]): RoomRecap {
  const members = new Set(memberIds)
  const sorted = logs.filter((l) => members.has(l.user_id) && isWorking(l)).sort(byTime)

  const totals = new Map<string, MemberTotals>(
    memberIds.map((userId) => [userId, { userId, sets: 0, volume: 0 }]),
  )
  const exercises = new Map<string, { exercise: string; byUser: Map<string, { sets: number; best: BestSet | null }> }>()

  for (const log of sorted) {
    const total = totals.get(log.user_id)!
    total.sets++
    total.volume += log.weight * log.reps

    let exercise = exercises.get(key(log.exercise_name))
    if (!exercise) {
      exercise = { exercise: log.exercise_name, byUser: new Map() }
      exercises.set(key(log.exercise_name), exercise)
    }
    const entry = exercise.byUser.get(log.user_id) ?? { sets: 0, best: null }
    entry.sets++
    entry.best = better(entry.best, { weight: log.weight, reps: log.reps })
    exercise.byUser.set(log.user_id, entry)
  }

  return {
    totals: memberIds.map((id) => totals.get(id)!),
    exercises: [...exercises.values()].map(({ exercise, byUser }) => ({
      exercise,
      entries: memberIds.map((userId) => ({
        userId,
        sets: byUser.get(userId)?.sets ?? 0,
        best: byUser.get(userId)?.best ?? null,
      })),
    })),
  }
}

/** Live progress for one member: working sets done and what they're on now. */
export function memberProgress(userId: string, logs: RecapSetLog[]): MemberProgress {
  const own = logs.filter((l) => l.user_id === userId).sort(byTime)
  return {
    sets: own.filter(isWorking).length,
    currentExercise: own[own.length - 1]?.exercise_name ?? null,
  }
}
