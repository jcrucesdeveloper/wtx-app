<script setup lang="ts">
import type { WorkoutExercise } from '@/lib/wtx'
import { formatCompactDuration } from '@/lib/format'

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
</script>

<template>
  <ol class="exercises">
    <li v-for="(exercise, i) in exercises" :key="i" class="exercise">
      <span class="exercise__index">{{ i + 1 }}</span>
      <div class="exercise__body">
        <span class="exercise__name">{{ exercise.name }}</span>
        <span class="exercise__meta">
          {{ prescription(exercise) }}
          <template v-if="exercise.targetWeight !== undefined">
            · {{ exercise.targetWeight }} {{ unit }}
          </template>
          <template v-if="exercise.restSeconds">
            · rest {{ formatCompactDuration(exercise.restSeconds) }}
          </template>
        </span>
      </div>
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
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 12px;
  align-items: baseline;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.exercise__index {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.4;
  font-variant-numeric: tabular-nums;
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
