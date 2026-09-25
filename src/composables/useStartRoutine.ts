import { useRouter } from 'vue-router'
import { useRoutinesStore } from '@/stores/routines'
import { useActiveSessionStore } from '@/stores/activeSession'

/** Starts (or resumes) a routine's workout session, navigating to the active session. */
export function useStartRoutine() {
  const router = useRouter()
  const routines = useRoutinesStore()
  const activeSession = useActiveSessionStore()

  /**
   * @param opts.roomId - Logs the session in a group workout room.
   */
  function startRoutine(routineId: string, opts?: { roomId?: string }) {
    if (activeSession.isActive) {
      const current = activeSession.session
      const sameWorkout = opts?.roomId
        ? current?.roomId === opts.roomId
        : current?.routineId === routineId && !current?.roomId
      if (sameWorkout) {
        router.push({ name: 'active-session' })
        return
      }
      if (!confirm('You have a workout in progress. Discard it and start this one?')) return
      activeSession.discard()
    }

    const result = routines.parsed(routineId)
    const routine = routines.getById(routineId)
    if (!result?.ok || !routine) return

    activeSession.start(routine, result.template, opts)
    router.push({ name: 'active-session' })
  }

  return { startRoutine }
}
