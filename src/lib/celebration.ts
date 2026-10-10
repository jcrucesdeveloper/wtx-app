import type { Milestone } from '@/lib/sessionMilestones'

/**
 * How big a finished workout's celebration should be. The finish screen is
 * always warm; it only becomes an event when something rare happened, so
 * that an event still means something the fiftieth time you finish.
 *
 * - `routine`  a workout, done. Most finishes.
 * - `win`      something was earned: a personal record, or a milestone.
 * - `event`    something rare: a new plate, a year of weeks in a row, a
 *              hundred workouts, or three records in one session.
 */
export type CelebrationTier = 'routine' | 'win' | 'event'

export interface CelebrationFacts {
  personalRecords: number
  milestone?: Milestone
  /** This workout earned a new plate on the profile. */
  plateUp: boolean
}

const EVENT_STREAK_WEEKS = 52
const EVENT_SESSION_COUNT = 100
const EVENT_RECORDS = 3

export function celebrationTier(facts: CelebrationFacts): CelebrationTier {
  const { personalRecords, milestone, plateUp } = facts

  const rareMilestone =
    milestone !== undefined &&
    (milestone.kind === 'week-streak'
      ? milestone.count >= EVENT_STREAK_WEEKS
      : milestone.count >= EVENT_SESSION_COUNT)

  if (plateUp || rareMilestone || personalRecords >= EVENT_RECORDS) return 'event'
  if (personalRecords > 0 || milestone !== undefined) return 'win'
  return 'routine'
}
