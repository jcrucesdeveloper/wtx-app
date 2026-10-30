<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Minus, Play, Plus, Square } from '@lucide/vue'
import DurationInput from '@/components/session/DurationInput.vue'
import { formatDurationInput } from '@/lib/durationInput'
import { HapticsService } from '@/services/haptics'

/**
 * The one entry of an exercise tracked by time: one large mm:ss field with a
 * step either side, in place of the weight and reps fields, and a stopwatch
 * under it for timing it there and then. A timed exercise has no weight — a
 * treadmill or a plank is logged by how long it lasted.
 *
 * The stopwatch counts up from Start; Stop puts what it counted in the field,
 * ready to log (or nudge first). It buzzes once on reaching the target, so a
 * plank can be held with eyes shut. It lives only as long as the field: it is
 * a way to fill the number, not part of the workout's saved state.
 */
const props = defineProps<{
  /** What it will be logged as: typed, else last time's, else the plan. */
  seconds: number
  /** The duration aimed for, to buzz at; none at 0. */
  target?: number
}>()

const emit = defineEmits<{ update: [seconds: number | null] }>()

const { t } = useI18n()

/** Big enough to matter on a treadmill, small enough for a plank. */
const STEP_SECONDS = 15

function step(delta: number) {
  emit('update', Math.max(0, props.seconds + delta))
  void HapticsService.selection()
}

/** Epoch millis the stopwatch started at; `null` while stopped. */
const startedAt = ref<number | null>(null)
const nowMs = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | undefined
let buzzed = false

const running = computed(() => startedAt.value !== null)
/** From the clock, never counted up: right again after the phone sleeps. */
const elapsed = computed(() =>
  startedAt.value === null ? 0 : Math.max(0, Math.floor((nowMs.value - startedAt.value) / 1000)),
)

function tick() {
  nowMs.value = Date.now()
  if (!buzzed && props.target && elapsed.value >= props.target) {
    buzzed = true
    void HapticsService.success()
  }
}

function start() {
  startedAt.value = nowMs.value = Date.now()
  buzzed = false
  ticker = setInterval(tick, 250)
  void HapticsService.light()
}

/** Puts what was counted in the field, at once: logging straight after reads it. */
function stop() {
  if (startedAt.value === null) return
  tick()
  const counted = elapsed.value
  clearInterval(ticker)
  startedAt.value = null
  emit('update', counted)
}

function toggleStopwatch() {
  if (running.value) {
    stop()
    void HapticsService.medium()
  } else start()
}

onBeforeUnmount(() => clearInterval(ticker))

defineExpose({ running, stop })
</script>

<template>
  <div class="fields">
    <div class="field">
      <button
        type="button"
        class="field__step"
        :disabled="running"
        :aria-label="t('timedExercise.less', { seconds: STEP_SECONDS })"
        @click="step(-STEP_SECONDS)"
      >
        <Minus :size="20" :stroke-width="2.5" />
      </button>
      <label class="field__value">
        <span v-if="running" class="field__input field__input--running" role="timer">{{
          formatDurationInput(elapsed)
        }}</span>
        <DurationInput
          v-else
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
        :disabled="running"
        :aria-label="t('timedExercise.more', { seconds: STEP_SECONDS })"
        @click="step(STEP_SECONDS)"
      >
        <Plus :size="20" :stroke-width="2.5" />
      </button>
    </div>
    <button
      type="button"
      class="stopwatch"
      :class="{ 'stopwatch--running': running }"
      :aria-pressed="running"
      @click="toggleStopwatch"
    >
      <Square v-if="running" :size="16" :stroke-width="2.5" fill="currentColor" />
      <Play v-else :size="16" :stroke-width="2.5" fill="currentColor" />
      {{ running ? t('timedExercise.stop') : t('timedExercise.start') }}
    </button>
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

.field__step:disabled {
  opacity: 0.35;
  cursor: default;
}

.field__step:active:not(:disabled) {
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

.field__input--running {
  width: auto;
  color: var(--color-accent);
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

/* Quieter than the log button below it: timing is optional, logging isn't. */
.stopwatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 48px;
  border: none;
  border-radius: var(--radius-lg);
  font: inherit;
  font-size: 15px;
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  background: var(--color-background-soft);
  cursor: pointer;
}

.stopwatch:active {
  transform: scale(0.98);
}

.stopwatch--running {
  color: var(--color-accent);
}
</style>
