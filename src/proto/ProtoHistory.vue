<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Smartphone, X } from '@lucide/vue'
import TrainingCalendar from '@/components/session/TrainingCalendar.vue'
import { useAuthStore } from '@/stores/auth'
import { useSessionsStore } from '@/stores/sessions'
import { useExerciseName } from '@/composables/useExerciseName'
import { isSupabaseConfigured } from '@/services/supabase'
import { formatNumber, formatTimeOfDay } from '@/lib/format'
import { computeWeekStreak, toDateStr } from '@/lib/sessionStats'
import { compareSessions } from '@/lib/sessionComparisons'

/**
 * TEMPORARY — redesign Phase 1. The History tab, in the order the question
 * gets more specific:
 *   1. Am I keeping it up?  — a headline and twelve weeks of bars.
 *   2. Am I getting stronger? — the best set on the lifts you do most.
 *   3. What did I do on a given day? — the month calendar, which filters…
 *   4. …the list of workouts, grouped by month, one line of facts each.
 */
const { t, locale } = useI18n()
const sessions = useSessionsStore()
const auth = useAuthStore()
const { exerciseName } = useExerciseName()

const items = computed(() =>
  sessions.list.flatMap((stored) => {
    const result = sessions.parsed(stored.id)
    return result?.ok ? [{ stored, session: result.session }] : []
  }),
)

const dates = computed(() => items.value.map((item) => item.session.date))
const streak = computed(() => computeWeekStreak(dates.value))

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1)
}

