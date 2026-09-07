import type { TemplateExercise } from './types'

/**
 * One planned exercise in a {@link WorkoutTemplate}.
 *
 * A flat view over the raw {@link TemplateExercise} parsed from a `.wtt` line.
 * An exercise is either rep-based (`reps 4x8`) or time-based (`time 1m30s`);
 * fields that don't apply to its kind are `undefined`.
 */
export class WorkoutExercise {
  /** Exercise name, exactly as written in the file. */
  readonly name: string

  /** `"reps"` for a rep-based exercise, `"time"` for a timed one. */
  readonly kind: 'reps' | 'time'

  /** Number of sets. Time-based exercises count as a single set. */
  readonly sets: number

  /** Target reps per set. `undefined` for time-based exercises. */
  readonly targetReps?: number

  /** Planned duration in seconds. `undefined` for rep-based exercises. */
  readonly durationSeconds?: number

  /** Planned working weight, in the template's unit. `undefined` if unspecified. */
  readonly targetWeight?: number

  /** Rest after each set, in seconds. `undefined` if the line omits `rest`. */
  readonly restSeconds?: number

  /** Primary muscle group, if the line carries a `muscle` field. */
  readonly muscleGroup?: string

  constructor(raw: TemplateExercise) {
    this.name = raw.name
    this.targetWeight = raw.weight
    this.restSeconds = raw.restSeconds
    this.muscleGroup = raw.muscleGroup

    if (raw.type.kind === 'reps') {
      this.kind = 'reps'
      this.sets = raw.type.sets
      this.targetReps = raw.type.reps
    } else {
      this.kind = 'time'
      this.sets = 1
      this.durationSeconds = raw.type.seconds
    }
  }
}
