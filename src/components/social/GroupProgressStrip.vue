<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useRoomStore } from '@/stores/room'
import { useAuthStore } from '@/stores/auth'
import { initials, memberColor } from '@/lib/memberColors'

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
</script>

<template>
  <button type="button" class="strip" :aria-label="t('room.progressTitle')" @click="openRoom">
    <span class="strip__label">{{ t('room.progressTitle') }}</span>
    <span class="strip__members">
      <span
        v-for="(m, i) in room.progress"
        :key="m.userId"
        class="chip"
        :class="{ 'chip--me': m.userId === auth.user?.id, 'chip--done': m.finishedAt }"
      >
        <span class="chip__avatar" :style="{ background: memberColor(i) }">{{ initials(m.displayName) }}</span>
        <span class="chip__count">{{ m.sets }}</span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.strip {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
  background: var(--color-background-soft);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.strip__label {
  flex-shrink: 0;
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
  flex-shrink: 0;
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
