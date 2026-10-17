import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoomStore } from '@/stores/room'
import { useAuthStore } from '@/stores/auth'
import { memberColor } from '@/lib/memberColors'
import type { Face } from '@/components/social/MemberFacepile.vue'

/**
 * The current room's team as the group screens show it: faces with each
 * member's share of the plan, and the one supportive line about whoever
 * the team is waiting on. Shared by the live strip and the finish card.
 */
export function useRoomTeam() {
  const { t } = useI18n()
  const room = useRoomStore()
  const auth = useAuthStore()

  /** In join order, never sorted: contributions visible, never ranked. */
  const faces = computed<Face[]>(() => {
    const planned = room.team.plannedPerMember
    return room.progress.map((m, i) => {
      const done = room.team.segments[i]?.done ?? 0
      return {
        userId: m.userId,
        name: m.displayName,
        color: memberColor(i),
        progress: planned > 0 ? done / planned : undefined,
        online: room.room?.status === 'active' ? m.online : undefined,
        done: !!m.finishedAt,
      }
    })
  })

  const segments = computed(() =>
    room.team.segments.map((s, i) => ({ userId: s.userId, done: s.done, color: memberColor(i) })),
  )

  /**
   * Support for whoever the team is waiting on. Supportive, never blaming:
   * controlling pressure backfires on motivation.
   */
  const line = computed(() => {
    if (room.room?.status !== 'active' && !room.team.allFinished) return ''
    if (room.team.allFinished) return t('room.team.allDone')
    const last = room.lastIn
    if (!last) return ''
    if (last.userId === auth.user?.id) return t('room.team.lastIsYou')
    return last.setsLeft > 0
      ? t('room.team.lastOne', { name: last.name, count: last.setsLeft }, last.setsLeft)
      : t('room.team.lastOneFinishing', { name: last.name })
  })

  /** Whose workout the line is about, if it's someone else's (tapping it opens theirs). */
  const lineMember = computed(() => {
    const last = room.lastIn
    return last && last.userId !== auth.user?.id && !room.team.allFinished ? last.userId : null
  })

  return { faces, segments, line, lineMember }
}
