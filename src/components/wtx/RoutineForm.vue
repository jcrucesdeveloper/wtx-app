<script setup lang="ts">
import { computed } from 'vue'
import { emptyExercise, type RoutineDraft, type RoutineDraftExercise } from '@/lib/serializeRoutine'
import { formatCompactDuration } from '@/lib/format'

const draft = defineModel<RoutineDraft>({ required: true })

const tagsText = computed({
  get: () => draft.value.tags.join(', '),
  set: (value: string) => {
    draft.value.tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  },
})

/** Parses `1m30s`, `90s`, `2m`, `1:30` or a bare number of seconds. */
function parseDuration(input: string): number {
  const value = input.trim()
  if (!value) return 0
  if (/^\d+$/.test(value)) return Number(value)
  const clock = /^(\d+):([0-5]?\d)$/.exec(value)
  if (clock) return Number(clock[1]) * 60 + Number(clock[2])
  const compact = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value)
  if (compact && (compact[1] || compact[2] || compact[3])) {
    return Number(compact[1] ?? 0) * 3600 + Number(compact[2] ?? 0) * 60 + Number(compact[3] ?? 0)
  }
  return 0
}

function addExercise() {
  draft.value.exercises.push(emptyExercise())
}

function removeExercise(index: number) {
  draft.value.exercises.splice(index, 1)
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= draft.value.exercises.length) return
  const list = draft.value.exercises
  ;[list[index], list[target]] = [list[target]!, list[index]!]
}

function setKind(exercise: RoutineDraftExercise, kind: 'reps' | 'time') {
  exercise.kind = kind
}

function numberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}
</script>

<template>
  <div class="form">
    <label class="field">
      <span class="field__label">Routine name</span>
      <input v-model="draft.name" type="text" placeholder="Push Day" maxlength="80" />
    </label>

    <div class="row">
      <label class="field">
        <span class="field__label">Unit</span>
        <input v-model="draft.unit" type="text" placeholder="kg" maxlength="8" />
      </label>
      <label class="field">
        <span class="field__label">Tags</span>
        <input v-model="tagsText" type="text" placeholder="push, upper" />
      </label>
    </div>

    <label class="field">
      <span class="field__label">Notes</span>
      <textarea v-model="draft.notes" rows="2" placeholder="Focuses mostly on chest." />
    </label>

    <div class="exercises">
      <div class="exercises__head">
        <span class="field__label">Exercises</span>
        <button type="button" class="add" @click="addExercise">+ Add</button>
      </div>

      <div v-for="(exercise, i) in draft.exercises" :key="i" class="exercise">
        <div class="exercise__top">
          <span class="exercise__index">{{ i + 1 }}</span>
          <input
            v-model="exercise.name"
            class="exercise__name"
            type="text"
            placeholder="Bench Press"
          />
          <div class="exercise__reorder">
            <button type="button" :disabled="i === 0" aria-label="Move up" @click="move(i, -1)">
              ↑
            </button>
            <button
              type="button"
              :disabled="i === draft.exercises.length - 1"
              aria-label="Move down"
              @click="move(i, 1)"
            >
              ↓
            </button>
            <button
              type="button"
              :disabled="draft.exercises.length === 1"
              aria-label="Remove"
              @click="removeExercise(i)"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="segmented">
          <button
            type="button"
            :class="{ active: exercise.kind === 'reps' }"
            @click="setKind(exercise, 'reps')"
          >
            Reps
          </button>
          <button
            type="button"
            :class="{ active: exercise.kind === 'time' }"
            @click="setKind(exercise, 'time')"
          >
            Time
          </button>
        </div>

        <div v-if="exercise.kind === 'reps'" class="row">
          <label class="field">
            <span class="field__label">Sets</span>
            <input v-model.number="exercise.sets" type="number" min="1" inputmode="numeric" />
          </label>
          <label class="field">
            <span class="field__label">Reps</span>
            <input v-model.number="exercise.reps" type="number" min="1" inputmode="numeric" />
          </label>
        </div>
        <label v-else class="field">
          <span class="field__label">Duration</span>
          <input
            :value="formatCompactDuration(exercise.durationSeconds)"
            type="text"
            placeholder="1m30s"
            @change="
              exercise.durationSeconds = parseDuration(($event.target as HTMLInputElement).value)
            "
          />
        </label>

        <div class="row">
          <label class="field">
            <span class="field__label">Weight ({{ draft.unit || '—' }})</span>
            <input
              :value="exercise.weight ?? ''"
              type="number"
              min="0"
              step="0.25"
              inputmode="decimal"
              placeholder="optional"
              @input="
                exercise.weight = numberOrUndefined(($event.target as HTMLInputElement).value)
              "
            />
          </label>
          <label class="field">
            <span class="field__label">Rest</span>
            <input
              :value="formatCompactDuration(exercise.restSeconds ?? 0)"
              type="text"
              placeholder="1m30s"
              @change="
                exercise.restSeconds =
                  parseDuration(($event.target as HTMLInputElement).value) || undefined
              "
            />
          </label>
        </div>

        <label class="field">
          <span class="field__label">Muscle group</span>
          <input v-model="exercise.muscleGroup" type="text" placeholder="optional, e.g. chest" />
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field__label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
}

input,
textarea {
  width: 100%;
  font-family: inherit;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  resize: vertical;
}

.exercises {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.exercises__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.add {
  border: none;
  background: var(--color-background-mute);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.exercise {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background-soft);
}

.exercise__top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
}

.exercise__index {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.4;
}

.exercise__reorder {
  display: flex;
  gap: 2px;
}

.exercise__reorder button {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 12px;
  cursor: pointer;
}

.exercise__reorder button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--color-background-mute);
}

.segmented button {
  border: none;
  background: transparent;
  padding: 7px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.6;
  cursor: pointer;
}

.segmented button.active {
  background: var(--color-background);
  opacity: 1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
