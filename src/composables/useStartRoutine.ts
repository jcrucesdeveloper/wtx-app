import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useRoutinesStore } from '@/stores/routines'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useRoomStore } from '@/stores/room'
import { isConflict, startVerdict } from '@/lib/workoutConflict'
import { HapticsService } from '@/services/haptics'

/** Starts (or resumes) a routine's workout session, navigating to the active session. */
export function useStartRoutine() {
  const { t } = useI18n()
  const router = useRouter()
  const routines = useRoutinesStore()
  const activeSession = useActiveSessionStore()
  const room = useRoomStore()

  /**
   * One workout at a time, whether on your own or in a group: this is the one
   * place a workout starts, so it is where that is decided.
   *
   * @param opts.roomId - Logs the session in a group workout room.
   */
  function startRoutine(routineId: string, opts?: { roomId?: string }) {
    const verdict = startVerdict(
      { session: activeSession.session, openRoomId: room.openRoomId },
      opts?.roomId ? { kind: 'group', roomId: opts.roomId } : { kind: 'solo', routineId },
    )
    if (verdict === 'resume') {
      router.push({ name: 'active-session' })
      return
    }
    if (isConflict(verdict)) {
      alert(t(`room.errors.${verdict}`))
      return
    }
    if (verdict === 'replace') {
      if (!confirm(t('workout.replaceConfirm'))) return
      activeSession.discard()
    }

    const result = routines.parsed(routineId)
    const routine = routines.getById(routineId)
    if (!result?.ok || !routine) return

    activeSession.start(routine, result.template, opts)
    // Starting is a commitment worth feeling; the workout screen does the rest.
    void HapticsService.medium()
    router.push({ name: 'active-session' })
  }

  return { startRoutine }
}
