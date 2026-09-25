<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import { RoomError, useRoomStore } from '@/stores/room'
import { useAuthStore } from '@/stores/auth'
import { buildRoomRecap, type BestSet } from '@/lib/roomRecap'
import { initials, memberColor } from '@/lib/memberColors'
import { formatNumber } from '@/lib/format'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const room = useRoomStore()
const auth = useAuthStore()

const id = computed(() => String(route.params.id))
const loading = ref(true)
const error = ref('')

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
const recap = computed(() =>
  buildRoomRecap(
    room.members.map((m) => m.userId),
    room.setLogs,
  ),
)
const memberIndex = computed(() => new Map(room.members.map((m, i) => [m.userId, i])))

function nameOf(userId: string): string {
  return room.members.find((m) => m.userId === userId)?.displayName ?? '—'
}

function colorOf(userId: string): string {
  return memberColor(memberIndex.value.get(userId) ?? 0)
}

function formatBest(best: BestSet | null): string {
  return best ? `${formatNumber(best.weight)} ${unit.value} × ${best.reps}` : t('room.noSets')
}

/** Highest volume first, so the table reads like a podium. */
const ranked = computed(() =>
  [...recap.value.totals].sort((a, b) => b.volume - a.volume || b.sets - a.sets),
)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/social')
}
</script>

<template>
  <AppPage :title="t('room.recapTitle')">
    <template #leading>
      <button type="button" class="icon-btn" :aria-label="t('legal.back')" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>

    <p v-if="loading" class="msg">{{ t('room.loading') }}</p>
    <p v-else-if="!current" class="msg msg--error">{{ error || t('room.errors.room_not_found') }}</p>

    <div v-else class="stack">
      <p class="routine">{{ current.routine_name }}</p>

      <section class="section">
        <h2 class="section__title">{{ t('room.totals') }}</h2>
        <ul class="totals">
          <li
            v-for="total in ranked"
            :key="total.userId"
            class="total"
            :class="{ 'total--me': total.userId === auth.user?.id }"
          >
            <span class="avatar" :style="{ background: colorOf(total.userId) }">
              {{ initials(nameOf(total.userId)) }}
            </span>
            <span class="total__name">{{ nameOf(total.userId) }}</span>
            <span class="total__stat">
              <span class="total__value">{{ total.sets }}</span>
              <span class="total__label">{{ t('room.sets') }}</span>
            </span>
            <span class="total__stat">
              <span class="total__value">{{ formatNumber(total.volume) }}</span>
              <span class="total__label">{{ t('room.volume', { unit }) }}</span>
            </span>
          </li>
        </ul>
      </section>

      <section v-for="exercise in recap.exercises" :key="exercise.exercise" class="section">
        <h2 class="section__title">{{ exercise.exercise }}</h2>
        <ul class="rows">
          <li v-for="entry in exercise.entries" :key="entry.userId" class="row">
            <span class="dot" :style="{ background: colorOf(entry.userId) }" />
            <span class="row__name">{{ nameOf(entry.userId) }}</span>
            <span class="row__best">{{ formatBest(entry.best) }}</span>
            <span class="row__sets">{{ entry.sets ? t('room.setsDone', { count: entry.sets }) : '' }}</span>
          </li>
        </ul>
      </section>
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

.msg {
  padding: 48px 8px;
  text-align: center;
  font-size: 14px;
  opacity: 0.7;
}

.msg--error {
  color: #e11d48;
  opacity: 1;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.routine {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-heading);
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

.totals,
.rows {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
}

.total {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.total--me {
  border-left: 3px solid var(--color-accent);
}

.avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.total__name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.total__stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 54px;
}

.total__value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.total__label {
  font-size: 10px;
  opacity: 0.6;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  font-size: 13px;
}

.dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
}

.row__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__best {
  font-weight: 700;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.row__sets {
  min-width: 52px;
  text-align: right;
  font-size: 12px;
  opacity: 0.6;
}
</style>
