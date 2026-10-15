import type { WorkoutSession } from '@/lib/wtx'
import { isTimeExercise } from '@/lib/sessionTime'

/** The heaviest working set ever logged for one exercise. */
export interface ExerciseBest {
  weight: number
  reps: number
}

/** A single exercise whose logged weight this session beat its all-time best. */
export interface PersonalRecord {
  exerciseName: string
  weight: number
  reps: number
  previousWeight: number
  previousReps: number
}

function normalize(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Best working set per exercise across every past session, keyed by the same
 * trim+lowercase normalization used to match exercises elsewhere (see
 * `findLastExercise` in `serializeSession.ts`).
 */
export function allTimeBestsByExercise(pastSessions: WorkoutSession[]): Map<string, ExerciseBest> {
  const bests = new Map<string, ExerciseBest>()

  for (const session of pastSessions) {
    for (const exercise of session.exercises) {
      // Weight records only: a timed exercise's seconds are not reps, and its
      // weight (if any) was never the point.
      if (isTimeExercise(exercise.note)) continue
      const top = exercise.topSet
      if (!top) continue

      const key = normalize(exercise.name)
      const best = bests.get(key)
      if (!best || top.weight > best.weight) {
        bests.set(key, { weight: top.weight, reps: top.reps })
      }
    }
  }

  return bests
}

/**
 * Personal records set by a finished session, one per exercise whose top set
 * beat its all-time best weight.
 *
 * v1 definition is deliberately single-axis: only a strictly heavier weight
 * counts. An exercise with no prior history never counts (its first-ever
 * appearance isn't a "record"), and matching reps at the same weight isn't
 * one either — keeps the celebration meaningful rather than routine.
 */
export function detectPersonalRecords(
  finished: WorkoutSession,
  priorBests: Map<string, ExerciseBest>,
): PersonalRecord[] {
  const records: PersonalRecord[] = []

  for (const exercise of finished.exercises) {
    if (isTimeExercise(exercise.note)) continue
    const top = exercise.topSet
    if (!top) continue

    const prior = priorBests.get(normalize(exercise.name))
    if (!prior) continue
    if (top.weight <= prior.weight) continue

    records.push({
      exerciseName: exercise.name,
      weight: top.weight,
      reps: top.reps,
      previousWeight: prior.weight,
      previousReps: prior.reps,
    })
  }

  return records
}

/** The part of a live set a record is judged on. */
interface LiveSet {
  id: string
  type: string
  weight: number | null
  completed: boolean
}

/**
 * The sets of an exercise still being logged that are records: heavier than
 * the all-time best, and heavier than every set before them in the list — a
 * second set at the same new weight is not news. Warm-ups never count.
 *
 * Derived from the sets alone, so the marks are the same after the workout
 * is resumed as they were when the sets were logged. Same single-axis rule
 * as {@link detectPersonalRecords}: no history, no record.
 */
export function liveRecordSetIds(sets: LiveSet[], prior: ExerciseBest | undefined): Set<string> {
  const ids = new Set<string>()
  if (!prior) return ids

  let best = prior.weight
  for (const set of sets) {
    if (!set.completed || set.type === 'W' || set.weight === null) continue
    if (set.weight > best) {
      ids.add(set.id)
      best = set.weight
    }
  }
  return ids
}
