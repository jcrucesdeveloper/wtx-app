<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Award, Check, Share2, Trophy } from '@lucide/vue'
import WeekStrip from './WeekStrip.vue'
import type { WorkoutSession } from '@/lib/wtx'
import type { SessionRecap } from '@/stores/sessionRecap'
import { useSessionsStore } from '@/stores/sessions'
import { useExerciseName } from '@/composables/useExerciseName'
import { formatClock, formatNumber } from '@/lib/format'
import { sessionDateStrs } from '@/lib/sessionDates'
import { celebrationTier } from '@/lib/celebration'
import { PLATE_COLORS } from '@/lib/plateLevel'
import { usePlateLabels } from '@/composables/usePlateLabels'

/**
 * The finish screen as one statement and then
 * its supporting facts, in a fixed order: the best thing that happened, the
 * numbers, your week, what you did. The reveal is a CSS stagger (`--i` is
 * each block's place in it), so reduced motion needs no second code path.
 *
 * How loud it is depends on what happened (see `celebrationTier`): most
 * finishes are calm, a record lands with weight, and a rare moment — a new
 * plate, a year of weeks — gets the burst.
 */
const props = defineProps<{
  session: WorkoutSession
  recap: SessionRecap | null
  /** Set when this workout was part of a group one, which has its own recap. */
  roomId?: string
  /** The share text went to the clipboard (where there is no share sheet). */
  shareCopied?: boolean
}>()

const emit = defineEmits<{ done: []; share: []; recap: [] }>()

const { t } = useI18n()
const { exerciseName } = useExerciseName()
const { plateTitle } = usePlateLabels()
const sessions = useSessionsStore()

const unit = computed(() => props.session.unit ?? '')
const topPr = computed(() => props.recap?.personalRecords[0])
const streak = computed(() => props.recap?.weekStreak ?? 0)

const tier = computed(() =>
  celebrationTier({
    personalRecords: props.recap?.personalRecords.length ?? 0,
    milestone: props.recap?.milestone,
    plateUp: !!props.recap?.plateUp,
  }),
)

const plateUp = computed(() => props.recap?.plateUp)
const plateColor = computed(() => (plateUp.value ? PLATE_COLORS[plateUp.value.kg] : null))

/**
 * Sparks from the badge, for the rare finish. The badge sits at the left edge,
 * so they fan up and to the right, where there is room to see them.
 */
const BURST = Array.from({ length: 11 }, (_, i) => i * 16)
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
  // The same volume as last time is not worth a line.
  if (!c || c.volumeDelta === 0) return undefined
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
  streak.value <= 1 ? t('finish.firstWeek') : t('finish.streakNext', { count: streak.value }),
)

