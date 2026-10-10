<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Award, Check, Share2 } from '@lucide/vue'
import ProtoWeekStrip from './ProtoWeekStrip.vue'
import type { WorkoutSession } from '@/lib/wtx'
import type { SessionRecap } from '@/stores/sessionRecap'
import { useSessionsStore } from '@/stores/sessions'
import { useExerciseName } from '@/composables/useExerciseName'
import { formatClock, formatNumber } from '@/lib/format'
import { sessionDateStrs } from '@/lib/sessionDates'

/**
 * TEMPORARY — redesign Phase 1. The finish screen as one statement and then
 * its supporting facts, in a fixed order: the best thing that happened, the
 * numbers, your week, what you did. The reveal is a CSS stagger (`--i` is
 * each block's place in it), so reduced motion needs no second code path.
 */
const props = defineProps<{
  session: WorkoutSession
  recap: SessionRecap | null
}>()

const emit = defineEmits<{ done: []; share: [] }>()

const { t } = useI18n()
const { exerciseName } = useExerciseName()
const sessions = useSessionsStore()

const unit = computed(() => props.session.unit ?? '')
const topPr = computed(() => props.recap?.personalRecords[0])
const streak = computed(() => props.recap?.weekStreak ?? 0)
const dateStrs = computed(() => sessionDateStrs(sessions))

/** How far the record moved, e.g. "2.5". Empty when there's no earlier weight to compare. */
const prDelta = computed(() => {
  const pr = topPr.value
  if (!pr || !pr.previousWeight || pr.weight <= pr.previousWeight) return ''
  return String(Math.round((pr.weight - pr.previousWeight) * 100) / 100)
})

const volume = computed(() =>
  props.session.totalVolume > 0 ? formatNumber(props.session.totalVolume) : '',
)

const stats = computed(() => [
  ...(props.recap
    ? [{ value: formatClock(props.recap.elapsedSeconds), label: t('sessionComplete.time') }]
    : []),
  { value: String(props.session.totalWorkingSets), label: t('sessionComplete.sets') },
  // With a record as the headline, volume drops down here; otherwise it is the headline.
  topPr.value && volume.value
    ? { value: volume.value, label: t('sessionComplete.volumeUnit', { unit: unit.value }) }
    : { value: String(props.session.exerciseCount), label: t('sessionComplete.exercises') },
])

const comparison = computed(() => {
  const c = props.recap?.comparison
  if (!c) return undefined
  return {
    up: c.isVolumeUp,
    text: t(c.isVolumeUp ? 'sessionComplete.moreVolume' : 'sessionComplete.lessVolume', {
      value: formatNumber(Math.abs(c.volumeDelta)),
      unit: unit.value,
    }),
  }
})

const milestone = computed(() => {
  const m = props.recap?.milestone
  if (!m) return ''
  return t(
    m.kind === 'total-sessions'
      ? 'sessionComplete.milestoneSessions'
      : 'sessionComplete.milestoneStreak',
    { count: m.count },
  )
})

/** Looks forward to the next week instead of warning about losing this one. */
const streakNote = computed(() =>
  streak.value <= 1 ? t('proto.firstWeek') : t('proto.streakNext', { count: streak.value }),
)

const prNames = computed(
  () => new Set((props.recap?.personalRecords ?? []).map((pr) => pr.exerciseName.trim().toLowerCase())),
)

/** One line per exercise: its heaviest set. */
const lines = computed(() =>
  props.session.exercises.map((exercise) => {
    const best = exercise.loggedSets.reduce<{ weight: number; reps: number } | null>(
      (top, set) =>
        !top || Number(set.weight) > top.weight
          ? { weight: Number(set.weight), reps: Number(set.reps) }
          : top,
      null,
    )
    return {
      name: exerciseName(exercise.name),
      sets: exercise.workingSets.length,
      best: best ? `${best.weight} ${unit.value} × ${best.reps}` : '',
      isPr: prNames.value.has(exercise.name.trim().toLowerCase()),
    }
  }),
)
</script>

