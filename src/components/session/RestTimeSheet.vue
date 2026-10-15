<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Minus, Plus } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useRoutinesStore } from '@/stores/routines'
import { useExerciseName } from '@/composables/useExerciseName'
import { formatClock } from '@/lib/format'
import { serializeTemplate } from '@/lib/serializeRoutine'
import {
  REST_MAX_SECONDS,
  REST_PRESETS,
  REST_STEP_SECONDS,
  clampRestSeconds,
  routineDraftWithRest,
  routineHasExercise,
} from '@/lib/restTime'
import { HapticsService } from '@/services/haptics'

/**
 * How long to rest after an exercise's sets: a preset in one tap, or any
 * length in 15-second steps. It changes this workout; the routine changes
 * too only when asked, here, in the same place — a rest that is right today
 * is not always the plan.
 */
const props = defineProps<{ open: boolean; exerciseIndex: number }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const { exerciseName } = useExerciseName()
const activeSession = useActiveSessionStore()
const routines = useRoutinesStore()

const exercise = computed(() => activeSession.session?.draft.exercises[props.exerciseIndex])

const routineId = computed(() => activeSession.session?.routineId)
const template = computed(() => {
  if (!routineId.value) return undefined
  const result = routines.parsed(routineId.value)
  return result?.ok ? result.template : undefined
})
/** An exercise added or swapped in mid-workout isn't in the routine, so there is nothing to change there. */
const canSaveToRoutine = computed(
  () =>
    !!template.value && !!exercise.value && routineHasExercise(template.value, exercise.value.name),
)

const seconds = ref(0)
const alsoRoutine = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    seconds.value = clampRestSeconds(exercise.value?.restSeconds ?? 0)
    alsoRoutine.value = false
  },
  { immediate: true },
)

function label(value: number): string {
  return value > 0 ? formatClock(value) : t('restTimer.off')
}

function pick(value: number) {
  seconds.value = value
  void HapticsService.selection()
}

function step(delta: number) {
  seconds.value = clampRestSeconds(seconds.value + delta)
  void HapticsService.selection()
}

function save() {
  const value = clampRestSeconds(seconds.value)
  activeSession.setRestSeconds(props.exerciseIndex, value)
  if (alsoRoutine.value && template.value && exercise.value && routineId.value) {
    const draft = routineDraftWithRest(template.value, exercise.value.name, value)
    if (draft) routines.update(routineId.value, serializeTemplate(draft))
  }
  void HapticsService.light()
  emit('close')
}
</script>

<template>
  <BottomSheet :open="open" :title="t('restTimer.title')" @close="emit('close')">
    <div class="rest-edit">
      <p class="rest-edit__hint">
        {{ t('restTimer.hint', { name: exercise ? exerciseName(exercise.name) : '' }) }}
      </p>

      <div class="rest-edit__value">
        <button
          type="button"
          class="rest-edit__step"
          :aria-label="t('restTimer.lessAria', { n: REST_STEP_SECONDS })"
          :disabled="seconds <= 0"
          @click="step(-REST_STEP_SECONDS)"
        >
          <Minus :size="22" :stroke-width="2.5" />
        </button>
        <output class="rest-edit__time" :class="{ 'rest-edit__time--off': seconds === 0 }">
          {{ label(seconds) }}
        </output>
        <button
          type="button"
          class="rest-edit__step"
          :aria-label="t('restTimer.moreAria', { n: REST_STEP_SECONDS })"
          :disabled="seconds >= REST_MAX_SECONDS"
          @click="step(REST_STEP_SECONDS)"
        >
          <Plus :size="22" :stroke-width="2.5" />
        </button>
      </div>

      <div class="rest-edit__presets" role="group" :aria-label="t('restTimer.presets')">
        <button
          v-for="preset in REST_PRESETS"
          :key="preset"
          type="button"
          class="rest-edit__preset"
          :aria-pressed="seconds === preset"
          @click="pick(preset)"
        >
          {{ label(preset) }}
        </button>
      </div>

      <label v-if="canSaveToRoutine" class="rest-edit__routine">
        <input v-model="alsoRoutine" type="checkbox" />
        <span class="rest-edit__routine-body">
          <span class="rest-edit__routine-title">
            {{ t('restTimer.saveToRoutine', { routine: template?.name ?? '' }) }}
          </span>
          <span class="rest-edit__routine-desc">{{ t('restTimer.saveToRoutineDesc') }}</span>
        </span>
      </label>

      <AppButton variant="primary" size="lg" block @click="save">
        {{ t('restTimer.save') }}
      </AppButton>
    </div>
  </BottomSheet>
</template>

<style scoped>
.rest-edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.rest-edit__hint {
  font-size: var(--text-small);
  line-height: 1.45;
}

.rest-edit__value {
  display: grid;
  grid-template-columns: 64px 1fr 64px;
  align-items: center;
  height: 76px;
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
}

.rest-edit__step {
  display: grid;
  place-items: center;
  height: 100%;
  border: none;
  color: var(--color-heading);
  background: transparent;
  cursor: pointer;
}

.rest-edit__step:disabled {
  opacity: 0.3;
  cursor: default;
}

.rest-edit__step:active:not(:disabled) {
  transform: scale(0.9);
}

.rest-edit__time {
  text-align: center;
  font-size: 40px;
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.rest-edit__time--off {
  color: var(--color-text);
}

.rest-edit__presets {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
}

.rest-edit__preset {
  min-height: var(--size-touch);
  border: none;
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: 15px;
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  background: var(--color-background-mute);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.rest-edit__preset[aria-pressed='true'] {
  color: var(--color-background);
  background: var(--color-heading);
}

.rest-edit__preset:active {
  transform: scale(0.96);
}

.rest-edit__routine {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  cursor: pointer;
}

.rest-edit__routine input {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  margin-top: 1px;
  accent-color: var(--color-heading);
}

.rest-edit__routine-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rest-edit__routine-title {
  font-size: var(--text-body);
  font-weight: var(--weight-medium);
  color: var(--color-heading);
}

.rest-edit__routine-desc {
  font-size: var(--text-small);
  line-height: 1.35;
}
</style>
