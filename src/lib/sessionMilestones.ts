export type MilestoneKind = 'total-sessions' | 'week-streak'

export interface Milestone {
  kind: MilestoneKind
  count: number
  label: string
}

/** Lifetime session-count thresholds worth a milestone callout. */
const SESSION_MILESTONES = [10, 25, 50, 100, 200, 365, 500, 1000]

/** Week-streak thresholds worth a milestone callout. */
const STREAK_MILESTONES = [4, 8, 12, 26, 52, 104]

/**
 * The milestone (if any) a finish just crossed.
 *
 * Both counters are monotonic within a single data set, so a threshold is
 * crossed at most once — no "already celebrated" tracking is needed. Session
 * count takes priority over streak so a finish never tries to show two
 * milestones at once.
 */
export function detectMilestone(
  totalSessionsAfter: number,
  weekStreakAfter: number,
): Milestone | undefined {
  if (SESSION_MILESTONES.includes(totalSessionsAfter)) {
    return {
      kind: 'total-sessions',
      count: totalSessionsAfter,
      label: `${totalSessionsAfter} workouts logged`,
    }
  }

  if (STREAK_MILESTONES.includes(weekStreakAfter)) {
    return {
      kind: 'week-streak',
      count: weekStreakAfter,
      label: `${weekStreakAfter}-week streak`,
    }
  }

  return undefined
}
