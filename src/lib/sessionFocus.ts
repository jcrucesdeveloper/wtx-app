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
 * screen stays on screen once it's under way — a set logged or half-typed is
 * never swapped for another exercise. One not touched yet just gives way to
 * the new order's next exercise. Returns the exercise to pin (the one picked
 * before, or the one on screen if the new order would otherwise move away
 * from it), or `null` when nothing needs pinning.
 */
export function focusAfterReorder<T>(
  previous: readonly T[],
  next: readonly T[],
  picked: T | null,
  isDone: (exercise: T) => boolean,
  isStarted: (exercise: T) => boolean,
): T | null {
  if (picked && next.includes(picked)) return picked
  const shown = defaultFocus(previous, isDone)
  if (!shown || !next.includes(shown) || !isStarted(shown)) return null
  return defaultFocus(next, isDone) === shown ? null : shown
}
