<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Trash2 } from '@lucide/vue'
import { useRoutinesStore } from '@/stores/routines'
import { parseTemplateText } from '@/lib/parseRoutine'
import { HapticsService } from '@/services/haptics'

/**
 * A routine just deleted: what went, and the way back, for a few seconds.
 * App-wide, because deleting from a routine's screen leaves that screen.
 * Deleting doesn't ask first; this is the safety net instead, the same one a
 * deleted set has.
 */
const { t } = useI18n()
const routines = useRoutinesStore()

const name = computed(() => {
  const removed = routines.removed
  if (!removed) return ''
  const result = parseTemplateText(removed.routine.rawText)
  return result.ok && result.template.name ? result.template.name : removed.routine.filename
})

function undo() {
  routines.restore()
  void HapticsService.light()
}
</script>

<template>
  <div class="undo-bar" aria-live="polite">
    <p v-if="routines.removed" class="undo" role="status">
      <Trash2 :size="18" :stroke-width="2.25" />
      <span class="undo__text">{{ t('routineDetail.deleted', { name }) }}</span>
      <button type="button" class="undo__btn" @click="undo">
        {{ t('workout.undo') }}
      </button>
    </p>
  </div>
</template>

<style scoped>
/* Rides above the bottom bar, like the workout strip, never over its tabs. */
.undo-bar {
  margin: 0 var(--space-3);
}

.undo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--size-touch);
  margin-bottom: var(--space-2);
  padding-left: var(--space-3);
  border-radius: var(--radius-lg);
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  background: var(--color-background-soft);
  box-shadow: inset 0 0 0 1px var(--color-border-hover);
}

.undo__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.undo__btn {
  flex-shrink: 0;
  min-width: var(--size-touch);
  height: 36px;
  margin-right: 4px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: 15px;
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  background: var(--color-background-mute);
  cursor: pointer;
}

.undo__btn:active {
  transform: scale(0.94);
}
</style>
