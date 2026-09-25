import { useActiveSessionStore } from '@/stores/activeSession'
import { useSessionsStore, type StoredSession } from '@/stores/sessions'
import { useRoutinesStore } from '@/stores/routines'
import { useSessionRecapStore } from '@/stores/sessionRecap'
import { useRoomStore } from '@/stores/room'
import { allTimeBestsByExercise, detectPersonalRecords } from '@/lib/sessionRecords'
import { compareSessions } from '@/lib/sessionComparisons'
import { detectMilestone } from '@/lib/sessionMilestones'
import { computeWeekStreak } from '@/lib/sessionStats'
import type { WorkoutSession } from '@/lib/wtx'

/** What the pre-finish review step decided — see `FinishSessionSheet`. */
export interface FinishSessionOptions {
  /** Link the session to this routine instead (a routine saved from it on finish). */
  routineIdOverride?: string
  /** Session name as saved; blank keeps the routine's name. */
  name?: string
  /** Keep the session on this device only, out of account sync. */
  localOnly?: boolean
}

/**
 * Finishes the active session and computes its celebratory recap (personal
 * records, comparison to last time, streak, milestone) for
 * `SessionCompleteView`.
 *
 * Order matters: all-time bests and the "last session for this routine"
 * lookup must be computed BEFORE calling `activeSession.finish()`, since that
 * immediately adds the new session to the log — computing them after would
 * require explicitly excluding the just-added session everywhere.
 */
export function useFinishSession() {
  const activeSession = useActiveSessionStore()
  const sessions = useSessionsStore()
  const routines = useRoutinesStore()
  const sessionRecap = useSessionRecapStore()
  const room = useRoomStore()

  function finishSession(opts: FinishSessionOptions = {}): StoredSession {
    const current = activeSession.session
    const elapsedSeconds = activeSession.elapsedSeconds
    const routine = current ? routines.getById(current.routineId) : undefined

    const previousSession = routine ? sessions.lastForRoutine(routine) : undefined
    const pastSessions = sessions.list
      .map((s) => sessions.parsed(s.id))
      .filter((r): r is { ok: true; session: WorkoutSession } => r?.ok === true)
      .map((r) => r.session)
    const priorBests = allTimeBestsByExercise(pastSessions)

    const stored = activeSession.finish(opts)
    // Fire-and-forget: tell the room this member is done (it closes once everyone is).
    if (stored.roomId) void room.finishMine(stored.roomId).catch(() => {})

    const finishedResult = sessions.parsed(stored.id)
    const finished = finishedResult?.ok ? finishedResult.session : undefined

    const personalRecords = finished ? detectPersonalRecords(finished, priorBests) : []
    const comparison = finished ? compareSessions(finished, previousSession) : undefined

    const dateStrs = sessions.list
      .map((s) => sessions.parsed(s.id))
      .map((r) => (r?.ok ? r.session.date : undefined))
      .filter((d): d is string => d !== undefined)
    const weekStreak = computeWeekStreak(dateStrs)
    const milestone = detectMilestone(sessions.list.length, weekStreak)

    sessionRecap.setRecap({
      sessionId: stored.id,
      personalRecords,
      comparison,
      milestone,
      weekStreak,
      elapsedSeconds,
    })

    return stored
  }

  return { finishSession }
}
