<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Trash2 } from '@lucide/vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { scrollFocusedIntoView } from '@/lib/scrollIntoViewOnFocus'
import { HapticsService } from '@/services/haptics'
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

const { t } = useI18n()
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

/** Plays the check bounce once per completion — not on every re-render while completed. */
const justCompleted = ref(false)

function toggleComplete() {
  if (props.set.completed) {
    activeSession.uncompleteSet(props.exerciseIndex, props.set.id)
    return
  }

  // An untouched input still shows a ghost/target number as its placeholder;
  // logging the set commits that shown value instead of forcing manual entry.
  if (props.set.weight === null || props.set.reps === null) {
    activeSession.updateSet(props.exerciseIndex, props.set.id, {
      weight: props.set.weight ?? placeholderWeight.value,
      reps: props.set.reps ?? placeholderReps.value,
    })
  }

  activeSession.completeSet(props.exerciseIndex, props.set.id)
  HapticsService.light()
  justCompleted.value = true
  setTimeout(() => (justCompleted.value = false), 220)
}

function remove() {
  activeSession.removeSet(props.exerciseIndex, props.set.id)
}

function cycleType() {
  activeSession.cycleSetType(props.exerciseIndex, props.set.id)
}
</script>

<template>
  <div
    class="row"
    :class="{
      'row--complete': set.completed,
      'row--warmup': set.type === 'W',
      'row--dropset': set.type === 'D',
    }"
  >
    <button
      type="button"
      class="row__label"
      :aria-label="t('session.activeSetRow.setTypeAria', { label })"
      @click="cycleType"
    >
      {{ label }}
    </button>
    <input
      class="row__input"
      type="number"
      inputmode="decimal"
      :placeholder="String(placeholderWeight)"
      :value="set.weight ?? ''"
      @input="onWeightInput"
      @focus="scrollFocusedIntoView"
    />
    <input
      class="row__input"
      type="number"
      inputmode="numeric"
      :placeholder="kind === 'time' && placeholderReps === 0 ? 's' : String(placeholderReps)"
      :value="set.reps ?? ''"
      @input="onRepsInput"
      @focus="scrollFocusedIntoView"
    />
    <button
      type="button"
      class="row__check"
      :class="{ active: set.completed, 'row__check--bounce': justCompleted }"
      :aria-label="t('session.activeSetRow.markCompleteAria')"
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
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  opacity: 0.55;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: inherit;
  cursor: pointer;
}

.row__label:hover,
.row__label:focus-visible {
  opacity: 0.85;
}

.row--warmup .row__label,
.row--dropset .row__label {
  color: var(--color-accent);
  opacity: 1;
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

@media (prefers-reduced-motion: no-preference) {
  .row__check--bounce {
    animation: row-check-bounce 0.22s ease;
  }
}

@keyframes row-check-bounce {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
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
