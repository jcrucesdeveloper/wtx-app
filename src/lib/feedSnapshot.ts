import type { PersonalRecord } from '@/lib/sessionRecords'
import type { SessionComparison } from '@/lib/sessionComparisons'
import type { Milestone, MilestoneKind } from '@/lib/sessionMilestones'
import type { SessionRecap } from '@/stores/sessionRecap'

/**
 * The celebratory recap of a finish (see `SessionRecap`), denormalized onto
 * a shared session's row. A feed viewer has no access to the poster's
 * private session history, so PRs/streaks/milestones can't be recomputed
 * client-side the way `SessionCompleteView` recomputes its own — they're
 * captured once, at finish time, instead.
 */
export type FeedSnapshot = Omit<SessionRecap, 'sessionId'> & {
  /** Display names of the other room members, when the workout was done in a room. */
  trainedWith?: string[]
}

/** Most names a snapshot keeps — a room holds at most 8, so 7 partners. */
const MAX_PARTNERS = 7

export function toFeedSnapshot(recap: FeedSnapshot): FeedSnapshot {
  return { ...recap }
}

const MILESTONE_KINDS: MilestoneKind[] = ['total-sessions', 'week-streak']

const isShortString = (v: unknown, max = 120): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max
const isFiniteNumber = (v: unknown, min = -1_000_000, max = 1_000_000): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
const isCount = (v: unknown, max = 100_000): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max

function parsePersonalRecord(value: unknown): PersonalRecord | null {
  const p = value as Partial<PersonalRecord> | null
  if (
    !p ||
    !isShortString(p.exerciseName) ||
    !isFiniteNumber(p.weight, 0) ||
    !isFiniteNumber(p.reps, 0) ||
    !isFiniteNumber(p.previousWeight, 0) ||
    !isFiniteNumber(p.previousReps, 0)
  ) {
    return null
  }
  return {
    exerciseName: p.exerciseName,
    weight: p.weight,
    reps: p.reps,
    previousWeight: p.previousWeight,
    previousReps: p.previousReps,
  }
}

function parseComparison(value: unknown): SessionComparison | undefined {
  if (value == null) return undefined
  const c = value as Partial<SessionComparison> | null
  if (!c || !isFiniteNumber(c.volumeDelta) || !isFiniteNumber(c.workingSetsDelta) || typeof c.isVolumeUp !== 'boolean') {
    return undefined
  }
  return { volumeDelta: c.volumeDelta, workingSetsDelta: c.workingSetsDelta, isVolumeUp: c.isVolumeUp }
}

function parseTrainedWith(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const names = value.filter((n) => isShortString(n, 48)).slice(0, MAX_PARTNERS)
  return names.length ? names : undefined
}

function parseMilestone(value: unknown): Milestone | undefined {
  if (value == null) return undefined
  const m = value as Partial<Milestone> | null
  if (!m || !MILESTONE_KINDS.includes(m.kind as MilestoneKind) || !isCount(m.count)) return undefined
  return { kind: m.kind as MilestoneKind, count: m.count! }
}

/**
 * Defensively parses a session row's `feed_snapshot` jsonb column — it
 * crosses a serialization boundary like every other stored/broadcast
 * payload in this codebase (see `roomEvents.ts`'s parsers), so it's treated
 * as untrusted shape rather than cast outright.
 */
export function parseFeedSnapshot(value: unknown): FeedSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const s = value as Partial<Record<keyof FeedSnapshot, unknown>>
  if (!Array.isArray(s.personalRecords) || !isCount(s.weekStreak) || !isCount(s.elapsedSeconds)) return null

  const personalRecords = s.personalRecords.map(parsePersonalRecord).filter((r): r is PersonalRecord => r !== null)
  const trainedWith = parseTrainedWith(s.trainedWith)

  return {
    personalRecords,
    comparison: parseComparison(s.comparison),
    milestone: parseMilestone(s.milestone),
    weekStreak: s.weekStreak,
    elapsedSeconds: s.elapsedSeconds,
    ...(trainedWith ? { trainedWith } : {}),
  }
}
