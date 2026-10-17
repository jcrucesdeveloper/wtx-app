/**
 * Which exercise the focused session shows, and how that survives the list
 * being reordered under it — by the user, or by a group's host.
 */

/** The exercise the session goes to by itself: the first one not done, or the last once all are. */
export function defaultFocus<T>(exercises: readonly T[], isDone: (exercise: T) => boolean): T | undefined {
  return exercises.find((e) => !isDone(e)) ?? exercises[exercises.length - 1]
}

/**
 * What to pin after the exercise list changed order, so the exercise on
 * screen stays on screen — a set half-typed is never swapped for another
 * exercise. Returns the exercise to pin (the one picked before, or the one
 * that was on screen if the new order would otherwise move away from it),
 * or `null` when nothing needs pinning.
 */
export function focusAfterReorder<T>(
  previous: readonly T[],
  next: readonly T[],
  picked: T | null,
  isDone: (exercise: T) => boolean,
): T | null {
  if (picked && next.includes(picked)) return picked
  const shown = picked && previous.includes(picked) ? picked : defaultFocus(previous, isDone)
  if (!shown || !next.includes(shown)) return null
  return defaultFocus(next, isDone) === shown ? null : shown
}
