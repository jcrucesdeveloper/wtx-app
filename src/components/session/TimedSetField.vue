<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Minus, Plus } from '@lucide/vue'
import DurationInput from '@/components/session/DurationInput.vue'
import { HapticsService } from '@/services/haptics'

/**
 * The set you're on, for an exercise tracked by time: one large mm:ss field
 * with a step either side, in place of the weight and reps fields. A timed
 * set has no weight — a treadmill or a plank is logged by how long it lasted.
 */
const props = defineProps<{
  /** What the set will be logged as: typed, else last time's, else the plan. */
  seconds: number
}>()

const emit = defineEmits<{ update: [seconds: number | null] }>()

const { t } = useI18n()

/** Big enough to matter on a treadmill, small enough for a plank. */
const STEP_SECONDS = 15

function step(delta: number) {
  emit('update', Math.max(0, props.seconds + delta))
  void HapticsService.selection()
}
</script>

<template>
  <div class="fields">
    <div class="field">
      <button
        type="button"
        class="field__step"
        :aria-label="t('timedExercise.less', { seconds: STEP_SECONDS })"
        @click="step(-STEP_SECONDS)"
      >
        <Minus :size="20" :stroke-width="2.5" />
      </button>
      <label class="field__value">
        <DurationInput
          class="field__input"
          :model-value="seconds"
          :aria-label="t('timedExercise.duration')"
          @update:model-value="emit('update', $event)"
        />
        <span class="field__unit">{{ t('timedExercise.minSec') }}</span>
      </label>
      <button
        type="button"
        class="field__step"
        :aria-label="t('timedExercise.more', { seconds: STEP_SECONDS })"
        @click="step(STEP_SECONDS)"
      >
        <Plus :size="20" :stroke-width="2.5" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Matches FocusSession's weight and reps fields, so switching kinds only
   changes what's in the box. */
.fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field {
  display: grid;
  grid-template-columns: 64px 1fr 64px;
  align-items: center;
  height: 76px;
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
}

.field__step {
  display: grid;
  place-items: center;
  height: 100%;
  border: none;
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.field__step:active {
  color: var(--color-heading);
  transform: scale(0.9);
}

.field__value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}

.field__input {
  width: 5ch;
  field-sizing: content;
  min-width: 3ch;
  max-width: 100%;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 40px;
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  text-align: center;
  color: var(--color-heading);
  background: transparent;
  outline: none;
  font-variant-numeric: tabular-nums;
}

@supports (field-sizing: content) {
  .field__input {
    width: auto;
  }
}

.field__unit {
  font-size: 15px;
  font-weight: var(--weight-medium);
}
</style>
