<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Bell, BellOff } from '@lucide/vue'
import { useRoomStore } from '@/stores/room'
import { useAuthStore } from '@/stores/auth'
import { initials, memberColor } from '@/lib/memberColors'
import MemberSessionSheet from '@/components/social/MemberSessionSheet.vue'

const props = defineProps<{
  roomId: string
}>()

const { t } = useI18n()
const router = useRouter()
const room = useRoomStore()
const auth = useAuthStore()

onMounted(async () => {
  await auth.whenReady()
  if (auth.isLoggedIn) void room.open(props.roomId).catch(() => {})
})

function openRoom() {
  router.push({ name: 'room-lobby', params: { id: props.roomId } })
}

/** Whose workout is open in the sheet. */
const watching = ref<string | null>(null)

/** Each member's share of the team bar, in join order — contributions visible, never ranked. */
const segments = computed(() => {
  const total = room.team.total
  return room.team.segments.map((s) => ({
    userId: s.userId,
    width: total > 0 ? (s.done / total) * 100 : 0,
    color: memberColor(room.members.findIndex((m) => m.userId === s.userId)),
  }))
})

/**
 * Support for whoever the team is waiting on. Supportive, never blaming —
 * controlling pressure backfires on motivation.
 */
const teamLine = computed(() => {
  if (room.room?.status !== 'active' && !room.team.allFinished) return ''
  if (room.team.allFinished) return t('room.team.allDone')
  const last = room.lastIn
  if (!last) return ''
  if (last.userId === auth.user?.id) return t('room.team.lastIsYou')
  return last.setsLeft > 0
    ? t('room.team.lastOne', { name: last.name, count: last.setsLeft }, last.setsLeft)
    : t('room.team.lastOneFinishing', { name: last.name })
})

function onTeamLine() {
  const last = room.lastIn
  if (last && last.userId !== auth.user?.id) watching.value = last.userId
}
</script>

<template>
  <div class="strip">
    <div class="strip__row">
      <button type="button" class="strip__label" @click="openRoom">{{ t('room.progressTitle') }}</button>
      <span class="strip__members">
        <button
          v-for="(m, i) in room.progress"
          :key="m.userId"
          type="button"
          class="chip"
          :class="{ 'chip--me': m.userId === auth.user?.id, 'chip--done': m.finishedAt }"
          :aria-label="t('room.memberSession.viewAria', { name: m.displayName })"
          @click="watching = m.userId"
        >
          <span class="chip__avatar" :style="{ background: memberColor(i) }">{{ initials(m.displayName) }}</span>
          <span class="chip__count">{{ m.sets }}</span>
        </button>
      </span>
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
      <div
        class="team__bar"
        role="progressbar"
        :aria-valuenow="room.team.done"
        :aria-valuemax="room.team.total"
        :aria-label="t('room.team.title')"
      >
        <span
          v-for="s in segments"
          :key="s.userId"
          class="team__segment"
          :style="{ width: `${s.width}%`, background: s.color }"
        />
      </div>
    </div>

    <button v-if="teamLine" type="button" class="strip__line" @click="onTeamLine">
      {{ teamLine }}
    </button>
  </div>

  <MemberSessionSheet :user-id="watching" @close="watching = null" />
</template>

<style scoped>
.strip {
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
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.team__count {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.team__bar {
  display: flex;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--color-background-mute);
  overflow: hidden;
}

.team__segment {
  height: 100%;
  transition: width 0.3s ease;
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
  border: none;
  background: transparent;
  color: inherit;
  padding: 4px 0;
  cursor: pointer;
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.strip__members {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  min-width: 0;
}

.chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px 2px 2px;
  border-radius: 999px;
  background: var(--color-background-mute);
  border: 1px solid transparent;
  color: inherit;
  flex-shrink: 0;
  cursor: pointer;
}

.chip--me {
  border-color: var(--color-accent);
}

.chip--done {
  opacity: 0.6;
}

.chip__avatar {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

.chip__count {
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-heading);
}
</style>
