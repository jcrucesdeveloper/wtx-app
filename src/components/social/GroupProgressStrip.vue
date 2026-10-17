<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Bell, BellOff, ChevronRight } from '@lucide/vue'
import { useRoomStore } from '@/stores/room'
import { useAuthStore } from '@/stores/auth'
import { useRoomTeam } from '@/composables/useRoomTeam'
import { clearedExercises } from '@/lib/teamProgress'
import MemberFacepile from '@/components/social/MemberFacepile.vue'
import TeamBar from '@/components/social/TeamBar.vue'
import MemberSessionSheet from '@/components/social/MemberSessionSheet.vue'

const props = defineProps<{
  roomId: string
}>()

const { t } = useI18n()
const router = useRouter()
const room = useRoomStore()
const auth = useAuthStore()
const { faces, segments, line, lineMember } = useRoomTeam()

onMounted(async () => {
  await auth.whenReady()
  if (auth.isLoggedIn) void room.open(props.roomId).catch(() => {})
})

function openRoom() {
  router.push({ name: 'room-lobby', params: { id: props.roomId } })
}

/** Whose workout is open in the sheet. */
const watching = ref<string | null>(null)

/** The routine's exercises in the host's order, filled once everyone has cleared one. */
const pips = computed(() => {
  const cleared = new Set(
    clearedExercises(
      room.routineExercises,
      room.members.map((m) => m.userId),
      room.setLogs,
    ),
  )
  return room.routineExercises.map((e) => ({ name: e.name, cleared: cleared.has(e.name) }))
})

function onTeamLine() {
  if (lineMember.value) watching.value = lineMember.value
}
</script>

<template>
  <div class="strip">
    <div class="strip__row">
      <!-- The way into the room from a workout: it has to look like one. -->
      <button type="button" class="strip__label" :aria-label="t('room.openRoomAria')" @click="openRoom">
        {{ t('room.progressTitle') }}
        <ChevronRight :size="14" :stroke-width="2.5" />
      </button>
      <MemberFacepile class="strip__members" :faces="faces" :size="26" :max="6" selectable @select="watching = $event" />
      <button
        type="button"
        class="strip__mute"
        :aria-label="room.muted ? t('room.team.unmuteAria') : t('room.team.muteAria')"
        :aria-pressed="room.muted"
        @click="room.muted = !room.muted"
      >
        <BellOff v-if="room.muted" :size="16" :stroke-width="2.25" />
        <Bell v-else :size="16" :stroke-width="2.25" />
      </button>
    </div>

    <div v-if="room.team.total > 0" class="team">
      <div class="team__head">
        <span class="team__label">{{ t('room.team.title') }}</span>
        <span class="team__count">{{ t('room.team.sets', { done: room.team.done, total: room.team.total }) }}</span>
      </div>
      <TeamBar :segments="segments" :total="room.team.total" :exercises="pips" />
    </div>

    <button v-if="line" type="button" class="strip__line" @click="onTeamLine">
      {{ line }}
    </button>
  </div>

  <MemberSessionSheet :user-id="watching" @close="watching = null" />
</template>

<style scoped>
.strip {
  --facepile-edge: var(--color-background-soft);
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
  background: var(--color-background-soft);
}

.strip__row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.strip__mute {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-left: auto;
  padding: 4px;
  border: none;
  background: transparent;
  color: var(--color-text);
  opacity: 0.6;
  cursor: pointer;
}

.team {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.team__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.team__label {
  font-size: var(--text-small);
  font-weight: 700;
  opacity: 0.6;
}

.team__count {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}



.strip__line {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--color-heading);
  padding: 0;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.strip__label {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 32px;
  border: none;
  background: transparent;
  color: var(--color-heading);
  padding: 4px 0;
  cursor: pointer;
  font-size: var(--text-small);
  font-weight: 700;
}

.strip__members {
  min-width: 0;
  /* Room for the ring and the cut-out around each face. */
  padding: 3px 0 3px 3px;
}
</style>
