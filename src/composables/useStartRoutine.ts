import { useRouter } from 'vue-router'
import { useRoutinesStore } from '@/stores/routines'
import { useActiveSessionStore } from '@/stores/activeSession'

/** Starts (or resumes) a routine's workout session, navigating to the active session. */
export function useStartRoutine() {
  const router = useRouter()
  const routines = useRoutinesStore()
  const activeSession = useActiveSessionStore()

  function startRoutine(routineId: string) {
    if (activeSession.isActive) {
      if (activeSession.session?.routineId === routineId) {
        router.push({ name: 'active-session' })
        return
      }
      if (!confirm('You have a workout in progress. Discard it and start this one?')) return
      activeSession.discard()
    }

    const result = routines.parsed(routineId)
    const routine = routines.getById(routineId)
    if (!result?.ok || !routine) return

    activeSession.start(routine, result.template)
    router.push({ name: 'active-session' })
  }

  return { startRoutine }
}
