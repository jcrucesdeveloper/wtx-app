import type { WorkoutSession } from '@/lib/wtx'
import { isTimeExercise } from '@/lib/sessionTime'

/** One exercise's best set, for a feed card's preview list. */
export interface WorkoutHighlight {
  name: string
  weight: number
  /** Reps, or seconds held for timed exercises. */
  reps: number
  isTime: boolean
  workingSets: number
}

/** What a feed card shows about a workout at a glance. */
export interface WorkoutSummary {
  exerciseCount: number
  workingSets: number
  /** Reps across rep-based exercises — timed ones log seconds, which aren't reps. */
  totalReps: number
  volume: number
  /** The first few exercises, in the order they were done. */
  highlights: WorkoutHighlight[]
  /** Exercises left out of `highlights`. */
  moreCount: number
}

/**
 * Summarises a logged workout for the feed. Exercises with no working sets
 * are skipped — a card should show what was trained, not what was planned.
 */
export function summarizeWorkout(session: WorkoutSession, maxHighlights = 3): WorkoutSummary {
  const trained = session.exercises.filter((exercise) => exercise.workingSets.length > 0)
  const highlights = trained.slice(0, maxHighlights).map((exercise) => {
    const top = exercise.topSet!
    return {
      name: exercise.name,
      weight: top.weight,
      reps: top.reps,
      isTime: isTimeExercise(exercise.note),
      workingSets: exercise.workingSets.length,
    }
  })

  return {
    exerciseCount: trained.length,
    workingSets: session.totalWorkingSets,
    totalReps: trained
      .filter((exercise) => !isTimeExercise(exercise.note))
      .reduce((sum, exercise) => sum + exercise.totalReps, 0),
    volume: session.totalVolume,
    highlights,
    moreCount: Math.max(0, trained.length - highlights.length),
  }
}
