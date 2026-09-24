<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Flame } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import { useSessionsStore } from '@/stores/sessions'
import { useActiveSessionStore } from '@/stores/activeSession'
import { formatClock, formatNumber, formatTimeOfDay } from '@/lib/format'
import {
  formatSessionDate,
  recencyGroup,
  computeWeekStreak,
  recentWeeksActivity,
  type RecencyGroup,
} from '@/lib/sessionStats'
import { compareSessions } from '@/lib/sessionComparisons'

const { t } = useI18n()
const sessions = useSessionsStore()
const activeSession = useActiveSessionStore()

const items = computed(() =>
  sessions.list.map((session) => ({ session, result: sessions.parsed(session.id) })),
)

const sessionDates = computed(() =>
  items.value
    .map((item) => (item.result?.ok ? item.result.session.date : undefined))
    .filter((d): d is string => d !== undefined),
)

const weekStreak = computed(() => computeWeekStreak(sessionDates.value))
const recentWeeks = computed(() => recentWeeksActivity(sessionDates.value))

const RECENCY_ORDER: RecencyGroup[] = ['This week', 'Last week', 'Earlier']

const RECENCY_LABEL_KEYS: Record<RecencyGroup, string> = {
  'This week': 'sessions.groupThisWeek',
  'Last week': 'sessions.groupLastWeek',
  Earlier: 'sessions.groupEarlier',
}

const groupedItems = computed(() => {
  const buckets = new Map<RecencyGroup, typeof items.value>()
  for (const item of items.value) {
    const dateStr = item.result?.ok ? item.result.session.date : undefined
    const label: RecencyGroup = dateStr ? recencyGroup(dateStr) : 'Earlier'
    const bucket = buckets.get(label) ?? []
    bucket.push(item)
    buckets.set(label, bucket)
  }
  return RECENCY_ORDER.map((label) => ({ label, items: buckets.get(label) ?? [] })).filter(
    (group) => group.items.length > 0,
  )
})

/** Volume change vs. the previous logged session of the same routine. */
const volumeDeltas = computed(() => {
  const deltas = new Map<string, number>()
  const flat = items.value

  for (const [i, current] of flat.entries()) {
    if (!current.result?.ok) continue
    const routineId = current.session.routineId
    if (!routineId) continue

    const prev = flat
      .slice(i + 1)
      .find((item) => item.session.routineId === routineId && item.result?.ok)
    if (!prev?.result?.ok) continue

    const comparison = compareSessions(current.result.session, prev.result.session)
    if (!comparison) continue
    deltas.set(current.session.id, comparison.volumeDelta)
  }

  return deltas
})
</script>

