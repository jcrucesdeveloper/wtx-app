/**
 * Convention for logging time-based exercises into `.wts`, whose
 * `SessionExercise` schema has no distinct time kind (always sets/reps/weight).
 * Actual seconds held go into the `reps` field, and the exercise's `note`
 * field carries this marker so a re-parsed session can tell a `reps`-kind
 * exercise from a `time`-kind one. A hand-written note that happens to start
 * with "time" would misread as the marker on re-parse — an accepted, narrow
 * edge case, not fixable without changing the vendored `.wts` grammar.
 */
const TIME_MARKER = 'time'

/** Builds the `note` field to write for a time-based exercise. */
export function withTimeMarker(userNote: string | undefined): string {
  const trimmed = userNote?.trim()
  return trimmed ? `${TIME_MARKER}; ${trimmed}` : TIME_MARKER
}

/** Whether a parsed exercise's `note` carries the time-based marker. */
export function isTimeExercise(note: string | undefined): boolean {
  return note === TIME_MARKER || (note?.startsWith(`${TIME_MARKER}; `) ?? false)
}

/** Strips the time-based marker back off, leaving the user's original note. */
export function displayNote(note: string | undefined): string {
  if (!note) return ''
  if (note === TIME_MARKER) return ''
  if (note.startsWith(`${TIME_MARKER}; `)) return note.slice(TIME_MARKER.length + 2)
  return note
}
