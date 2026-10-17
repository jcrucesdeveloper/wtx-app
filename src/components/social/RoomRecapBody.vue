<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronRight } from '@lucide/vue'
import MemberFacepile, { type Face } from '@/components/social/MemberFacepile.vue'
import TeamBar from '@/components/social/TeamBar.vue'
import { useExerciseName } from '@/composables/useExerciseName'
import { formatNumber } from '@/lib/format'
import { formatSetValue } from '@/lib/sessionTime'
import { initials } from '@/lib/memberColors'
import { inkOnAccent } from '@/lib/accentInk'
import type { Moment, RoomSummary, SummaryMember } from '@/lib/roomSummary'

/**
 * The "Together" recap of a group workout: one statement (the team against
 * the plan), then its facts. The facts are what happened, everyone's part,
 * and each lift side by side. Same grammar and staged reveal as the solo
 * finish screen (FinishSummary). Presentational: the view feeds it from the
 * room store, and the dev reference page feeds it fixtures.
 *
 * Cooperative by design (see teamProgress): members stay in join order,
 * each gets a highlight of their own, and nothing is ranked.
 */
const props = defineProps<{
  summary: RoomSummary
  /** Room colors by user id (join order). */
  colors: Record<string, string>
  unit: string
  myId: string | null
  hostId: string | null
  /** `active` while someone is still going: numbers are live and members can be watched or cheered. */
  status: 'active' | 'finished'
  /** The routine's exercises in the room's order, and whether everyone cleared each. */
  pips: { name: string; cleared: boolean }[]
  tier: 'routine' | 'win' | 'event'
  /** Play the reveal and the celebration (the first look at a finished recap). */
  celebrate: boolean
}>()

const emit = defineEmits<{ select: [userId: string] }>()

const { t } = useI18n()
const { exerciseName } = useExerciseName()

const team = computed(() => props.summary.team)
const colorOf = (userId: string) => props.colors[userId] ?? '#888888'
const nameOf = (userId: string) => props.summary.members.find((m) => m.userId === userId)?.displayName ?? '—'
const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60))

const faces = computed<Face[]>(() =>
  props.summary.members.map((m) => ({
    userId: m.userId,
    name: m.displayName,
    color: colorOf(m.userId),
    done: !!m.finishedAt,
  })),
)

const segments = computed(() =>
  props.summary.members.map((m) => ({ userId: m.userId, done: m.done, color: colorOf(m.userId) })),
)

/** Without a readable plan (total 0) the headline falls back to the sets done. */
const hasPlan = computed(() => team.value.total > 0)

const heroLabel = computed(() => {
  if (team.value.allFinished) return t('room.summary.teamFinished')
  if (props.status === 'finished') return t('room.summary.ended')
  return t('room.summary.doneOf', { done: team.value.finished, total: team.value.members })
})

const heroSub = computed(() => {
  const parts = [t('room.summary.ofYou', { count: team.value.members }, team.value.members)]
  if (props.summary.seconds !== null) parts.push(t('room.summary.minutes', { count: minutes(props.summary.seconds) }))
  if (team.value.volume > 0) parts.push(`${formatNumber(team.value.volume)} ${props.unit}`)
  return parts.join(' · ')
})

/** Sparks for the rare one (three or more finishing the whole plan). */
const BURST = Array.from({ length: 11 }, (_, i) => i * 16 - 80)

function momentText(moment: Moment): string {
  if (moment.kind === 'cleared') return t('room.summary.momentCleared', { exercise: exerciseName(moment.exercise) })
  const member = props.summary.members.find((m) => m.userId === moment.userId)
  return member?.seconds != null
    ? t('room.summary.momentFinishedIn', { name: nameOf(moment.userId), count: minutes(member.seconds) })
    : t('room.summary.momentFinished', { name: nameOf(moment.userId) })
}

function highlightText(member: SummaryMember): string {
  const h = member.highlight
  if (h.kind === 'none') return t('room.summary.noSets')
  return `${exerciseName(h.exercise)} ${formatSetValue(h.set, props.unit, h.timed)}`
}

function statusText(member: SummaryMember): string {
  if (member.seconds !== null) return t('room.summary.minutes', { count: minutes(member.seconds) })
  if (member.finishedAt) return t('room.done')
  if (props.status === 'active' && member.currentExercise) {
    return t('room.summary.onExercise', { exercise: exerciseName(member.currentExercise) })
  }
  return ''
}

