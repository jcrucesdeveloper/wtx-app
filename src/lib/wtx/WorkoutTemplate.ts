import type { Template } from './types'
import { WorkoutExercise } from './WorkoutExercise'

/**
 * A parsed `.wtt` workout template — a routine you plan to follow.
 *
 * Stored fields mirror the file; getters expose counts and totals derived
 * straight from the exercises (no fudge factors — see {@link totalTime}).
 */
export class WorkoutTemplate {
  /** Routine name (the `#` line). */
  readonly name: string

  /** Weight unit for the whole file (`unit:` line), e.g. `"kg"`. */
  readonly unit?: string

  /** Free-text summary (`notes:` line, falling back to `description:`). */
  readonly notes?: string

  /** Labels from the `tags:` line, split on commas and trimmed. */
  readonly tags: string[]

  /** Planned exercises, in file order. */
  readonly exercises: WorkoutExercise[]

  constructor(raw: Template) {
    this.name = raw.name
    this.unit = raw.unit
    this.notes = raw.notes ?? raw.description
    this.tags = raw.tags ?? []
    this.exercises = raw.exercises.map((exercise) => new WorkoutExercise(exercise))
  }

  /** Number of exercises in the routine. */
  get exerciseCount(): number {
    return this.exercises.length
  }

  /**
   * Planned time in seconds, from the file alone: timed exercises plus the
   * prescribed rest between sets. Working-set effort isn't in the file, so it
   * isn't counted — treat this as a lower bound.
   */
  get totalTime(): number {
    return this.exercises.reduce((sum, exercise) => {
      if (exercise.kind === 'time') return sum + (exercise.durationSeconds ?? 0)
      return sum + (exercise.restSeconds ?? 0) * exercise.sets
    }, 0)
  }

  /** {@link totalTime} formatted like `"1h 15m"`, `"45m"`, or `"30s"`. */
  get totalTimeHumanReadable(): string {
    return formatDuration(this.totalTime)
  }

  /** Sum of `sets × reps × weight` across rep-based exercises that specify a weight. */
  get estimatedVolume(): number {
    return this.exercises.reduce((sum, exercise) => {
      if (
        exercise.kind !== 'reps' ||
        exercise.targetReps === undefined ||
        exercise.targetWeight === undefined
      ) {
        return sum
      }
      return sum + exercise.sets * exercise.targetReps * exercise.targetWeight
    }, 0)
  }

  /** Distinct muscle groups across exercises that declare one, in first-seen order. */
  get muscleGroupsCovered(): string[] {
    const seen = new Set<string>()
    for (const exercise of this.exercises) {
      if (exercise.muscleGroup) seen.add(exercise.muscleGroup)
    }
    return [...seen]
  }
}

/** Formats a second count as a compact `"1h 15m"` / `"45m"` / `"30s"` string. */
function formatDuration(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`)
  if (parts.length === 0) parts.push(`${seconds}s`)
  return parts.join(' ')
}
