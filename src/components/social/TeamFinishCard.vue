<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronRight } from '@lucide/vue'
import MemberFacepile, { type Face } from '@/components/social/MemberFacepile.vue'
import TeamBar from '@/components/social/TeamBar.vue'

/**
 * The group, on the finish screen of a group workout: right under your own
 * headline, because in a group workout the group is the point. While others
 * are still going it is live (faces with their share of the plan, and who
 * the team is waiting on). When the last one finishes it turns into the
 * team's result. Either way it leads to the group recap.
 */
const props = defineProps<{
  faces: Face[]
  segments: { userId: string; done: number; color: string }[]
  done: number
  total: number
  finished: number
  members: number
  allFinished: boolean
  /** The supportive line about whoever the team is waiting on (empty for none). */
  line: string
  /** Whether tapping the line opens someone's workout. */
  lineTappable?: boolean
  /** The team's time, once everyone has finished. */
  seconds: number | null
}>()

const emit = defineEmits<{ select: [userId: string]; line: []; recap: [] }>()

const { t } = useI18n()

const status = computed(() =>
  props.allFinished
    ? t('room.summary.teamFinished')
    : t('room.summary.stillGoing', { count: props.members - props.finished }, props.members - props.finished),
)

const result = computed(() => {
  const parts = [t('room.team.sets', { done: props.done, total: props.total })]
  if (props.seconds !== null) parts.push(t('room.summary.minutes', { count: Math.max(1, Math.round(props.seconds / 60)) }))
  return parts.join(' · ')
})
</script>

<template>
  <section class="team-card" :class="{ 'team-card--done': allFinished }">
    <div class="team-card__head">
      <span class="team-card__title">{{ t('room.summary.teamCard') }}</span>
      <span :key="String(allFinished)" class="team-card__status" :class="{ 'team-card__status--flip': allFinished }">
        <template v-if="allFinished">🎉 </template>{{ status }}
      </span>
    </div>

    <div class="team-card__row">
      <MemberFacepile :faces="faces" :size="32" selectable @select="emit('select', $event)" />
      <span class="team-card__count">{{ result }}</span>
    </div>

    <TeamBar v-if="total > 0" :segments="segments" :total="total" :label="t('room.team.sets', { done, total })" />

    <button v-if="line && !allFinished" type="button" class="team-card__line" :disabled="!lineTappable" @click="emit('line')">
      {{ line }}
    </button>

    <button type="button" class="team-card__recap" @click="emit('recap')">
      {{ t('room.summary.seeRecap') }}
      <ChevronRight :size="16" :stroke-width="2.5" />
    </button>
  </section>
</template>

<style scoped>
.team-card {
  --facepile-edge: var(--color-background-soft);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 14px 6px 16px;
  border-radius: var(--radius-lg);
  border-left: 3px solid var(--color-accent);
  background: var(--color-background-soft);
  font-variant-numeric: tabular-nums;
}

.team-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.team-card__title {
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-text);
}

.team-card__status {
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
}

.team-card__status--flip {
  display: inline-block;
  transform-origin: right center;
  animation: team-card-flip var(--motion-slow) var(--ease-spring) both;
}

.team-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.team-card__count {
  font-size: 15px;
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  white-space: nowrap;
}

.team-card__line {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: var(--text-small);
  font-weight: 600;
  text-align: left;
  color: var(--color-heading);
  cursor: pointer;
}

.team-card__line:disabled {
  cursor: default;
}

.team-card__recap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--size-touch);
  margin: 0 -8px 0 0;
  padding: 0;
  border: none;
  border-top: 1px solid var(--color-border);
  background: transparent;
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  cursor: pointer;
}

@keyframes team-card-flip {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}
</style>