const prNames = computed(
  () =>
    new Set((props.recap?.personalRecords ?? []).map((pr) => pr.exerciseName.trim().toLowerCase())),
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
  <div class="finish" :class="`finish--${tier}`">
    <section class="hero">
      <span v-if="tier === 'event'" class="burst" aria-hidden="true">
        <i v-for="angle in BURST" :key="angle" :style="{ '--a': `${angle}deg` }" />
      </span>
      <span class="hero__badge land" style="--i: 0">
        <Trophy v-if="topPr" :size="22" :stroke-width="2.5" />
        <Check v-else :size="22" :stroke-width="3" />
      </span>

      <template v-if="topPr">
        <p class="hero__label hero__label--accent rise" style="--i: 1">
          {{ t('session.personalRecordBanner.title') }}
        </p>
        <p class="hero__value punch" style="--i: 2">
          {{ topPr.weight }}<small>{{ unit }}</small>
          <span class="hero__reps">× {{ topPr.reps }}</span>
        </p>
        <p class="hero__sub rise" style="--i: 3">
          {{ exerciseName(topPr.exerciseName) }}
          <template v-if="prDelta">
            · {{ t('finish.overBest', { value: prDelta, unit }) }}</template
          >
        </p>
      </template>
      <template v-else>
        <p class="hero__label rise" style="--i: 1">{{ t('sessionComplete.workoutComplete') }}</p>
        <p class="hero__value rise" style="--i: 2">
          <template v-if="volume"
            >{{ volume }}<small>{{ unit }}</small></template
          >
          <template v-else
            >{{ session.totalWorkingSets }}<small>{{ t('sessionComplete.sets') }}</small></template
          >
        </p>
        <p v-if="volume" class="hero__sub rise" style="--i: 3">{{ t('finish.lifted') }}</p>
      </template>
    </section>

    <!-- A new plate: rare, so it gets its own block right under the headline. -->
    <section v-if="plateUp && plateColor" class="plate-up punch" style="--i: 4">
      <span class="plate-up__plates" aria-hidden="true">
        <span
          v-for="n in plateUp.count"
          :key="n"
          class="plate-up__plate"
          :style="{ background: plateColor.fill, color: plateColor.ink }"
        >
          <template v-if="n === plateUp.count">{{ plateUp.kg }}</template>
        </span>
      </span>
      <span class="plate-up__body">
        <span class="plate-up__label">{{ t('finish.newPlate') }}</span>
        <span class="plate-up__title">{{ plateTitle(plateUp) }}</span>
        <span class="plate-up__note">{{ t('finish.plateOnProfile') }}</span>
      </span>
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
      <WeekStrip :date-strs="dateStrs" />
      <div class="card__text">
        <span class="card__title">{{
          t('session.streakRecap.weekInARow', { count: streak }, streak)
        }}</span>
        <span class="card__note">{{ streakNote }}</span>
      </div>
      <p v-if="milestone" class="milestone">
        <Award :size="18" :stroke-width="2.25" /> {{ milestone }}
      </p>
    </section>

    <section class="rise" style="--i: 6">
      <h2 class="label">{{ t('finish.whatYouDid') }}</h2>
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

    <button v-if="roomId" type="button" class="group-recap" @click="emit('recap')">
      {{ t('room.viewRecap') }}
    </button>

    <div class="dock">
      <button type="button" class="dock__share share-btn" @click="emit('share')">
        <Share2 :size="18" :stroke-width="2.25" />
        {{ shareCopied ? t('sessionComplete.shareCopied') : t('finish.share') }}
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
  color: var(--color-on-accent);
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
  color: var(--color-on-accent);
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

.group-recap {
  min-height: var(--size-control);
  border: 1px solid var(--color-border-hover);
  border-radius: 14px;
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  background: transparent;
  cursor: pointer;
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
  color: var(--color-on-accent);
  background: var(--color-accent);
}

/* A new plate. */
.plate-up {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: var(--color-background-soft);
  transform-origin: left center;
}

.plate-up__plates {
  flex-shrink: 0;
  display: flex;
}

.plate-up__plate {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  font-size: 22px;
  font-weight: var(--weight-heavy);
  line-height: 1;
  box-shadow:
    inset 0 0 0 3px rgba(0, 0, 0, 0.22),
    inset 0 0 0 14px rgba(255, 255, 255, 0.16);
}

.plate-up__plate + .plate-up__plate {
  margin-left: -56px;
}

.plate-up__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.plate-up__label {
  font-size: var(--text-small);
  font-weight: var(--weight-medium);
}

.plate-up__title {
  font-size: var(--text-title);
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--color-heading);
}

.plate-up__note {
  font-size: var(--text-small);
}

/* Sparks leave the badge once, for the rare finish. */
.hero {
  position: relative;
}

.burst {
  position: absolute;
  top: 34px;
  left: 22px;
}

.burst i {
  position: absolute;
  width: 10px;
  height: 10px;
  margin: -5px;
  border-radius: 50%;
  background: var(--color-accent);
  opacity: 0;
  animation: finish-burst calc(var(--motion-slow) * 1.8) var(--ease-out) var(--motion-quick) both;
}

/* The staged reveal: the badge lands, then each block rises into place in
   order. `punch` is for what was earned: it arrives with weight. All of it
   runs on the motion tokens, so reduced motion shows the screen at once. */
.rise {
  animation: finish-rise var(--motion-base) var(--ease-out) both;
  animation-delay: calc(var(--i, 0) * var(--motion-stagger) + var(--motion-stagger));
}

.land {
  animation: finish-land var(--motion-slow) var(--ease-spring) both;
}

.punch {
  transform-origin: left center;
  animation: finish-punch var(--motion-slow) var(--ease-spring) both;
  animation-delay: calc(var(--i, 0) * var(--motion-stagger) + var(--motion-stagger));
}

@keyframes finish-punch {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes finish-burst {
  from {
    opacity: 1;
    transform: rotate(var(--a)) translateY(-26px) scale(1);
  }
  to {
    opacity: 0;
    transform: rotate(var(--a)) translateY(-110px) scale(0.3);
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
