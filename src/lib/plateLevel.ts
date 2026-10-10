/**
 * The plate a lifter has earned: a level based only on how many days they
 * have trained, shown as the standard competition plate colours (white 5 kg,
 * green 10, yellow 15, blue 20, red 25). Past the red plate, more red plates
 * go on the bar, the way lifters count "three plates".
 *
 * It only ever goes up: there is no decay and nothing to lose by taking a
 * week off.
 */

export type PlateKg = 5 | 10 | 15 | 20 | 25

export interface PlateStep {
  /** Workout days needed to reach this step. */
  at: number
  kg: PlateKg
  /** How many of that plate are on the bar (more than one only for red). */
  count: number
}

/** The same thresholds the finish screen already celebrates as session milestones. */
export const PLATE_STEPS: PlateStep[] = [
  { at: 1, kg: 5, count: 1 },
  { at: 10, kg: 10, count: 1 },
  { at: 25, kg: 15, count: 1 },
  { at: 50, kg: 20, count: 1 },
  { at: 100, kg: 25, count: 1 },
  { at: 200, kg: 25, count: 2 },
  { at: 365, kg: 25, count: 3 },
  { at: 500, kg: 25, count: 4 },
  { at: 1000, kg: 25, count: 5 },
]

export interface PlateLevel {
  workoutDays: number
  /** The step reached, or `null` before the first workout. */
  current: PlateStep | null
  /** The step being worked towards, or `null` once every plate is earned. */
  next: PlateStep | null
  /** Workout days still needed for `next` (0 when there is none). */
  remaining: number
  /** 0–1 progress from the current step to the next (1 when there is none). */
  progress: number
}

/**
 * Days trained, from each workout's local `YYYY-MM-DD`. Several workouts on
 * one day count once, so logging extra sessions can't inflate a level.
 */
export function countWorkoutDays(dateStrs: string[]): number {
  return new Set(dateStrs).size
}

export function plateLevel(workoutDays: number): PlateLevel {
  const days = Math.max(0, Math.floor(workoutDays))
  const reached = PLATE_STEPS.filter((step) => days >= step.at)
  const current = reached[reached.length - 1] ?? null
  const next = PLATE_STEPS[reached.length] ?? null
  const from = current?.at ?? 0

  return {
    workoutDays: days,
    current,
    next,
    remaining: next ? next.at - days : 0,
    progress: next ? (days - from) / (next.at - from) : 1,
  }
}

/** Competition plate colours, with the ink that reads on each. */
export const PLATE_COLORS: Record<PlateKg, { fill: string; ink: string }> = {
  5: { fill: '#f1f1ee', ink: '#17181b' },
  10: { fill: '#1f9d55', ink: '#ffffff' },
  15: { fill: '#f2c318', ink: '#17181b' },
  20: { fill: '#2563eb', ink: '#ffffff' },
  25: { fill: '#dc2626', ink: '#ffffff' },
}
