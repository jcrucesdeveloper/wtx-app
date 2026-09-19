<script setup lang="ts">
import { computed } from 'vue'
import { Check, Trash2 } from '@lucide/vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import type { SessionSetDraft } from '@/lib/serializeSession'

const props = defineProps<{
  exerciseIndex: number
  set: SessionSetDraft
  label: string
  kind: 'reps' | 'time'
  /** Exercise's planned weight/reps — last-resort placeholder when there's no ghost value. */
  targetWeight: number
  targetReps: number
}>()

const activeSession = useActiveSessionStore()

/** Prefers "last time" data; falls back to the template's planned value so it's never a bare 0. */
const placeholderWeight = computed(() => props.set.ghostWeight ?? props.targetWeight)
const placeholderReps = computed(() => props.set.ghostReps ?? props.targetReps)

function onWeightInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  activeSession.updateSet(props.exerciseIndex, props.set.id, {
    weight: value.trim() === '' ? null : Number(value),
  })
}

function onRepsInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  activeSession.updateSet(props.exerciseIndex, props.set.id, {
    reps: value.trim() === '' ? null : Number(value),
  })
}

function toggleComplete() {
  if (props.set.completed) {
    activeSession.uncompleteSet(props.exerciseIndex, props.set.id)
  } else if (props.set.weight !== null && props.set.reps !== null) {
    activeSession.completeSet(props.exerciseIndex, props.set.id)
  }
}

function remove() {
  activeSession.removeSet(props.exerciseIndex, props.set.id)
}
</script>

<template>
  <div class="row" :class="{ 'row--complete': set.completed, 'row--warmup': set.isWarmup }">
    <span class="row__label">{{ label }}</span>
    <input
      class="row__input"
      type="number"
      inputmode="decimal"
      :placeholder="String(placeholderWeight)"
      :value="set.weight ?? ''"
      @input="onWeightInput"
    />
    <input
      class="row__input"
      type="number"
      inputmode="numeric"
      :placeholder="kind === 'time' && placeholderReps === 0 ? 's' : String(placeholderReps)"
      :value="set.reps ?? ''"
      @input="onRepsInput"
    />
    <button
      type="button"
      class="row__check"
      :class="{ active: set.completed }"
      aria-label="Mark set complete"
      @click="toggleComplete"
    >
      <Check :size="16" :stroke-width="2.5" />
    </button>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 22px 1fr 1fr 34px;
  align-items: center;
  gap: 8px;
}

.row__label {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.55;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.row--warmup .row__label {
  color: var(--color-accent);
}

.row__input {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  padding: 7px 8px;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.row--complete .row__input {
  background: var(--color-background-mute);
}

.row__check {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-sm);
  background: var(--color-background-soft);
  color: var(--color-text);
  opacity: 0.6;
  cursor: pointer;
}

.row__check.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
  opacity: 1;
}

.row__remove {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text);
  opacity: 0.4;
  cursor: pointer;
}
</style>
