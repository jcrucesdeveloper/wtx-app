<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { GripVertical } from '@lucide/vue'
import { VueDraggable } from 'vue-draggable-plus'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import ExerciseThumb from '@/components/exercise/ExerciseThumb.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { formatCompactDuration } from '@/lib/format'
import type { SessionExerciseDraft } from '@/lib/serializeSession'

defineProps<{ open: boolean }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()
const activeSession = useActiveSessionStore()

/** Stable keys for draggable rows, since session exercises carry no id. */
const exerciseKeys = new WeakMap<SessionExerciseDraft, number>()
let nextExerciseKey = 0
function keyFor(exercise: SessionExerciseDraft): number {
  let key = exerciseKeys.get(exercise)
  if (key === undefined) {
    key = nextExerciseKey++
    exerciseKeys.set(exercise, key)
  }
  return key
}

const exercises = computed({
  get: () => activeSession.session?.draft.exercises ?? [],
  set: (value) => activeSession.reorderExercises(value),
})

function summaryFor(exercise: SessionExerciseDraft): string {
  if (exercise.kind === 'time') return formatCompactDuration(exercise.reps) || '0s'
  return `${exercise.sets} × ${exercise.reps}`
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <BottomSheet :open="open" :title="t('session.reorderSheet.title')" @close="close">
    <p class="hint">{{ t('session.reorderSheet.hint') }}</p>

    <VueDraggable
      v-model="exercises"
      class="list"
      handle=".row__handle"
      ghost-class="row--ghost"
      drag-class="row--dragging"
      :animation="150"
    >
      <div v-for="(exercise, i) in exercises" :key="keyFor(exercise)" class="row">
        <button type="button" class="row__handle" :aria-label="t('session.reorderSheet.dragAria')">
          <GripVertical :size="16" :stroke-width="2" />
        </button>
        <span class="row__index">{{ i + 1 }}</span>
        <ExerciseThumb :name="exercise.name" />
        <div class="row__title">
          <span class="row__name">{{ exercise.name }}</span>
          <span class="row__summary">{{ summaryFor(exercise) }}</span>
        </div>
      </div>
    </VueDraggable>
  </BottomSheet>
</template>

<style scoped>
.hint {
  font-size: 12px;
  opacity: 0.6;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: grid;
  grid-template-columns: auto auto auto 1fr;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
}

.row--ghost {
  opacity: 0.4;
}

.row--dragging {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
}

.row__handle {
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
  opacity: 0.6;
  cursor: grab;
  touch-action: none;
}

.row__handle:active {
  opacity: 1;
  background: var(--color-background-mute);
  cursor: grabbing;
}

.row__index {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.4;
}

.row__title {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.row__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: var(--color-heading);
}

.row__summary {
  font-size: 11px;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}
</style>
