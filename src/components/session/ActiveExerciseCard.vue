<script setup lang="ts">
import { computed } from 'vue'
import { Plus } from '@lucide/vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import ActiveSetRow from '@/components/session/ActiveSetRow.vue'
import { formatCompactDuration } from '@/lib/format'
import type { SessionExerciseDraft } from '@/lib/serializeSession'

const props = defineProps<{
  exerciseIndex: number
  exercise: SessionExerciseDraft
  unit?: string
}>()

const activeSession = useActiveSessionStore()

const prescription = computed(() => {
  if (props.exercise.kind === 'time') return formatCompactDuration(props.exercise.reps) || '0s'
  return `${props.exercise.sets} × ${props.exercise.reps}`
})

/** Warm-ups all show "W"; working sets get sequential numbers, in array order. */
const labeledSets = computed(() => {
  let workingIndex = 0
  return props.exercise.loggedSets.map((set) => ({
    set,
    label: set.isWarmup ? 'W' : String(++workingIndex),
  }))
})

function addSet() {
  activeSession.addSet(props.exerciseIndex)
}

function addWarmup() {
  activeSession.addSet(props.exerciseIndex, { isWarmup: true })
}

function onNoteInput(event: Event) {
  activeSession.updateNote(props.exerciseIndex, (event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <div class="card">
    <div class="card__head">
      <span class="card__name">{{ exercise.name }}</span>
      <span class="card__meta">
        {{ prescription }}
        <template v-if="exercise.weight">· {{ exercise.weight }} {{ unit }}</template>
      </span>
    </div>

    <div class="rows">
      <div class="rows__head">
        <span />
        <span>Weight</span>
        <span>{{ exercise.kind === 'time' ? 'Seconds' : 'Reps' }}</span>
        <span />
        <span />
      </div>
      <ActiveSetRow
        v-for="{ set, label } in labeledSets"
        :key="set.id"
        :exercise-index="exerciseIndex"
        :set="set"
        :label="label"
        :kind="exercise.kind"
        :target-weight="exercise.weight"
        :target-reps="exercise.reps"
      />
    </div>

    <div class="actions">
      <button type="button" class="actions__btn" @click="addSet">
        <Plus :size="14" :stroke-width="2.5" /> Add set
      </button>
    </div>

    <textarea
      class="note"
      rows="1"
      placeholder="Note (optional)"
      :value="exercise.note"
      @input="onNoteInput"
    />
  </div>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.card__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card__name {
  font-weight: 600;
  color: var(--color-heading);
}

.card__meta {
  font-size: 12px;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rows__head {
  display: grid;
  grid-template-columns: 22px 1fr 1fr 34px 24px;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.5;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions__btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px dashed var(--color-border-hover);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  cursor: pointer;
}

.note {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 13px;
  padding: 8px 10px;
  resize: none;
  font-family: inherit;
}
</style>