const complete = (m: SummaryMember) => m.planned > 0 && m.done >= m.planned
</script>

<template>
  <div class="recap" :class="[`recap--${tier}`, { 'recap--still': !celebrate }]">
    <section class="hero">
      <span v-if="celebrate && tier === 'event'" class="burst" aria-hidden="true">
        <i v-for="angle in BURST" :key="angle" :style="{ '--a': `${angle}deg` }" />
      </span>
      <MemberFacepile :faces="faces" :size="44" :max="6" :land="celebrate" class="hero__faces" />
      <p class="hero__label rise" style="--i: 1">{{ heroLabel }}</p>
      <p class="hero__value" :class="tier === 'routine' ? 'rise' : 'punch'" style="--i: 2">
        <template v-if="hasPlan">
          {{ team.done }}<span class="hero__of">/{{ team.total }}</span><small>{{ t('room.summary.sets') }}</small>
        </template>
        <template v-else>
          {{ team.sets }}<small>{{ t('room.summary.sets') }}</small>
        </template>
      </p>
      <p class="hero__sub rise" style="--i: 3">{{ heroSub }}</p>
      <TeamBar
        v-if="hasPlan"
        class="hero__bar rise"
        style="--i: 4"
        :segments="segments"
        :total="team.total"
        :exercises="pips"
        :grow="celebrate"
        :label="t('room.team.sets', { done: team.done, total: team.total })"
      />
    </section>

    <section v-if="summary.moments.length" class="rise" style="--i: 5">
      <h2 class="label">{{ t('room.summary.moments') }}</h2>
      <ul class="moments">
        <li v-for="(moment, i) in summary.moments" :key="i" class="moment">
          <span class="moment__icon" aria-hidden="true">{{ moment.kind === 'cleared' ? '✅' : '🏁' }}</span>
          {{ momentText(moment) }}
        </li>
      </ul>
    </section>

    <section class="rise" style="--i: 6">
      <h2 class="label">{{ t('room.summary.everyone') }}</h2>
      <ul class="members">
        <li v-for="(member, i) in summary.members" :key="member.userId" class="member-item rise" :style="{ '--i': 6 + i * 0.5 }">
          <button
            type="button"
            class="member"
            :aria-label="t('room.memberSession.viewAria', { name: member.displayName })"
            @click="emit('select', member.userId)"
          >
            <span class="member__head">
              <span
                class="member__avatar"
                :style="{ background: colorOf(member.userId), color: inkOnAccent(colorOf(member.userId)) }"
              >
                {{ initials(member.displayName) }}
              </span>
              <span class="member__who">
                <span class="member__name">{{ member.displayName }}</span>
                <span class="member__tags">
                  <span v-if="member.userId === myId" class="tag">{{ t('room.you') }}</span>
                  <span v-if="member.userId === hostId" class="tag">{{ t('room.host') }}</span>
                </span>
              </span>
              <ChevronRight :size="16" class="member__chevron" aria-hidden="true" />
            </span>
            <span class="member__sets">
              <template v-if="member.planned > 0">{{ member.done }}/{{ member.planned }}</template>
              <template v-else>{{ member.sets }}</template>
              <small>{{ t('room.summary.sets') }}</small>
              <span v-if="complete(member)" class="member__complete">{{ t('room.summary.everySet') }}</span>
            </span>
            <span class="member__facts">
              <span v-if="member.volume > 0">{{ formatNumber(member.volume) }} {{ unit }}</span>
              <span v-if="statusText(member)">{{ statusText(member) }}</span>
            </span>
            <span class="member__highlight">{{ highlightText(member) }}</span>
          </button>
        </li>
      </ul>
    </section>

    <details v-if="summary.exercises.length" class="side rise" style="--i: 8">
      <summary class="side__summary">
        <span class="label label--inline">{{ t('room.summary.sideBySide') }}</span>
        <ChevronRight :size="16" class="side__chevron" aria-hidden="true" />
      </summary>
      <div v-for="exercise in summary.exercises" :key="exercise.exercise" class="side__exercise">
        <h3 class="side__name">{{ exerciseName(exercise.exercise) }}</h3>
        <ul class="side__rows">
          <li v-for="entry in exercise.entries" :key="entry.userId" class="side__row">
            <span class="side__dot" :style="{ background: colorOf(entry.userId) }" />
            <span class="side__who">{{ nameOf(entry.userId) }}</span>
            <span class="side__best">
              {{ entry.best ? formatSetValue(entry.best, unit, exercise.kind === 'time') : '—' }}
            </span>
            <span class="side__count">{{ entry.sets ? t('room.setsDone', { count: entry.sets }) : '' }}</span>
          </li>
        </ul>
      </div>
    </details>
  </div>
