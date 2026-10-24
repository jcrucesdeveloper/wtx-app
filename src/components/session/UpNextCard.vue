<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ExerciseThumb from '@/components/exercise/ExerciseThumb.vue'
import { useExerciseName } from '@/composables/useExerciseName'
import { formatDurationInput } from '@/lib/durationInput'
import type { SessionExerciseDraft } from '@/lib/serializeSession'

/**
 * The exercise after the one just finished, while you walk over to it: what
 * it is and what it asks of you — its sets still to do, and the numbers its
 * first one will be logged as (typed, else last time's, else the plan). Only
 * a glance; moving on is the button under it.
 */
const props = defineProps<{
  exercise: SessionExerciseDraft
  unit: string
}>()

const { t } = useI18n()
const { exerciseName } = useExerciseName()

const summary = computed(() => {
  const { exercise } = props
  const open = exercise.loggedSets.filter((s) => !s.completed)
  const first = open[0]
  const reps = first?.reps ?? first?.ghostReps ?? exercise.reps
  const weight = first?.weight ?? first?.ghostWeight ?? exercise.weight
  // A timed exercise is one entry: its time is the whole plan.
  if (exercise.kind === 'time') return open.length ? formatDurationInput(reps) : t('workout.noSets')
  const parts = [open.length ? `${open.length} × ${reps}` : t('workout.noSets')]
  if (weight > 0) parts.push(`${weight} ${props.unit}`.trim())
  return parts.join(' · ')
})
</script>

<template>
  <div class="up-next" role="status">
    <ExerciseThumb :name="exercise.name" />
    <div class="up-next__text">
      <span class="up-next__label">{{ t('workout.upNext') }}</span>
      <span class="up-next__name">{{ exerciseName(exercise.name) }}</span>
    </div>
    <span class="up-next__plan">{{ summary }}</span>
  </div>
</template>

<style scoped>
/* Quiet, like the dock's other lines: something to read, not to press. */
.up-next {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-2);
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  animation: up-next-in var(--motion-base) var(--ease-spring);
}

.up-next__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.up-next__label {
  font-size: var(--text-micro);
  font-weight: var(--weight-bold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.up-next__name {
  font-size: 15px;
  font-weight: var(--weight-bold);
  line-height: 1.3;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.up-next__plan {
  flex-shrink: 0;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

@keyframes up-next-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.96);
  }
}
</style>