<template>
  <div class="finish">
    <section class="hero">
      <span class="hero__badge land" style="--i: 0"><Check :size="22" :stroke-width="3" /></span>

      <template v-if="topPr">
        <p class="hero__label hero__label--accent rise" style="--i: 1">
          {{ t('session.personalRecordBanner.title') }}
        </p>
        <p class="hero__value rise" style="--i: 2">
          {{ topPr.weight }}<small>{{ unit }}</small>
          <span class="hero__reps">× {{ topPr.reps }}</span>
        </p>
        <p class="hero__sub rise" style="--i: 3">
          {{ exerciseName(topPr.exerciseName) }}
          <template v-if="prDelta"> · {{ t('proto.overBest', { value: prDelta, unit }) }}</template>
        </p>
      </template>
      <template v-else>
        <p class="hero__label rise" style="--i: 1">{{ t('sessionComplete.workoutComplete') }}</p>
        <p class="hero__value rise" style="--i: 2">
          <template v-if="volume">{{ volume }}<small>{{ unit }}</small></template>
          <template v-else>{{ session.totalWorkingSets }}<small>{{ t('sessionComplete.sets') }}</small></template>
        </p>
        <p v-if="volume" class="hero__sub rise" style="--i: 3">{{ t('proto.lifted') }}</p>
      </template>
    </section>

    <section class="rise" style="--i: 4">
      <div class="stats">
        <div v-for="stat in stats" :key="stat.label" class="stats__item">
          <span class="stats__value">{{ stat.value }}</span>
          <span class="stats__label">{{ stat.label }}</span>
        </div>
      </div>
      <p v-if="comparison" class="compare">
        <span v-if="comparison.up" class="compare__up">↑</span> {{ comparison.text }}
      </p>
    </section>

    <section v-if="recap" class="card rise" style="--i: 5">
      <ProtoWeekStrip :date-strs="dateStrs" />
      <div class="card__text">
        <span class="card__title">{{ t('session.streakRecap.weekInARow', { count: streak }, streak) }}</span>
        <span class="card__note">{{ streakNote }}</span>
      </div>
      <p v-if="milestone" class="milestone">
        <Award :size="18" :stroke-width="2.25" /> {{ milestone }}
      </p>
    </section>

    <section class="rise" style="--i: 6">
      <h2 class="label">{{ t('proto.whatYouDid') }}</h2>
      <ul class="list">
        <li v-for="(line, i) in lines" :key="i" class="line">
          <span class="line__name">
            {{ line.name }}
            <span v-if="line.isPr" class="line__pr">PR</span>
          </span>
          <span class="line__best">{{ line.best }}</span>
          <span class="line__sets">{{ t('sessions.sets', { count: line.sets }) }}</span>
        </li>
      </ul>
    </section>

    <div class="dock">
      <button type="button" class="dock__share share-btn" @click="emit('share')">
        <Share2 :size="18" :stroke-width="2.25" /> {{ t('proto.share') }}
      </button>
      <button type="button" class="dock__done done-btn" @click="emit('done')">
        {{ t('sessionComplete.done') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.finish {
  display: flex;
  flex-direction: column;
  gap: 28px;
  flex: 1;
  font-variant-numeric: tabular-nums;
}

.label {
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.6;
}

/* One statement. */
.hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-top: 12px;
}

.hero__badge {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-bottom: 20px;
  border-radius: 50%;
  color: var(--p-on-accent);
  background: var(--color-accent);
}

.hero__label {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hero__label--accent {
  color: var(--color-heading);
}

.hero__value {
  font-size: 68px;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.04em;
  color: var(--color-heading);
}

.hero__value small {
  margin-left: 6px;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--color-text);
}

.hero__reps {
  margin-left: 10px;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.hero__sub {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
}

/* Its supporting numbers: one row, divided by hairlines, not boxes. */
.stats {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.stats__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 0 14px 16px;
}

.stats__item:first-child {
  padding-left: 0;
}

.stats__item + .stats__item {
  border-left: 1px solid var(--color-border);
}

.stats__value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--color-heading);
}

.stats__label {
  font-size: 13px;
}

.compare {
  margin-top: 12px;
  font-size: 14px;
}

.compare__up {
  font-weight: 800;
  color: var(--color-heading);
}

/* Your week. */
.card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 12px;
  border-radius: 16px;
  background: var(--color-background-soft);
}

.card__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 4px;
}

.card__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-heading);
}

.card__note {
  font-size: 14px;
}

.milestone {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 4px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

/* What you did. */
.list {
  list-style: none;
  padding: 0;
  border-radius: 16px;
  background: var(--color-background-soft);
}

.line {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2px 12px;
  padding: 12px 16px;
}

.line + .line {
  border-top: 1px solid var(--color-border);
}

.line__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-heading);
}

.line__pr {
  margin-left: 6px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: var(--p-on-accent);
  background: var(--color-accent);
}

.line__best {
  grid-row: span 2;
  align-self: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

.line__sets {
  font-size: 13px;
}

.dock {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  margin: auto -20px -24px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}

.dock button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 58px;
  border: none;
  border-radius: 16px;
  font: inherit;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
}

.dock button:active {
  transform: scale(0.97);
}

.dock__share {
  padding: 0 20px;
  color: var(--color-heading);
  background: var(--color-background-mute);
}

.dock__done {
  color: var(--p-on-accent);
  background: var(--color-accent);
}

/* The staged reveal: the badge lands, then each block rises into place in order. */
@media (prefers-reduced-motion: no-preference) {
  .rise {
    animation: finish-rise 0.32s var(--p-ease-out) both;
    animation-delay: calc(var(--i, 0) * 80ms + 80ms);
  }

  .land {
    animation: finish-land 0.42s var(--p-spring) both;
  }
}

@keyframes finish-rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes finish-land {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
