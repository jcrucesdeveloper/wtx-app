import type { WorkoutSession } from '@/lib/wtx'

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
