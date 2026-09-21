import { parseSessionText } from '@/lib/parseSession'
import type { StoredSession } from '@/stores/sessions'

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** Parses a `YYYY-MM-DD` string as a local-midnight `Date` (never UTC). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000)
}

/** Friendly label for a session date: "Today", "Yesterday", a weekday, or "Mon D[, YYYY]". */
export function formatSessionDate(dateStr: string, now: Date = new Date()): string {
  const date = parseLocalDate(dateStr)
  const diff = daysBetween(now, date)

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return WEEKDAY_NAMES[date.getDay()]!

  const label = `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`
  return date.getFullYear() === now.getFullYear() ? label : `${label}, ${date.getFullYear()}`
}

export type RecencyGroup = 'This week' | 'Last week' | 'Earlier'

/** Buckets a session date into a trailing-week recency group, for list section headers. */
export function recencyGroup(dateStr: string, now: Date = new Date()): RecencyGroup {
  const diff = daysBetween(now, parseLocalDate(dateStr))
  if (diff < 7) return 'This week'
  if (diff < 14) return 'Last week'
  return 'Earlier'
}

/** Monday (local midnight) of the week containing `date`. */
function mondayOf(date: Date): Date {
  const d = startOfDay(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

/** Set of Monday timestamps (local midnight) for every week that has a session. */
function weeksWithSessions(dateStrs: string[]): Set<number> {
  return new Set(dateStrs.map((d) => mondayOf(parseLocalDate(d)).getTime()))
}

/**
 * Consecutive weeks (Mon–Sun) with at least one session, walking back from
 * the current week. A week still in progress with no session yet doesn't
 * break the streak — it just isn't counted until it has one.
 */
export function computeWeekStreak(dateStrs: string[], now: Date = new Date()): number {
  const weeks = weeksWithSessions(dateStrs)

  const cursor = mondayOf(now)
  if (!weeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7)

  let streak = 0
  while (weeks.has(cursor.getTime())) {
    streak++
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

/** One week in a {@link recentWeeksActivity} strip. */
export interface WeekActivity {
  active: boolean
  isCurrent: boolean
}

/**
 * The last `count` calendar weeks (Mon–Sun, oldest → current), each flagged
 * for whether it had a session. Same weekly unit as {@link computeWeekStreak},
 * so the streak number and the strip always agree.
 */
export function recentWeeksActivity(
  dateStrs: string[],
  count = 8,
  now: Date = new Date(),
): WeekActivity[] {
  const weeks = weeksWithSessions(dateStrs)
  const thisMonday = mondayOf(now)

  return Array.from({ length: count }, (_, i) => {
    const monday = new Date(thisMonday)
    monday.setDate(monday.getDate() - (count - 1 - i) * 7)
    return { active: weeks.has(monday.getTime()), isCurrent: i === count - 1 }
  })
}

/**
 * Volume change vs. the most recent earlier session of the same routine.
 * `undefined` when there's no routine link, no prior session, or both sit at
 * zero volume (nothing meaningful to compare).
 */
export function routineVolumeDelta(
  sessions: StoredSession[],
  session: StoredSession,
): number | undefined {
  if (!session.routineId) return undefined

  const current = parseSessionText(session.rawText)
  if (!current.ok) return undefined

  const prev = sessions
    .filter((s) => s.routineId === session.routineId && s.addedAt < session.addedAt)
    .sort((a, b) => b.addedAt - a.addedAt)[0]
  if (!prev) return undefined

  const prevParsed = parseSessionText(prev.rawText)
  if (!prevParsed.ok) return undefined

  const currentVolume = current.session.totalVolume
  const prevVolume = prevParsed.session.totalVolume
  if (currentVolume === 0 && prevVolume === 0) return undefined
  return currentVolume - prevVolume
}
