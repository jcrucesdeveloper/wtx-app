import type { StoredRoutine } from '@/stores/routines'
import type { StoredSession } from '@/stores/sessions'
import { parseSessionText } from '@/lib/parseSession'
import type { WorkoutSession, WorkoutSessionExercise } from '@/lib/wtx'

/** How "last time" matches names everywhere: trimmed, case-insensitive. */
function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * Finds the most recent completed session for a routine, for "last time"
 * prefill.
 *
 * Matches first by `routineId` — app metadata that's never written into the
 * `.wts` text, so it's immune to the routine being renamed or edited later.
 * Otherwise, the most recent session with the routine's name (`routineName`,
 * trimmed, case-insensitive): the same workout re-imported, copied from a
 * group room, or logged before sessions kept their routine. Sessions that
 * name the routine's file in `template:` count as that name too.
 */
export function findLastSessionForRoutine(
  sessions: StoredSession[],
  routine: StoredRoutine,
  routineName?: string,
): WorkoutSession | undefined {
  const newestFirst = [...sessions].sort((a, b) => b.addedAt - a.addedAt)

  const byId = newestFirst.find((s) => s.routineId === routine.id)
  if (byId) {
    const parsed = parseSessionText(byId.rawText)
    if (parsed.ok) return parsed.session
  }

  for (const stored of newestFirst) {
    const parsed = parseSessionText(stored.rawText)
    if (!parsed.ok) continue
    const session = parsed.session
    if (routineName?.trim() && sameName(session.name, routineName)) return session
    if (!stored.routineId && session.template === routine.filename) return session
  }
  return undefined
}

/**
 * The most recent time an exercise was logged, in any routine — matched by
 * name the way "last time" prefill matches everywhere (trimmed, case-insensitive).
 */
export function findLastLoggedExercise(
  sessions: StoredSession[],
  name: string,
): WorkoutSessionExercise | undefined {
  for (const stored of [...sessions].sort((a, b) => b.addedAt - a.addedAt)) {
    const parsed = parseSessionText(stored.rawText)
    if (!parsed.ok) continue
    const match = parsed.session.exercises.find(
      (e) => sameName(e.name, name) && e.loggedSets.length > 0,
    )
    if (match) return match
  }
  return undefined
}