</template>

<style scoped>
.recap {
  display: flex;
  flex-direction: column;
  gap: 28px;
  font-variant-numeric: tabular-nums;
}

.label {
  margin-bottom: 10px;
  font-size: var(--text-body);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
}

.label--inline {
  margin: 0;
}

/* One statement: the team against the plan. */
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-top: 12px;
}

.hero__faces {
  margin-bottom: 18px;
}

.hero__label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-heading);
}

.hero__value {
  font-size: 68px;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.04em;
  color: var(--color-heading);
}

.hero__of {
  color: var(--color-text);
}

.hero__value small {
  margin-left: 8px;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--color-text);
}

.hero__sub {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
}

.hero__bar {
  align-self: stretch;
  margin-top: 18px;
}

/* What happened, in order. */
.moments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  padding: 0;
}

.moment {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px 7px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-background-soft);
  font-size: var(--text-small);
  font-weight: 600;
  color: var(--color-heading);
}

.moment__icon {
  font-size: 14px;
}

/* Everyone's part: join order, one highlight each. */
.members {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  list-style: none;
  padding: 0;
}

.member {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 12px;
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.member:active {
  transform: scale(0.98);
}

.member__head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.member__avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
}

.member__who {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.member__name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member__tags {
  display: flex;
  gap: 4px;
}

.member__tags:empty {
  display: none;
}

.tag {
  font-size: var(--text-micro);
  font-weight: 700;
  padding: 1px 5px;
  border-radius: var(--radius-xs);
  background: var(--color-background-mute);
}

.member__chevron {
  flex-shrink: 0;
  opacity: 0.4;
}

.member__sets {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 6px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-heading);
}

.member__sets small {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--color-text);
}

.member__complete {
  font-size: var(--text-micro);
  font-weight: 700;
  letter-spacing: 0;
  color: var(--color-success);
}

.member__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 0 10px;
  font-size: var(--text-small);
}

.member__highlight {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
  font-size: var(--text-small);
  font-weight: 600;
  color: var(--color-heading);
}

/* Each lift side by side, folded away until asked for. */
.side {
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
}

.side__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--size-touch);
  padding: 4px 16px;
  list-style: none;
  cursor: pointer;
}

.side__summary::-webkit-details-marker {
  display: none;
}

.side__chevron {
  opacity: 0.5;
  transition: transform var(--motion-quick) var(--ease-out);
}

.side[open] .side__chevron {
  transform: rotate(90deg);
}

.side__exercise {
  padding: 10px 16px 12px;
  border-top: 1px solid var(--color-border);
}

.side__name {
  margin-bottom: 6px;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

.side__rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
  list-style: none;
  padding: 0;
}

.side__row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.side__dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
}

.side__who {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side__best {
  font-weight: 700;
  color: var(--color-heading);
}

.side__count {
  min-width: 48px;
  text-align: right;
  font-size: 12px;
  opacity: 0.6;
}

/* The staged reveal, as on the solo finish screen: each block rises in
   order, and the headline punches in when the team earned it. A repeat
   visit (`--still`) shows the screen at once. All on the motion tokens, so
   reduced motion needs no second path. */
.rise {
  animation: recap-rise var(--motion-base) var(--ease-out) both;
  animation-delay: calc(var(--i, 0) * var(--motion-stagger) + var(--motion-stagger));
}

.punch {
  transform-origin: left center;
  animation: recap-punch var(--motion-slow) var(--ease-spring) both;
  animation-delay: calc(var(--i, 0) * var(--motion-stagger) + var(--motion-stagger));
}

.recap--still .rise,
.recap--still .punch {
  animation: none;
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
  animation: recap-burst calc(var(--motion-slow) * 1.8) var(--ease-out) var(--motion-slow) both;
}

@keyframes recap-rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

@keyframes recap-punch {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
}

@keyframes recap-burst {
  from {
    opacity: 1;
    transform: rotate(var(--a)) translateY(-26px) scale(1);
  }
  to {
    opacity: 0;
    transform: rotate(var(--a)) translateY(-110px) scale(0.3);
  }
}
</style>
