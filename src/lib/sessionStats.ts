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
