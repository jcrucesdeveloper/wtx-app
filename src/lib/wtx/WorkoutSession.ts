import type { Session } from './types'
import { WorkoutSessionExercise } from './WorkoutSessionExercise'

/**
 * A parsed `.wts` workout session — a logged workout.
 *
 * Stored fields mirror the file; getters roll up the logged sets across every
 * exercise. Unlike {@link WorkoutTemplate}, the totals here are actuals, not
 * estimates — they come straight from what was recorded.
 */
export class WorkoutSession {
  /** Routine name (the `#` line, before the date). */
  readonly name: string

  /** Session date as written, `YYYY-MM-DD`. */
  readonly date: string

  /** The `.wtt` file this session followed (`template:` line), if any. */
  readonly template?: string

  /** Weight unit for the whole file (`unit:` line), e.g. `"kg"`. */
  readonly unit?: string

  /** Free-text summary (`notes:` line, falling back to `description:`). */
  readonly notes?: string

  /** Exercises performed, in file order. */
  readonly exercises: WorkoutSessionExercise[]

  constructor(raw: Session) {
    this.name = raw.name
    this.date = raw.date
    this.template = raw.template
    this.unit = raw.unit
    this.notes = raw.notes ?? raw.description
    this.exercises = raw.exercises.map((exercise) => new WorkoutSessionExercise(exercise))
  }

  /** Number of exercises performed. */
  get exerciseCount(): number {
    return this.exercises.length
  }

  /** Total working sets logged across the session (warm-ups excluded). */
  get totalWorkingSets(): number {
    return this.exercises.reduce((sum, exercise) => sum + exercise.workingSets.length, 0)
  }

  /** Total reps performed across every working set. */
  get totalReps(): number {
    return this.exercises.reduce((sum, exercise) => sum + exercise.totalReps, 0)
  }

  /** Actual volume lifted across the whole session: sum of `weight × reps`. */
  get totalVolume(): number {
    return this.exercises.reduce((sum, exercise) => sum + exercise.volume, 0)
  }

  /** Whether every exercise logged at least its planned number of working sets. */
  get isComplete(): boolean {
    return this.exercises.every((exercise) => exercise.isComplete)
  }
}
