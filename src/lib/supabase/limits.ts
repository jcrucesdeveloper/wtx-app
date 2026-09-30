/**
 * Server-side caps (see `supabase/migrations/20261001000000_abuse_hardening.sql`)
 * that the client has to stay under, or a sync / set push would be refused
 * and retried forever.
 */

/** `routines_filename_length`. */
export const ROUTINE_FILENAME_MAX = 255

/** `room_set_logs_exercise_name_length`. */
export const EXERCISE_NAME_MAX = 200

/**
 * `sessions_feed_snapshot_size` allows 64 KiB of jsonb text; the client keeps
 * well under it because Postgres' jsonb text form adds whitespace that
 * `JSON.stringify` doesn't.
 */
export const FEED_SNAPSHOT_MAX_BYTES = 32 * 1024

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