function mondayOf(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

// ----- 1. twelve weeks -----
const WEEKS = 12

const weeks = computed(() => {
  const counts = new Map<number, number>()
  for (const dateStr of dates.value) {
    const key = mondayOf(parseDate(dateStr)).getTime()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const thisMonday = mondayOf(new Date())
  const month = new Intl.DateTimeFormat(locale.value, { month: 'short' })
  const bars = Array.from({ length: WEEKS }, (_, i) => {
    const monday = new Date(thisMonday)
    monday.setDate(thisMonday.getDate() - (WEEKS - 1 - i) * 7)
    return {
      key: monday.getTime(),
      count: counts.get(monday.getTime()) ?? 0,
      current: i === WEEKS - 1,
      // A month name under the first week that starts in it, as a time axis.
      label: monday.getDate() <= 7 ? month.format(monday).replace('.', '') : '',
      aria: `${monday.toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })}: ${counts.get(monday.getTime()) ?? 0}`,
    }
  })
  const max = Math.max(1, ...bars.map((bar) => bar.count))
  return bars.map((bar) => ({ ...bar, height: bar.count / max }))
})

const total12 = computed(() => weeks.value.reduce((sum, week) => sum + week.count, 0))

// ----- 2. best sets on the most-trained lifts -----
const records = computed(() => {
  const byExercise = new Map<
    string,
    { name: string; sessions: number; weight: number; reps: number; unit: string; date: string }
  >()
  for (const { session } of items.value) {
    for (const exercise of session.exercises) {
      const key = exercise.name.trim().toLowerCase()
      const entry = byExercise.get(key) ?? {
        name: exercise.name,
        sessions: 0,
        weight: 0,
        reps: 0,
        unit: session.unit ?? '',
        date: session.date,
      }
      entry.sessions++
      for (const set of exercise.workingSets) {
        const weight = Number(set.weight)
        const reps = Number(set.reps)
        if (weight > entry.weight || (weight === entry.weight && reps > entry.reps)) {
          Object.assign(entry, { weight, reps, unit: session.unit ?? '', date: session.date })
        }
      }
      byExercise.set(key, entry)
    }
  }
  return [...byExercise.values()]
    .filter((entry) => entry.weight > 0)
    // Most-trained first; between equally trained lifts, the heaviest.
    .sort((a, b) => b.sessions - a.sessions || b.weight - a.weight)
    .slice(0, 4)
    .map((entry) => ({
      ...entry,
      when: parseDate(entry.date).toLocaleDateString(locale.value, { month: 'short', day: 'numeric' }),
    }))
})

// ----- 3 + 4. calendar and list -----
/** A day tapped on the calendar — the list shows only its workouts until cleared. */
const selectedDate = ref<string | null>(null)

const selectedDateLabel = computed(() =>
  selectedDate.value
    ? parseDate(selectedDate.value).toLocaleDateString(locale.value, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : '',
)

/** Volume change vs. the previous logged session of the same routine. */
const volumeDeltas = computed(() => {
  const deltas = new Map<string, number>()
  for (const [i, current] of items.value.entries()) {
    const routineId = current.stored.routineId
    if (!routineId) continue
    const previous = items.value.slice(i + 1).find((item) => item.stored.routineId === routineId)
    if (!previous) continue
    const comparison = compareSessions(current.session, previous.session)
    if (comparison) deltas.set(current.stored.id, comparison.volumeDelta)
  }
  return deltas
})

const today = toDateStr(new Date())

const groups = computed(() => {
  const visible = selectedDate.value
    ? items.value.filter((item) => item.session.date === selectedDate.value)
    : items.value
  const rows = visible.map(({ stored, session }) => {
    const date = parseDate(session.date)
    const delta = volumeDeltas.value.get(stored.id) ?? 0
    return {
      id: stored.id,
      name: session.name,
      monthKey: session.date.slice(0, 7),
      monthLabel: date.toLocaleDateString(locale.value, { month: 'long', year: 'numeric' }),
      when:
        (session.date === today
          ? t('proto.today')
          : date.toLocaleDateString(locale.value, { weekday: 'short', month: 'short', day: 'numeric' })) +
        ` · ${formatTimeOfDay(stored.addedAt)}`,
      facts: [
        t('sessions.sets', { count: session.totalWorkingSets }),
        ...(session.totalVolume > 0 ? [`${formatNumber(session.totalVolume)} ${session.unit ?? ''}`.trim()] : []),
      ].join(' · '),
      delta: delta ? `${delta > 0 ? '↑' : '↓'} ${formatNumber(Math.abs(delta))}` : '',
      partial: !session.isComplete,
      // Only worth saying with an account: without one, every workout is on this device.
      deviceOnly: !!stored.localOnly && isSupabaseConfigured && auth.isLoggedIn,
    }
  })
  const byMonth = new Map<string, { label: string; rows: typeof rows }>()
  for (const row of rows) {
    const group = byMonth.get(row.monthKey) ?? { label: row.monthLabel, rows: [] }
    group.rows.push(row)
    byMonth.set(row.monthKey, group)
  }
  return [...byMonth.entries()].map(([key, group]) => ({ key, ...group }))
})
</script>

<template>
  <div class="history">
    <section class="summary">
      <h2 class="summary__headline">
        {{ t('session.streakRecap.weekInARow', { count: streak }, streak) }}
      </h2>
      <p class="summary__sub">{{ t('proto.last12', { count: total12 }, total12) }}</p>

      <div class="chart" role="img" :aria-label="t('proto.last12', { count: total12 }, total12)">
        <div v-for="week in weeks" :key="week.key" class="chart__col" :title="week.aria">
          <span class="chart__count">{{ week.count || '' }}</span>
          <span class="chart__track">
            <i
              class="chart__bar"
              :class="{ 'chart__bar--current': week.current, 'chart__bar--empty': !week.count }"
              :style="{ transform: `scaleY(${week.count ? week.height : 0.04})` }"
            />
          </span>
          <span class="chart__label">{{ week.label }}</span>
        </div>
      </div>
    </section>

    <section v-if="records.length">
      <h2 class="heading">{{ t('proto.bestSets') }}</h2>
      <ul class="plain">
        <li v-for="record in records" :key="record.name" class="record">
          <span class="record__name">{{ exerciseName(record.name) }}</span>
          <span class="record__value">{{ record.weight }} {{ record.unit }} × {{ record.reps }}</span>
          <span class="record__when">{{ record.when }}</span>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="heading">{{ t('proto.workouts') }}</h2>
      <TrainingCalendar :dates="dates" :selected="selectedDate" @select="selectedDate = $event" />

      <div v-if="selectedDate" class="filter">
        <span class="filter__label">{{ selectedDateLabel }}</span>
        <button type="button" class="filter__clear" @click="selectedDate = null">
          {{ t('sessions.showAll') }}
          <X :size="14" :stroke-width="2.5" />
        </button>
      </div>

      <div v-for="group in groups" :key="group.key" class="month">
        <h3 class="month__label">{{ group.label }}</h3>
        <ul class="plain">
          <li v-for="row in group.rows" :key="row.id">
            <RouterLink :to="`/sessions/${row.id}`" class="row">
              <span class="row__main">
                <span class="row__name">{{ row.name }}</span>
                <span class="row__meta">
                  {{ row.when }}
                  <template v-if="row.partial"> · {{ t('sessions.partial') }}</template>
                  <span v-if="row.deviceOnly" class="row__device">
                    <Smartphone :size="11" :stroke-width="2.5" /> {{ t('sessions.deviceOnly') }}
                  </span>
                </span>
              </span>
              <span class="row__side">
                <span class="row__facts">{{ row.facts }}</span>
                <span v-if="row.delta" class="row__delta">{{ row.delta }}</span>
              </span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Three text sizes, as on the other tabs: 28 (the one thing), 16, 13. */
.history {
  display: flex;
  flex-direction: column;
  gap: 28px;
  font-variant-numeric: tabular-nums;
}

.heading {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-heading);
}

.plain {
  list-style: none;
  padding: 0;
}

/* 1. The headline says it; the bars back it up. */
.summary__headline {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--color-heading);
}

.summary__sub {
  margin-top: 4px;
  font-size: 13px;
}

.chart {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 6px;
  margin-top: 18px;
}

.chart__col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.chart__count {
  height: 16px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-heading);
}

