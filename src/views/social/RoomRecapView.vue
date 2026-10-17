<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import RoomRecapBody from '@/components/social/RoomRecapBody.vue'
import MemberSessionSheet from '@/components/social/MemberSessionSheet.vue'
import { RoomError, useRoomStore } from '@/stores/room'
import { useAuthStore } from '@/stores/auth'
import { HapticsService } from '@/services/haptics'
import { buildRoomSummary, groupCelebrationTier } from '@/lib/roomSummary'
import { clearedExercises } from '@/lib/teamProgress'
import { memberColor } from '@/lib/memberColors'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const room = useRoomStore()
const auth = useAuthStore()

const id = computed(() => String(route.params.id))
const loading = ref(true)
const error = ref('')
/** Whose workout is open in the sheet. */
const watching = ref<string | null>(null)

onMounted(async () => {
  try {
    await room.open(id.value)
  } catch (e) {
    error.value = t(`room.errors.${e instanceof RoomError ? e.code : 'unknown'}`)
  } finally {
    loading.value = false
  }
})

const current = computed(() => (room.room?.id === id.value ? room.room : null))
const unit = computed(() => current.value?.unit || 'kg')

/** Live while the room is: it follows the room's set logs and the host's order. */
const summary = computed(() =>
  buildRoomSummary({
    routine: room.routineExercises,
    members: room.members,
    logs: room.setLogs,
    startedAt: current.value?.started_at ?? null,
  }),
)

const colors = computed(() => Object.fromEntries(room.members.map((m, i) => [m.userId, memberColor(i)])))

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

const tier = computed(() => groupCelebrationTier(summary.value))
const status = computed(() => (current.value?.status === 'finished' ? 'finished' : 'active'))

/**
 * The reveal and the celebration play once per room on this device, when
 * the recap is final (everyone done, or the room over): a recap you come
 * back to just shows itself. Only a local nicety, so storage errors are fine.
 */
const SEEN_PREFIX = 'wtx:roomRecapSeen:'
const celebrate = ref(false)
let decided = false

function seen(roomId: string): boolean {
  try {
    return localStorage.getItem(SEEN_PREFIX + roomId) === '1'
  } catch {
    return false
  }
}

function markSeen(roomId: string) {
  try {
    localStorage.setItem(SEEN_PREFIX + roomId, '1')
  } catch {
    /* storage unavailable */
  }
}

watch(
  [current, () => summary.value.team.allFinished, () => room.members.length],
  () => {
    const r = current.value
    if (decided || !r || !room.members.length) return
    const final = summary.value.team.allFinished || r.status === 'finished'
    if (!final) return
    decided = true
    if (seen(r.id)) return
    markSeen(r.id)
    celebrate.value = true
    if (tier.value === 'event') {
      void HapticsService.heavy()
      setTimeout(() => void HapticsService.success(), 220)
    } else if (tier.value === 'win') {
      void HapticsService.success()
    }
  },
  { immediate: true },
)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/social')
}
</script>

<template>
  <AppPage sub fill :title="current?.routine_name ?? t('room.recapTitle')">
    <template #leading>
      <button type="button" class="icon-btn" :aria-label="t('legal.back')" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>

    <p v-if="loading" class="msg">{{ t('room.loading') }}</p>
    <p v-else-if="!current" class="msg msg--error">{{ error || t('room.errors.room_not_found') }}</p>

    <div v-else class="page">
      <RoomRecapBody
        :summary="summary"
        :colors="colors"
        :unit="unit"
        :my-id="auth.user?.id ?? null"
        :host-id="current.host_id"
        :status="status"
        :pips="pips"
        :tier="tier"
        :celebrate="celebrate"
        @select="watching = $event"
      />

      <div class="dock">
        <button type="button" class="dock__done" @click="goBack">{{ t('sessionComplete.done') }}</button>
      </div>
    </div>

    <MemberSessionSheet :user-id="watching" @close="watching = null" />
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: var(--size-touch);
  height: var(--size-touch);
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-heading);
  cursor: pointer;
  margin-left: -10px;
}

.msg {
  padding: 48px 8px;
  text-align: center;
  font-size: 14px;
  opacity: 0.7;
}

.msg--error {
  color: var(--color-danger);
  opacity: 1;
}

.page {
  display: flex;
  flex-direction: column;
  gap: 28px;
  flex: 1;
}

/* The same dock as the solo finish screen. */
.dock {
  position: sticky;
  bottom: 0;
  display: grid;
  margin: auto -20px -24px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}

.dock__done {
  height: 58px;
  border: none;
  border-radius: 16px;
  font: inherit;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-on-accent);
  background: var(--color-accent);
  cursor: pointer;
}

.dock__done:active {
  transform: scale(0.97);
}
</style>
