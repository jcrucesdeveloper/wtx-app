const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Feed-style timestamp: "just now", "5 min ago", "3 hr ago", "2 days ago",
 * then a short date ("Sep 3", or "Sep 3, 2025" outside this year) once it's
 * a week old — past that, a date reads better than "23 days ago".
 */
export function formatRelativeTime(ms: number, locale: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - ms)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })

  if (diff < MINUTE) return rtf.format(0, 'second')
  if (diff < HOUR) return rtf.format(-Math.floor(diff / MINUTE), 'minute')
  if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), 'hour')
  if (diff < 7 * DAY) return rtf.format(-Math.floor(diff / DAY), 'day')

  const date = new Date(ms)
  const sameYear = date.getFullYear() === new Date(now).getFullYear()
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}