.chart__track {
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 72px;
}

.chart__bar {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 5px;
  background: var(--color-border-hover);
  transform-origin: bottom;
}

.chart__bar--empty {
  border-radius: 2px;
  background: var(--color-background-mute);
}

/* This week is the one bar still in play. */
.chart__bar--current:not(.chart__bar--empty) {
  background: var(--color-accent);
}

.chart__label {
  height: 14px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0.7;
}

/* 2. Best sets. */
.record {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0 12px;
  align-items: baseline;
  padding: 11px 0;
  border-bottom: 1px solid var(--color-border);
}

.record__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
}

.record__value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-heading);
}

.record__when {
  grid-column: 2;
  text-align: right;
  font-size: 13px;
}

/* 3 + 4. Calendar, then the list it filters. */
.filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  margin-top: 4px;
  padding: 0 4px 0 14px;
  border-radius: 14px;
  background: var(--color-background-soft);
}

.filter__label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-heading);
}

.filter__clear {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 44px;
  padding: 0 10px;
  border: none;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-heading);
  background: transparent;
  cursor: pointer;
}

.month {
  margin-top: 20px;
}

.month__label {
  font-size: 13px;
  font-weight: 600;
  text-transform: capitalize;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 64px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
  color: inherit;
}

.row__main,
.row__side {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row__side {
  flex-shrink: 0;
  align-items: flex-end;
}

.row__name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
}

.row__meta,
.row__facts {
  font-size: 13px;
}

.row__device {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
  white-space: nowrap;
}

.row__delta {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-heading);
}

@media (prefers-reduced-motion: no-preference) {
  .chart__bar {
    animation: chart-grow 0.45s var(--p-ease-out, ease-out) both;
  }
}

@keyframes chart-grow {
  from {
    transform: scaleY(0);
  }
}
</style>
