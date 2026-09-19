import type { StoredRoutine } from '@/stores/routines'
import type { StoredSession } from '@/stores/sessions'
import { parseSessionText } from '@/lib/parseSession'
import type { WorkoutSession } from '@/lib/wtx'

/**
 * Finds the most recent completed session for a routine, for "last time"
 * prefill.
 *
 * Matches primarily by `routineId` — app metadata that's never written into
 * the `.wts` text, so it's immune to the routine's filename or content
 * changing later. Falls back to the session's `template:` filename meta for
 * sessions that predate this link (hand-authored/imported `.wts` files) —
 * weaker, since filenames aren't guaranteed unique or stable, but it's the
 * best signal the format alone carries.
 */
export function findLastSessionForRoutine(
  sessions: StoredSession[],
  routine: StoredRoutine,
): WorkoutSession | undefined {
  const byId = sessions
    .filter((s) => s.routineId === routine.id)
    .sort((a, b) => b.addedAt - a.addedAt)[0]
  if (byId) {
    const parsed = parseSessionText(byId.rawText)
    if (parsed.ok) return parsed.session
  }

  const byFilename = sessions
    .filter((s) => !s.routineId)
    .map((s) => ({ addedAt: s.addedAt, parsed: parseSessionText(s.rawText) }))
    .filter(
      (x): x is { addedAt: number; parsed: { ok: true; session: WorkoutSession } } =>
        x.parsed.ok && x.parsed.session.template === routine.filename,
    )
    .sort((a, b) => b.addedAt - a.addedAt)[0]

  return byFilename?.parsed.session
}
