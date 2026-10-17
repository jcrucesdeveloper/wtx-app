import type { SetLogType } from '@/lib/supabase/database.types'
import type { PlannedExercise } from '@/lib/memberSession'

/** The fields of a `room_set_logs` row the recap needs. */
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
  /** Σ weight × reps over working sets of rep exercises (a timed set's "reps" are seconds, not volume). */
  volume: number
}

export interface ExerciseComparison {
  exercise: string
  /** `time`: `reps` are seconds held, and the best set is the longest hold. */
  kind: 'reps' | 'time'
  entries: { userId: string; sets: number; best: BestSet | null }[]
}

export interface RoomRecap {
  totals: MemberTotals[]
  /** The routine's exercises in its (host's) order, then any added ones in the order first worked. */
  exercises: ExerciseComparison[]
}

export interface MemberProgress {
  sets: number
  /** Exercise of their most recent set, if any. */
  currentExercise: string | null
}

const key = (name: string) => name.trim().toLowerCase()
const isWorking = (log: RecapSetLog) => log.set_type !== 'W'

/** Heavier wins; equal weight → more reps wins. For a timed exercise the longer hold wins, then the heavier. */
function better(a: BestSet | null, b: BestSet, kind: 'reps' | 'time'): BestSet {
  if (!a) return b
  if (kind === 'time' && b.reps !== a.reps) return b.reps > a.reps ? b : a
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
 * @param routine - The room's routine in its current order: sets the exercise
 *   order and which exercises are timed. Exercises nobody worked are left out.
 */
export function buildRoomRecap(memberIds: string[], logs: RecapSetLog[], routine: PlannedExercise[] = []): RoomRecap {
  const members = new Set(memberIds)
  const sorted = logs.filter((l) => members.has(l.user_id) && isWorking(l)).sort(byTime)
  const kinds = new Map(routine.map((e) => [key(e.name), e.kind]))
  const rank = new Map<string, number>()
  routine.forEach((e, i) => {
    if (!rank.has(key(e.name))) rank.set(key(e.name), i)
  })

  const totals = new Map<string, MemberTotals>(
    memberIds.map((userId) => [userId, { userId, sets: 0, volume: 0 }]),
  )
  const exercises = new Map<
    string,
    { exercise: string; kind: 'reps' | 'time'; byUser: Map<string, { sets: number; best: BestSet | null }> }
  >()

  for (const log of sorted) {
    const k = key(log.exercise_name)
    let exercise = exercises.get(k)
    if (!exercise) {
      const planned = routine[rank.get(k) ?? -1]
      exercise = { exercise: planned?.name ?? log.exercise_name, kind: kinds.get(k) ?? 'reps', byUser: new Map() }
      exercises.set(k, exercise)
    }

    const total = totals.get(log.user_id)!
    total.sets++
    if (exercise.kind === 'reps') total.volume += log.weight * log.reps

    const entry = exercise.byUser.get(log.user_id) ?? { sets: 0, best: null }
    entry.sets++
    entry.best = better(entry.best, { weight: log.weight, reps: log.reps }, exercise.kind)
    exercise.byUser.set(log.user_id, entry)
  }

  // Routine exercises by their place in the routine; added ones after, as first worked (a stable sort keeps that).
  const ordered = [...exercises.entries()]
    .map(([k, e], i) => ({ e, at: rank.get(k) ?? routine.length + i }))
    .sort((a, b) => a.at - b.at)
    .map(({ e }) => e)

  return {
    totals: memberIds.map((id) => totals.get(id)!),
    exercises: ordered.map(({ exercise, kind, byUser }) => ({
      exercise,
      kind,
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
