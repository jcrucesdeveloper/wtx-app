import type { WorkoutSession } from '@/lib/wtx'
import { isTimeExercise } from '@/lib/sessionTime'

/** Sessions shown in an exercise's progress chart, most recent last. */
export const PROGRESS_SESSIONS = 12

/** One session's best effort on an exercise. */
export interface ProgressPoint {
  date: string
  /**
   * What the chart plots: the best estimated one-rep max for a weighted
   * exercise, or the longest hold in seconds for a timed one.
   */
  value: number
  /** The set that produced {@link value}. For a timed exercise `reps` holds seconds. */
  topSet: { weight: number; reps: number }
  unit: string
}

export interface ExerciseProgress {
  /** `e1rm` for weight × reps, `seconds` for a timed exercise. */
  metric: 'e1rm' | 'seconds'
  /** Oldest first, at most {@link PROGRESS_SESSIONS}. */
  points: ProgressPoint[]
}

/**
 * Estimated one-rep max by the Epley formula, `w × (1 + reps / 30)`. A single
 * is its own max, so one rep returns the weight unchanged. Rounded to one
 * decimal: plates come in 1.25 kg / 2.5 lb steps, so more is noise.
 */
export function estimatedOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

/**
 * The last {@link PROGRESS_SESSIONS} sessions that logged `name`, matched by
 * the same trim + lowercase rule as `sessionRecords.ts`, each reduced to its
 * best working set (warm-ups never count). A weighted exercise plots its best
 * estimated 1RM and skips sets with no weight; a timed one plots its longest
 * hold. Whether it's timed follows the most recent session that logged it.
 */
export function exerciseProgress(sessions: WorkoutSession[], name: string): ExerciseProgress {
  const key = name.trim().toLowerCase()
  // Oldest first; `sort` is stable, so same-day sessions keep their given order.
  const ordered = [...sessions].sort((a, b) => a.date.localeCompare(b.date))

  const found = ordered.flatMap((session) => {
    const exercise = session.exercises.find((e) => e.name.trim().toLowerCase() === key)
    return exercise ? [{ session, exercise }] : []
  })
  const latest = found[found.length - 1]
  const timed = latest ? isTimeExercise(latest.exercise.note) : false

  const points: ProgressPoint[] = []
  for (const { session, exercise } of found) {
    if (isTimeExercise(exercise.note) !== timed) continue
    let best: ProgressPoint | null = null
    for (const set of exercise.workingSets) {
      const weight = Number(set.weight) || 0
      const reps = Number(set.reps) || 0
      const value = timed ? reps : estimatedOneRepMax(weight, reps)
      if (value <= 0) continue
      if (!best || value > best.value) {
        best = { date: session.date, value, topSet: { weight, reps }, unit: session.unit ?? '' }
      }
    }
    if (best) points.push(best)
  }

  return { metric: timed ? 'seconds' : 'e1rm', points: points.slice(-PROGRESS_SESSIONS) }
}
