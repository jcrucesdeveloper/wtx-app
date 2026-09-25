<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { WorkoutSessionExercise } from '@/lib/wtx'
import { displayNote, isTimeExercise } from '@/lib/sessionTime'
import ExerciseThumb from '@/components/exercise/ExerciseThumb.vue'
import { useExerciseName } from '@/composables/useExerciseName'

defineProps<{
  exercises: WorkoutSessionExercise[]
  unit?: string
}>()

const { t } = useI18n()
const { exerciseName } = useExerciseName()
</script>

<template>
  <ol class="exercises">
    <li v-for="(exercise, i) in exercises" :key="i" class="exercise">
      <div class="exercise__head">
        <span class="exercise__index">{{ i + 1 }}</span>
        <ExerciseThumb :name="exercise.name" />
        <div class="exercise__body">
          <span class="exercise__name">{{ exerciseName(exercise.name) }}</span>
          <span class="exercise__meta">
            {{ t('session.loggedExerciseList.setsProgress', { done: exercise.workingSets.length, total: exercise.sets }) }}
            <template v-if="displayNote(exercise.note)">
              · {{ displayNote(exercise.note) }}</template
            >
          </span>
        </div>
        <span v-if="!exercise.isComplete" class="exercise__badge">{{ t('session.loggedExerciseList.incomplete') }}</span>
      </div>

      <ul v-if="exercise.loggedSets.length" class="sets">
        <li
          v-for="(set, j) in exercise.loggedSets"
          :key="j"
          class="set"
          :class="{ 'set--warmup': set.label === 'W' }"
        >
          <span class="set__label">{{ set.label }}</span>
          <span class="set__value">
            {{ set.weight }} {{ unit }} × {{ set.reps
            }}{{ isTimeExercise(exercise.note) ? 's' : '' }}
          </span>
        </li>
      </ul>
    </li>
  </ol>
</template>

<style scoped>
.exercises {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

.exercise {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 12px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.exercise__head {
  display: grid;
  grid-template-columns: 22px auto 1fr auto;
  gap: 12px;
  align-items: center;
}

.exercise__index {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.45;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.exercise__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.exercise__name {
  font-weight: 600;
  color: var(--color-heading);
}

.exercise__meta {
  font-size: 12px;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

.exercise__badge {
  align-self: center;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 3px 6px;
  border-radius: var(--radius-xs);
  border: 1px solid #e11d48;
  color: #e11d48;
}

.sets {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 0 0 0 34px;
}

.set {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.set__label {
  width: 18px;
  font-size: 11px;
  font-weight: 700;
  opacity: 0.5;
}

.set--warmup .set__label {
  color: var(--color-accent);
}

.set__value {
  opacity: 0.85;
}
</style>
