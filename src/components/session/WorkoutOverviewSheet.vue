<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from '@lucide/vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import ExerciseThumb from '@/components/exercise/ExerciseThumb.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useExerciseName } from '@/composables/useExerciseName'
import { formatCompactDuration } from '@/lib/format'
import type { SessionExerciseDraft } from '@/lib/serializeSession'

/**
 * The whole workout in its real order: what is done, where you are, what is
 * left. Tapping a line goes to that exercise.
 */
const props = defineProps<{
  open: boolean
  /** The exercise on screen behind the sheet. */
  currentIndex: number
}>()

const emit = defineEmits<{
  close: []
  select: [index: number]
}>()

const { t } = useI18n()
const { exerciseName } = useExerciseName()
const activeSession = useActiveSessionStore()

const unit = computed(() => activeSession.session?.draft.unit ?? '')

/** Done: its best set. Started: how far in. Not started: the plan. */
function summary(exercise: SessionExerciseDraft): string {
  const done = exercise.loggedSets.filter((s) => s.completed)
  if (done.length === exercise.loggedSets.length && done.length > 0) {
    const top = done.reduce((best, s) => ((s.weight ?? 0) > (best.weight ?? 0) ? s : best))
    return `${done.length} × ${top.reps} · ${top.weight} ${unit.value}`.trim()
  }
  if (done.length > 0) {
    return t('activeSession.setsChip', { done: done.length, total: exercise.loggedSets.length })
  }
  const plan =
    exercise.kind === 'time'
      ? formatCompactDuration(exercise.reps) || '0s'
      : `${exercise.loggedSets.length} × ${exercise.reps}`
  return exercise.weight ? `${plan} · ${exercise.weight} ${unit.value}`.trim() : plan
}

const items = computed(() =>
  (activeSession.session?.draft.exercises ?? []).map((exercise, index) => ({
    exercise,
    index,
    done: exercise.loggedSets.length > 0 && exercise.loggedSets.every((s) => s.completed),
    current: index === props.currentIndex,
  })),
)

function choose(index: number) {
  emit('select', index)
  emit('close')
}
</script>

<template>
  <BottomSheet :open="open" :title="t('workout.overview')" @close="emit('close')">
    <ol class="list">
      <li v-for="item in items" :key="item.index">
        <button
          type="button"
          class="item"
          :class="{ 'item--current': item.current }"
          :aria-current="item.current ? 'step' : undefined"
          @click="choose(item.index)"
        >
          <span v-if="item.done" class="item__check"><Check :size="16" :stroke-width="3" /></span>
          <ExerciseThumb v-else :name="item.exercise.name" />
          <span class="item__body">
            <span class="item__name">{{ exerciseName(item.exercise.name) }}</span>
            <span class="item__meta">{{ summary(item.exercise) }}</span>
          </span>
          <span v-if="item.current" class="item__now">{{ t('workout.overviewNow') }}</span>
        </button>
      </li>
    </ol>
  </BottomSheet>
</template>

<style scoped>
.list {
  list-style: none;
  padding: 0;
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  overflow: hidden;
}

.list li + li {
  border-top: 1px solid var(--color-border);
}

.item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 64px;
  padding: var(--space-3) var(--space-4);
  border: none;
  text-align: left;
  font: inherit;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.item:active,
.item--current {
  background: var(--color-background-mute);
}

.item__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.item__name {
  font-size: 15px;
  font-weight: var(--weight-medium);
  color: var(--color-heading);
}

.item__meta {
  font-size: var(--text-small);
  font-variant-numeric: tabular-nums;
}

.item__check {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--color-on-accent);
  background: var(--color-accent);
}

.item__now {
  flex-shrink: 0;
  padding: 2px var(--space-2);
  border-radius: var(--radius-pill);
  font-size: var(--text-micro);
  font-weight: var(--weight-heavy);
  color: var(--color-background);
  background: var(--color-heading);
}
</style>
