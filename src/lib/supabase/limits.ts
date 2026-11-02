/**
 * Server-side caps (see the constraints in `supabase/migrations/`)
 * that the client has to stay under, or a sync / set push would be refused
 * and retried forever.
 */

/** `routines_filename_length`. */
export const ROUTINE_FILENAME_MAX = 255

/** `routine_sections.name` allows 60 characters (20261102000005_library.sql); the editor stops short of it. */
export const SECTION_NAME_MAX = 40

/** `room_set_logs_exercise_name_length`. */
export const EXERCISE_NAME_MAX = 200

/**
 * `sessions_feed_snapshot_size` allows 64 KiB of jsonb text; the client keeps
 * well under it because Postgres' jsonb text form adds whitespace that
 * `JSON.stringify` doesn't.
 */
export const FEED_SNAPSHOT_MAX_BYTES = 32 * 1024

/**
 * Most routines one account can hold (`routines_limit_insert` in
 * 20261101080000_routine_limit.sql, which raises {@link ROUTINE_LIMIT}). The
 * app enforces it for everyone, signed in or not, so a library always fits
 * the account it signs into.
 */
export const ROUTINE_MAX = 300

/** From this many routines on, the library says how close it is to {@link ROUTINE_MAX}. */
export const ROUTINE_WARN_AT = 270

/** The error the server raises for a routine past {@link ROUTINE_MAX}. */
export const ROUTINE_LIMIT = 'routine_limit'

/** Whether a library of `count` routines has room for `adding` more. */
export function canCreateRoutine(count: number, adding = 1): boolean {
  return count + adding <= ROUTINE_MAX
}

/** How many more routines fit in a library of `count`. */
export function routinesLeft(count: number): number {
  return Math.max(0, ROUTINE_MAX - count)
}

/** Whether a library of `count` routines is close enough to the cap to say so. */
export function isNearRoutineLimit(count: number): boolean {
  return count >= ROUTINE_WARN_AT
}

export function isRoutineLimit(error: unknown): boolean {
  const message = (error as { message?: unknown } | null | undefined)?.message
  return typeof message === 'string' && message.includes(ROUTINE_LIMIT)
}

/** The error every throttled RPC (and the reports trigger) raises. */
export const RATE_LIMITED = 'rate_limited'

/** The first of `codes` that a Supabase/Postgres error message names, else `'unknown'`. */
export function rpcErrorCode<C extends string>(
  error: { message?: string } | null | undefined,
  codes: readonly C[],
): C | 'unknown' {
  const message = error?.message ?? ''
  return codes.find((code) => message.includes(code)) ?? 'unknown'
}

export function isRateLimited(error: unknown): boolean {
  const message = (error as { message?: unknown } | null | undefined)?.message
  return typeof message === 'string' && message.includes(RATE_LIMITED)
}

/** The value's JSON size in UTF-8 bytes. */
export function jsonByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value) ?? '').length
}
