<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { WorkoutSessionExercise } from '@/lib/wtx'
import { displayNote, formatSetValue, isTimeExercise } from '@/lib/sessionTime'
import ExerciseThumb from '@/components/exercise/ExerciseThumb.vue'
import { useExerciseName } from '@/composables/useExerciseName'

/**
 * A logged workout, exercise by exercise, in the finish screen's "What you
 * did" style: one soft card, one block per exercise with its best set on the
 * right, and every set underneath. The best set is in the ink that leads; a
 * record gets the PR mark. "3/4 sets" already says an exercise fell short,
 * so that needs no badge; one that was skipped entirely steps back.
 */
const props = defineProps<{
  exercises: WorkoutSessionExercise[]
  unit?: string
  /** Exercise names this workout set a personal record on. */
  records?: string[]
}>()

const { t } = useI18n()
const { exerciseName } = useExerciseName()

const key = (name: string) => name.trim().toLowerCase()

const rows = computed(() => {
  const recordKeys = new Set((props.records ?? []).map(key))
  return props.exercises.map((exercise) => {
    const timed = isTimeExercise(exercise.note)
    const top = exercise.topSet
    // The heaviest working set (ties to the most reps) — the same one as `best`.
    const bestIndex = top ? exercise.loggedSets.indexOf(top) : -1
    return {
      exercise,
      timed,
      note: displayNote(exercise.note),
      best: top ? formatSetValue(top, props.unit, timed) : '',
      bestIndex,
      isRecord: recordKeys.has(key(exercise.name)),
    }
  })
})
</script>

<template>
  <ul class="list">
    <li
      v-for="(row, i) in rows"
      :key="i"
      class="exercise"
      :class="{ 'exercise--skipped': !row.exercise.loggedSets.length }"
    >
      <div class="exercise__head">
        <ExerciseThumb :name="row.exercise.name" />
        <div class="exercise__body">
          <span class="exercise__name">
            {{ exerciseName(row.exercise.name) }}
            <span v-if="row.isRecord" class="exercise__pr">PR</span>
          </span>
          <!-- A timed exercise is logged once: no count of sets, just that it's a time. -->
          <span class="exercise__meta">
            <template v-if="row.timed">{{ t('timedExercise.time') }}</template>
            <template v-else>{{
              t('session.loggedExerciseList.setsProgress', {
                done: row.exercise.workingSets.length,
                total: row.exercise.sets,
              })
            }}</template>
            <template v-if="row.note"> · {{ row.note }}</template>
          </span>
        </div>
        <span v-if="row.best" class="exercise__best">{{ row.best }}</span>
      </div>

      <!-- Its one time is already the best on the right; several (an older log) still list. -->
      <ol v-if="row.exercise.loggedSets.length > (row.timed ? 1 : 0)" class="sets">
        <li
          v-for="(set, j) in row.exercise.loggedSets"
          :key="j"
          class="set"
          :class="{ 'set--warmup': set.label === 'W', 'set--best': j === row.bestIndex }"
        >
          <span class="set__label">{{ set.label }}</span>
          <span class="set__value">{{ formatSetValue(set, unit, row.timed) }}</span>
        </li>
      </ol>
    </li>
  </ul>
</template>

<style scoped>
.list {
  list-style: none;
  padding: 0;
  border-radius: 16px;
  background: var(--color-background-soft);
  font-variant-numeric: tabular-nums;
}

.exercise {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
}

.exercise + .exercise {
  border-top: 1px solid var(--color-border);
}

.exercise__head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
}

.exercise__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.exercise__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-heading);
}

.exercise__pr {
  margin-left: 6px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  vertical-align: 1px;
  color: var(--color-on-accent);
  background: var(--color-accent);
}

.exercise__meta {
  font-size: 13px;
}

.exercise__best {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

.exercise--skipped {
  opacity: 0.55;
}

/* Every set, under the name: the label, then what was lifted. */
.sets {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 0 0;
  border-top: 1px solid var(--color-border);
}

.set {
  display: grid;
  grid-template-columns: 28px 1fr;
  align-items: baseline;
  font-size: 14px;
}

.set__label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text);
  opacity: 0.6;
}

.set--warmup .set__label {
  color: var(--color-heading);
  opacity: 1;
}

.set__value {
  color: var(--color-text);
}

.set--best .set__value {
  font-weight: 700;
  color: var(--color-heading);
}
</style>
