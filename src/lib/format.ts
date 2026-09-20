/**
 * Formats seconds in the compact `.wtt` style: `1m30s`, `2m`, `45s`, `1h5m`.
 *
 * @param totalSeconds - Duration in seconds.
 * @returns The compact string, or `''` for a zero/negative duration.
 */
export function formatCompactDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  if (seconds === 0) return ''

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  let out = ''
  if (h > 0) out += `${h}h`
  if (m > 0) out += `${m}m`
  if (s > 0) out += `${s}s`
  return out
}

/** Formats seconds as a live clock: `1:05`, `12:03`, `1:02:03`. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Formats a large number with thin thousands separators: `12 500`. */
export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US').replace(/,/g, ' ')
}

/** Local wall-clock time for a timestamp, e.g. "6:45 PM". */
export function formatTimeOfDay(ms: number): string {
  const date = new Date(ms)
  const hours24 = date.getHours()
  const hours = hours24 % 12 || 12
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const period = hours24 < 12 ? 'AM' : 'PM'
  return `${hours}:${minutes} ${period}`
}

/** Filesystem-safe 24h "HHmm" stamp for a timestamp, for sortable, collision-resistant filenames. */
export function formatFileTimeStamp(ms: number): string {
  const date = new Date(ms)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}${minutes}`
}
