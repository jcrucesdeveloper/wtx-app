<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import RoomQrCard from '@/components/social/RoomQrCard.vue'
import RoomMemberList from '@/components/social/RoomMemberList.vue'
import { RoomError, useRoomStore } from '@/stores/room'
import { useAuthStore } from '@/stores/auth'
import { useRoutinesStore } from '@/stores/routines'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useStartRoutine } from '@/composables/useStartRoutine'
import { buildJoinUrl } from '@/lib/roomCode'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const room = useRoomStore()
const auth = useAuthStore()
const routines = useRoutinesStore()
const activeSession = useActiveSessionStore()
const { startRoutine } = useStartRoutine()

const id = computed(() => String(route.params.id))
const loading = ref(true)
const error = ref('')
const busy = ref(false)

const current = computed(() => (room.room?.id === id.value ? room.room : null))
const me = computed(() => room.members.find((m) => m.userId === auth.user?.id))
const hostName = computed(
  () => room.members.find((m) => m.userId === current.value?.host_id)?.displayName ?? t('room.theHost'),
)
const joinUrl = computed(() =>
  current.value ? buildJoinUrl(current.value.code, router.resolve({ name: 'room-join' }).href) : '',
)
const inThisWorkout = computed(() => activeSession.session?.roomId === id.value)

onMounted(async () => {
  try {
    await room.open(id.value)
  } catch (e) {
    error.value = t(`room.errors.${e instanceof RoomError ? e.code : 'unknown'}`)
  } finally {
    loading.value = false
  }
})

/** Starts (or resumes) this device's own session for the room's routine. */
function startWorkout() {
  const r = current.value
  if (!r) return
  if (inThisWorkout.value) {
    router.push({ name: 'active-session' })
    return
  }
  let routine = routines.findByText(r.routine_wtt)
  if (!routine) {
    try {
      routine = routines.add(r.routine_wtt, `${r.routine_name}.wtt`)
    } catch {
      error.value = t('room.errors.unknown')
      return
    }
  }
  startRoutine(routine.id, { roomId: r.id })
}

// Everyone jumps into the workout the moment the host starts it.
watch(
  () => current.value?.status,
  (status, prev) => {
    if (prev === 'lobby' && status === 'active' && !me.value?.finishedAt) startWorkout()
  },
)

async function onStart() {
  busy.value = true
  try {
    await room.start()
  } catch (e) {
    error.value = t(`room.errors.${e instanceof RoomError ? e.code : 'unknown'}`)
  } finally {
    busy.value = false
  }
}

async function onEnd() {
  if (!confirm(t('room.endConfirm'))) return
  try {
    await room.end()
  } catch (e) {
    error.value = t(`room.errors.${e instanceof RoomError ? e.code : 'unknown'}`)
  }
}

async function onLeave() {
  await room.leave().catch(() => {})
  router.replace('/social')
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/social')
}
</script>

<template>
  <AppPage :title="current?.routine_name ?? t('room.lobbyTitle')">
    <template #leading>
      <button type="button" class="icon-btn" :aria-label="t('legal.back')" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>

    <p v-if="loading" class="msg">{{ t('room.loading') }}</p>
    <p v-else-if="!current" class="msg msg--error">{{ error || t('room.errors.room_not_found') }}</p>

    <div v-else class="stack">
      <!-- Finished -->
      <template v-if="current.status === 'finished'">
        <div class="banner">
          <p class="banner__title">{{ t('room.finishedTitle') }}</p>
        </div>
        <button type="button" class="primary" @click="router.push({ name: 'room-recap', params: { id } })">
          {{ t('room.viewRecap') }}
        </button>
      </template>

      <!-- Lobby / active -->
      <template v-else>
        <RoomQrCard
          v-if="current.status === 'lobby'"
          :code="current.code"
          :join-url="joinUrl"
          :routine-name="current.routine_name"
        />

        <template v-if="current.status === 'lobby'">
          <button v-if="room.isHost" type="button" class="primary" :disabled="busy" @click="onStart">
            {{ busy ? t('room.starting') : t('room.start') }}
          </button>
          <p v-else class="waiting">{{ t('room.waitingForHost', { name: hostName }) }}</p>
        </template>

        <template v-else>
          <button v-if="!me?.finishedAt" type="button" class="primary" @click="startWorkout">
            {{ t('room.goToWorkout') }}
          </button>
          <button v-else type="button" class="primary" @click="router.push({ name: 'room-recap', params: { id } })">
            {{ t('room.viewRecap') }}
          </button>
        </template>
      </template>

      <p v-if="error" class="msg msg--error">{{ error }}</p>

      <section class="section">
        <h2 class="section__title">{{ t('room.members', { count: room.members.length }) }}</h2>
        <RoomMemberList
          :members="room.progress"
          :host-id="current.host_id"
          :my-id="auth.user?.id ?? null"
          :show-progress="current.status !== 'lobby'"
        />
      </section>

      <RoomQrCard
        v-if="current.status === 'active'"
        :code="current.code"
        :join-url="joinUrl"
        :routine-name="current.routine_name"
      />

      <div v-if="current.status !== 'finished'" class="footer">
        <button v-if="room.isHost && current.status === 'active'" type="button" class="danger" @click="onEnd">
          {{ t('room.end') }}
        </button>
        <button type="button" class="ghost" @click="onLeave">{{ t('room.leave') }}</button>
      </div>
    </div>
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  margin-left: -4px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.msg {
  padding: 48px 8px;
  text-align: center;
  font-size: 14px;
  opacity: 0.7;
}

.msg--error {
  padding: 0;
  color: #e11d48;
  opacity: 1;
}

.banner {
  padding: 18px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
}

.banner__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-heading);
}

.waiting {
  text-align: center;
  font-size: 14px;
  opacity: 0.75;
  padding: 6px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section__title {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.primary,
.danger,
.ghost {
  border: none;
  border-radius: var(--radius-md);
  padding: 14px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  cursor: pointer;
}

.primary {
  color: #fff;
  background: var(--color-accent);
}

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.danger {
  color: #fff;
  background: #e11d48;
}

.ghost {
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border-hover);
}

.footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
</style>
