<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { WorkoutExercise } from '@/lib/wtx'
import { formatCompactDuration } from '@/lib/format'
import ExerciseImageSheet from '@/components/exercise/ExerciseImageSheet.vue'
import ExerciseThumb from '@/components/exercise/ExerciseThumb.vue'

const { t } = useI18n()

defineProps<{
  exercises: WorkoutExercise[]
  unit?: string
}>()

function prescription(exercise: WorkoutExercise): string {
  if (exercise.kind === 'time') {
    return formatCompactDuration(exercise.durationSeconds ?? 0)
  }
  return `${exercise.sets} × ${exercise.targetReps ?? '—'}`
}

const previewName = ref<string | null>(null)
</script>

<template>
  <ol class="exercises">
    <li v-for="(exercise, i) in exercises" :key="i">
      <button type="button" class="exercise" @click="previewName = exercise.name">
        <span class="exercise__index">{{ i + 1 }}</span>
        <ExerciseThumb :name="exercise.name" />
        <div class="exercise__body">
          <span class="exercise__name">{{ exercise.name }}</span>
          <span class="exercise__meta">
            {{ prescription(exercise) }}
            <template v-if="exercise.targetWeight !== undefined">
              · {{ exercise.targetWeight }} {{ unit }}
            </template>
            <template v-if="exercise.restSeconds">
              ·
              {{ t('routine.exerciseList.rest', { duration: formatCompactDuration(exercise.restSeconds) }) }}
            </template>
          </span>
        </div>
      </button>
    </li>
  </ol>

  <ExerciseImageSheet
    :open="previewName !== null"
    :name="previewName ?? ''"
    @close="previewName = null"
  />
</template>

<style scoped>
.exercises {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
}

.exercise {
  display: grid;
  grid-template-columns: 22px auto 1fr;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 11px 12px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
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
</style>
