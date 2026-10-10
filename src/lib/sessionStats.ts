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

/** Sessions per week, keyed by the week's Monday timestamp (local midnight). */
function sessionsPerWeek(dateStrs: string[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const d of dateStrs) {
    const key = mondayOf(parseLocalDate(d)).getTime()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/** Workouts in one week that make up for the single week missed before it. */
export const REPAIR_WORKOUTS = 2

function weekBefore(monday: Date): Date {
  const d = new Date(monday)
  d.setDate(d.getDate() - 7)
  return d
}

/**
 * Consecutive weeks (Mon–Sun) with at least one session, walking back from
 * the current week. A week still in progress with no session yet doesn't
 * break the streak — it just isn't counted until it has one.
 *
 * One missed week is forgiven when the week after it had
 * {@link REPAIR_WORKOUTS} sessions: the run carries on across the gap (the
 * missed week itself adds nothing to the count). Two missed weeks in a row
 * end the run.
 */
export function computeWeekStreak(dateStrs: string[], now: Date = new Date()): number {
  const counts = sessionsPerWeek(dateStrs)

  let cursor = mondayOf(now)
  if (!counts.has(cursor.getTime())) cursor = weekBefore(cursor)

  let streak = 0
  /** Sessions in the week just counted — the one after `cursor`. */
  let newerCount = 0

  for (;;) {
    const count = counts.get(cursor.getTime()) ?? 0
    if (count > 0) {
      streak++
      newerCount = count
      cursor = weekBefore(cursor)
      continue
    }
    const beyond = weekBefore(cursor)
    const repaired = streak > 0 && newerCount >= REPAIR_WORKOUTS && counts.has(beyond.getTime())
    if (!repaired) break
    cursor = beyond
  }
  return streak
}

/** A run that was missed by one week and can still be picked back up this week. */
export interface StreakRepair {
  /** Workouts still needed this week to make up the missed one. */
  needed: number
  /** How long the run will be once they are done. */
  weeks: number
}

/**
 * Whether last week was missed after a run, and this week can still repair
 * it. `null` when there is nothing to repair: no run before the gap, the gap
 * is longer than a week, or this week already made it up.
 */
export function streakRepair(dateStrs: string[], now: Date = new Date()): StreakRepair | null {
  const counts = sessionsPerWeek(dateStrs)
  const thisWeek = mondayOf(now)
  const lastWeek = weekBefore(thisWeek)
  const weekBeforeLast = weekBefore(lastWeek)

  if (counts.has(lastWeek.getTime()) || !counts.has(weekBeforeLast.getTime())) return null

  const doneThisWeek = counts.get(thisWeek.getTime()) ?? 0
  if (doneThisWeek >= REPAIR_WORKOUTS) return null

  // The run as it stood when the missed week began.
  const earlier = dateStrs.filter((d) => parseLocalDate(d).getTime() < lastWeek.getTime())
  const runBefore = computeWeekStreak(earlier, weekBeforeLast)

  return { needed: REPAIR_WORKOUTS - doneThisWeek, weeks: runBefore + 1 }
}

/** `YYYY-MM-DD` for a local date — the same shape sessions store their date in. */
export function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** One day cell in a {@link monthCalendar} grid. */
export interface CalendarDay {
  /** `YYYY-MM-DD`, local. */
  date: string
  day: number
  /** False for the leading/trailing days that pad the first and last week. */
  inMonth: boolean
  /** Sessions logged that day. */
  count: number
  isToday: boolean
  isFuture: boolean
}

/**
 * A month as Monday-first weeks (the same week unit as the rest of these
 * stats), each day flagged with how many sessions it had. Padding days from
 * the neighbouring months keep every week seven cells wide.
 *
 * @param month 0-based, like `Date#getMonth`.
 */
export function monthCalendar(
  dateStrs: string[],
  year: number,
  month: number,
  now: Date = new Date(),
): CalendarDay[][] {
  const counts = new Map<string, number>()
  for (const d of dateStrs) counts.set(d, (counts.get(d) ?? 0) + 1)

  const today = toDateStr(now)
  const cursor = mondayOf(new Date(year, month, 1))
  const weeks: CalendarDay[][] = []

  do {
    const week: CalendarDay[] = []
    for (let i = 0; i < 7; i++) {
      const date = toDateStr(cursor)
      week.push({
        date,
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === month,
        count: counts.get(date) ?? 0,
        isToday: date === today,
        isFuture: date > today,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  } while (cursor.getMonth() === month)

  return weeks
}

/** Sessions logged in the Monday-first week containing `now`. */
export function sessionsThisWeek(dateStrs: string[], now: Date = new Date()): number {
  const monday = mondayOf(now).getTime()
  return dateStrs.filter((d) => mondayOf(parseLocalDate(d)).getTime() === monday).length
}
