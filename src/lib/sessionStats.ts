const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
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

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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

/**
 * Consecutive weeks (Mon–Sun) with at least one session, walking back from
 * the current week. A week still in progress with no session yet doesn't
 * break the streak — it just isn't counted until it has one.
 */
export function computeWeekStreak(dateStrs: string[], now: Date = new Date()): number {
  const weeks = new Set(dateStrs.map((d) => mondayOf(parseLocalDate(d)).getTime()))

  const cursor = mondayOf(now)
  if (!weeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7)

  let streak = 0
  while (weeks.has(cursor.getTime())) {
    streak++
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

/** One day in a {@link last7DaysActivity} strip. */
export interface DayActivity {
  /** Single-letter weekday initial, e.g. "M". */
  label: string
  active: boolean
  isToday: boolean
}

/** The last 7 calendar days (oldest → today), each flagged for whether it had a session. */
export function last7DaysActivity(dateStrs: string[], now: Date = new Date()): DayActivity[] {
  const days = new Set(dateStrs)
  const today = startOfDay(now)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    return {
      label: WEEKDAY_INITIALS[d.getDay()]!,
      active: days.has(toDateKey(d)),
      isToday: i === 6,
    }
  })
}