<template>
  <AppPage :title="t('sessions.title')">
    <RouterLink v-if="activeSession.isActive" to="/sessions/active" class="resume">
      <span class="resume__label">{{ t('sessions.continueWorkout') }}</span>
      <span class="resume__name">{{ activeSession.session?.draft.name }}</span>
      <span class="resume__time">{{ formatClock(activeSession.elapsedSeconds) }}</span>
    </RouterLink>

    <div v-if="items.length" class="consistency">
      <div class="consistency__row">
        <div class="consistency__streak">
          <Flame
            :size="20"
            :stroke-width="2.25"
            class="consistency__flame"
            :class="{ 'consistency__flame--active': weekStreak > 0 }"
          />
          <template v-if="weekStreak > 0">
            <span class="consistency__streak-value">{{ weekStreak }}</span>
            <span class="consistency__streak-label">{{
              t('sessions.weekStreak', { count: weekStreak }, weekStreak)
            }}</span>
          </template>
          <span v-else class="consistency__streak-label">{{ t('sessions.trainThisWeek') }}</span>
        </div>
        <div class="consistency__weeks">
          <span
            v-for="(week, i) in recentWeeks"
            :key="i"
            class="consistency__week"
            :class="{
              'consistency__week--active': week.active,
              'consistency__week--current': week.isCurrent,
            }"
          />
        </div>
      </div>
      <span class="consistency__weeks-caption">{{
        t('sessions.lastNWeeks', { count: recentWeeks.length })
      }}</span>
    </div>

    <div v-if="!items.length" class="empty">
      <p class="empty__title">{{ t('sessions.noSessionsTitle') }}</p>
      <p class="empty__hint">{{ t('sessions.noSessionsHint') }}</p>
    </div>

    <div v-else class="groups">
      <section v-for="group in groupedItems" :key="group.label" class="group">
        <h2 class="group__label">{{ t(RECENCY_LABEL_KEYS[group.label]) }}</h2>
        <ul class="list">
          <li v-for="{ session, result } in group.items" :key="session.id">
            <RouterLink :to="`/sessions/${session.id}`" class="row">
              <div class="row__top">
                <span class="row__name">{{
                  result?.ok ? result.session.name : session.filename
                }}</span>
                <span
                  class="row__status"
                  :class="{ 'row__status--done': result?.ok && result.session.isComplete }"
                >
                  {{
                    result?.ok
                      ? result.session.isComplete
                        ? t('sessions.done')
                        : t('sessions.partial')
                      : t('sessions.error')
                  }}
                </span>
              </div>

              <div class="row__meta">
                <span class="row__date">{{
                  result?.ok ? formatSessionDate(result.session.date) : '—'
                }}</span>
                <span class="row__time">{{ formatTimeOfDay(session.addedAt) }}</span>
              </div>

              <div v-if="result?.ok" class="row__stats">
                <span class="chip">{{ t('sessions.exercises', { count: result.session.exerciseCount }) }}</span>
                <span class="chip">{{ t('sessions.sets', { count: result.session.totalWorkingSets }) }}</span>
                <span v-if="result.session.totalVolume > 0" class="chip">
                  {{ formatNumber(result.session.totalVolume) }} {{ result.session.unit }}
                </span>
                <span
                  v-if="volumeDeltas.get(session.id)"
                  class="chip"
                  :class="volumeDeltas.get(session.id)! > 0 ? 'chip--up' : 'chip--down'"
                >
                  {{ volumeDeltas.get(session.id)! > 0 ? '▲' : '▼' }}
                  {{ formatNumber(Math.abs(volumeDeltas.get(session.id)!)) }}
                </span>
              </div>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>
  </AppPage>
</template>

<style scoped>
.resume {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  margin-bottom: 12px;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: #fff;
  text-decoration: none;
}

.resume__label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.85;
}

.resume__name {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume__time {
  margin-left: auto;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  opacity: 0.9;
}

.consistency {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  margin-bottom: 16px;
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.consistency__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.consistency__streak {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.consistency__flame {
  flex-shrink: 0;
  color: var(--color-text);
  opacity: 0.35;
}

.consistency__flame--active {
  color: var(--color-accent);
  opacity: 1;
}

.consistency__streak-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.consistency__streak-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.consistency__weeks {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.consistency__week {
  width: 10px;
  height: 20px;
  border-radius: var(--radius-xs);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
}

.consistency__week--active {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.consistency__week--current {
  box-shadow:
    0 0 0 2px var(--color-background-soft),
    0 0 0 3px var(--color-border-hover);
}

.consistency__weeks-caption {
  align-self: flex-end;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.45;
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.group__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.55;
  margin-bottom: 8px;
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 13px 14px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  text-decoration: none;
  color: inherit;
}

.row__top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.row__meta {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: -4px;
}

.row__date {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.row__time {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.45;
  font-variant-numeric: tabular-nums;
}

.row__name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__status {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 3px 6px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-xs);
  opacity: 0.7;
}

.row__status--done {
  color: var(--color-accent);
  border-color: var(--color-accent);
  opacity: 1;
}

.row__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: var(--radius-xs);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.chip--up {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.chip--down {
  color: #e11d48;
  border-color: #e11d48;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 64px 24px;
  text-align: center;
}

.empty__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-heading);
}

.empty__hint {
  font-size: 13px;
  opacity: 0.7;
}
</style>
