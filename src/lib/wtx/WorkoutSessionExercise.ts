import type { SessionExercise, SessionSet } from './types'

/**
 * One exercise as it was actually performed in a {@link WorkoutSession}.
 *
 * Wraps the raw {@link SessionExercise}: the header line carries the plan
 * (`4x6 | 80`), and each following line is a logged set. Getters summarise
 * what really happened from the logged sets.
 */
export class WorkoutSessionExercise {
  /** Exercise name, exactly as written in the file. */
  readonly name: string

  /** Free-text note from the exercise line's trailing field. */
  readonly note?: string

  /** Planned number of working sets (the `N` in `NxM`). */
  readonly sets: number

  /** Planned reps per set (the `M` in `NxM`). */
  readonly reps: number

  /** Planned working weight, in the session's unit. */
  readonly weight: number

  /** Every set recorded under this exercise, warm-ups included, in file order. */
  readonly loggedSets: SessionSet[]

  constructor(raw: SessionExercise) {
    this.name = raw.name
    this.note = raw.note
    this.sets = raw.sets
    this.reps = raw.reps
    this.weight = raw.weight
    this.loggedSets = raw.loggedSets
  }

  /** Logged sets that count toward the workout — warm-ups (`W`) excluded. */
  get workingSets(): SessionSet[] {
    return this.loggedSets.filter((set) => set.label !== 'W')
  }

  /** Logged warm-up sets (label `W`). */
  get warmupSets(): SessionSet[] {
    return this.loggedSets.filter((set) => set.label === 'W')
  }

  /** Total reps performed across working sets. */
  get totalReps(): number {
    return this.workingSets.reduce((sum, set) => sum + set.reps, 0)
  }

  /** Actual volume lifted: sum of `weight × reps` across working sets. */
  get volume(): number {
    return this.workingSets.reduce((sum, set) => sum + set.weight * set.reps, 0)
  }

  /** Heaviest working set (ties broken by reps), or `undefined` if none were logged. */
  get topSet(): SessionSet | undefined {
    return this.workingSets.reduce<SessionSet | undefined>((best, set) => {
      if (!best) return set
      if (set.weight > best.weight) return set
      if (set.weight === best.weight && set.reps > best.reps) return set
      return best
    }, undefined)
  }

  /** Whether at least as many working sets were logged as planned. */
  get isComplete(): boolean {
    return this.workingSets.length >= this.sets
  }
}
