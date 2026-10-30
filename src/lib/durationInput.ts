/**
 * Pure helpers behind the mm:ss duration field (`DurationInput.vue`).
 *
 * The field is typed on a phone's numeric keypad, which has no colon, so it
 * reads digits the way a microwave or kitchen timer does: the last two digits
 * are seconds, anything before them is minutes, and the colon is put in for
 * you. `1` → 0:01, `13` → 0:13, `130` → 1:30. Seconds past 59 carry over once
 * the value is read (`90` is 90 seconds, shown as 1:30 when the field is left).
 */

/** Most digits the field takes: up to 99:99 (100 min 39 s). */
export const MAX_DURATION_DIGITS = 4

/** Keeps only digits, drops leading zeros, and caps the length. */
export function normalizeDurationDigits(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DURATION_DIGITS)
}

/** Seconds for a run of typed digits, read right-to-left as `mmss`. `''` → `null`. */
export function secondsFromDigits(digits: string): number | null {
  const clean = normalizeDurationDigits(digits)
  if (!clean) return null
  const seconds = Number(clean.slice(-2))
  const minutes = clean.length > 2 ? Number(clean.slice(0, -2)) : 0
  return minutes * 60 + seconds
}

/**
 * What the field shows while it's being typed in: the digits with the colon
 * put in, seconds not carried yet (`90` → `0:90`), so each key press only
 * ever adds or removes the last character.
 */
export function clockTextFromDigits(digits: string): string {
  const clean = normalizeDurationDigits(digits)
  if (!clean) return ''
  const seconds = clean.slice(-2).padStart(2, '0')
  const minutes = clean.length > 2 ? clean.slice(0, -2) : '0'
  return `${minutes}:${seconds}`
}

/** `m:ss` for a number of seconds, minutes unbounded (`3725` → `62:05`). */
export function formatDurationInput(totalSeconds: number): string {
  const seconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** The digits that type out a number of seconds, so editing picks up where the value is. */
export function digitsFromSeconds(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return ''
  return normalizeDurationDigits(formatDurationInput(totalSeconds))
}

/**
 * Reads a duration written out in full — pasted, or typed on a keyboard with
 * a colon — into seconds:
 *
 * - `m:ss` / `h:mm:ss` (`1:30` → 90, `0:05` → 5, `1:00:00` → 3600)
 * - bare digits, the same way the keypad reads them (`90` → 90, `130` → 90)
 * - the `.wtt` compact form (`1m30s`, `45s`, `2m`, `1h5m`)
 *
 * Returns `null` for anything else, including seconds or minutes past 59 in
 * a colon form (`1:75`), one-digit seconds (`1:5`) and an empty string.
 */
export function parseDurationInput(input: string): number | null {
  const value = input.trim()
  if (!value) return null

  if (/^\d+$/.test(value)) {
    const digits = value.replace(/^0+/, '')
    if (digits.length > MAX_DURATION_DIGITS) return null
    return secondsFromDigits(digits) ?? 0
  }

  const clock = /^(?:(\d+):)?(\d+):(\d{2})$/.exec(value)
  if (clock) {
    const [, h, m, s] = clock
    const hours = h === undefined ? 0 : Number(h)
    const minutes = Number(m)
    const seconds = Number(s)
    if (seconds > 59 || (h !== undefined && minutes > 59)) return null
    return hours * 3600 + minutes * 60 + seconds
  }

  const compact = /^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/i.exec(value)
  if (compact && (compact[1] || compact[2] || compact[3])) {
    return Number(compact[1] ?? 0) * 3600 + Number(compact[2] ?? 0) * 60 + Number(compact[3] ?? 0)
  }

  return null
}
