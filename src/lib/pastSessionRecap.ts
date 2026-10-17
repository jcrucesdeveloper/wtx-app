import type { WorkoutSession } from '@/lib/wtx'
import type { FeedSnapshot } from '@/lib/feedSnapshot'
import { allTimeBestsByExercise, detectPersonalRecords, type PersonalRecord } from '@/lib/sessionRecords'
import { compareSessions, type SessionComparison } from '@/lib/sessionComparisons'

/** A logged session as History holds it: the parsed workout and what was saved beside it. */
export interface LoggedSession {
  id: string
  addedAt: number
  routineId?: string
  feedSnapshot?: FeedSnapshot
  session: WorkoutSession
}

/** What can still be said about a workout after the fact. */
export interface PastSessionRecap {
  personalRecords: PersonalRecord[]
  comparison: SessionComparison | undefined
  /** Zero when it wasn't recorded: only a session posted to the feed kept its time. */
  elapsedSeconds: number
  /** Zero when it wasn't recorded. */
  weekStreak: number
}

/**
 * The finish-screen facts for a session seen later from History. Records and
 * the comparison are worked out against the sessions logged before it — the
 * same rules the finish screen used — unless the session was posted, in which
 * case what was celebrated then is kept as it was.
 */
export function pastSessionRecap(target: LoggedSession, all: LoggedSession[]): PastSessionRecap {
  const earlier = all
    .filter((item) => item.id !== target.id && item.addedAt < target.addedAt)
    .sort((a, b) => b.addedAt - a.addedAt)

  const snapshot = target.feedSnapshot
  const personalRecords =
    snapshot?.personalRecords ??
    detectPersonalRecords(target.session, allTimeBestsByExercise(earlier.map((e) => e.session)))

  const previous = target.routineId
    ? earlier.find((item) => item.routineId === target.routineId)
    : undefined

  return {
    personalRecords,
    comparison: compareSessions(target.session, previous?.session),
    elapsedSeconds: snapshot?.elapsedSeconds ?? 0,
    weekStreak: snapshot?.weekStreak ?? 0,
  }
}
