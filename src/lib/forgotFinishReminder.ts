/**
 * How long a workout runs before we ask whether the user forgot to finish it.
 * Far past any real lifting session (usually under 1.5 h, a long group one
 * 2–3 h), so it never interrupts a workout that's still going, but still the
 * same day for one left open after training.
 */
export const FORGOT_FINISH_AFTER_MS = 5 * 60 * 60 * 1000

/**
 * When the "did you forget to finish?" reminder should fire for a workout
 * started at `startedAt` (epoch ms), or `null` when it shouldn't be scheduled:
 * there's no workout, or the moment has passed — the app is open then, and
 * the workout clock already says it.
 */
export function forgotFinishReminderAt(
  startedAt: number | null | undefined,
  now: number,
): number | null {
  if (typeof startedAt !== 'number' || !Number.isFinite(startedAt)) return null
  const at = startedAt + FORGOT_FINISH_AFTER_MS
  return at > now ? at : null
}
