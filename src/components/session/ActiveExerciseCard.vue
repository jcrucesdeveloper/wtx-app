<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDownUp, EllipsisVertical, Plus } from '@lucide/vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { scrollFocusedIntoView } from '@/lib/scrollIntoViewOnFocus'
import ActiveSetRow from '@/components/session/ActiveSetRow.vue'
import { formatCompactDuration } from '@/lib/format'
import type { SessionExerciseDraft } from '@/lib/serializeSession'

const props = defineProps<{
  exerciseIndex: number
  exercise: SessionExerciseDraft
  unit?: string
  canRemove: boolean
}>()

const activeSession = useActiveSessionStore()

const emit = defineEmits<{
  reorder: []
}>()

const menuOpen = ref(false)
function closeMenu() {
  menuOpen.value = false
}
onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))

function reorderExercises() {
  menuOpen.value = false
  emit('reorder')
}

function removeExercise() {
  menuOpen.value = false
  const loggedCount = props.exercise.loggedSets.filter((s) => s.completed).length
  if (loggedCount > 0) {
    const noun = loggedCount === 1 ? 'set' : 'sets'
    if (!confirm(`Remove ${props.exercise.name}? You've already logged ${loggedCount} ${noun} for it.`))
      return
  }
  activeSession.removeExercise(props.exerciseIndex)
}

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
      <div class="card__title">
        <span class="card__name">{{ exercise.name }}</span>
        <span class="card__meta">
          {{ prescription }}
          <template v-if="exercise.weight">· {{ exercise.weight }} {{ unit }}</template>
        </span>
      </div>

      <div class="card__menu">
        <button
          type="button"
          class="card__kebab"
          aria-label="Exercise options"
          @click.stop="menuOpen = !menuOpen"
        >
          <EllipsisVertical :size="16" :stroke-width="2.25" />
        </button>
        <div v-if="menuOpen" class="card__menu-panel" @click.stop>
          <button
            type="button"
            class="card__menu-item"
            :disabled="!canRemove"
            @click="reorderExercises"
          >
            <ArrowDownUp :size="14" :stroke-width="2.25" /> Reorder exercises
          </button>
          <button
            type="button"
            class="card__menu-item card__menu-item--danger"
            :disabled="!canRemove"
            @click="removeExercise"
          >
            Remove exercise
          </button>
        </div>
      </div>
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
      @focus="scrollFocusedIntoView"
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.card__title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
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

.card__menu {
  position: relative;
  flex-shrink: 0;
}

.card__kebab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  opacity: 0.7;
  cursor: pointer;
}

.card__menu-panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 150px;
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-hover);
  background: var(--color-background);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
}

.card__menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.card__menu-item:hover,
.card__menu-item:focus-visible {
  background: var(--color-background-mute);
}

.card__menu-item--danger {
  color: #e11d48;
}

.card__menu-item:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  background: transparent;
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
