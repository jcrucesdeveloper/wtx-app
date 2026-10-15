<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BellRing } from '@lucide/vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useExerciseName } from '@/composables/useExerciseName'
import { formatClock } from '@/lib/format'
import { REST_STEP_SECONDS, restProgress } from '@/lib/restTime'
import { HapticsService } from '@/services/haptics'

/**
 * The rest between sets, in the dock: a panel above the one button, so it is
 * the first thing the eye lands on while resting and the button under it
 * still logs the next set. Big digits, a bar that empties across the whole
 * panel, and the three things you do to a rest — less, more, skip — at full
 * touch size. When it runs out on its own it says so, briefly, in the accent.
 */
const { t } = useI18n()
const { exerciseName } = useExerciseName()
const activeSession = useActiveSessionStore()

const endsAt = computed(() => activeSession.session?.restEndsAt ?? null)
const resting = computed(() => endsAt.value !== null)
const remaining = computed(() => activeSession.restRemainingSeconds)
const fraction = computed(() =>
  restProgress(remaining.value, activeSession.session?.restDurationSeconds ?? null),
)
/** The last seconds: the digits beat once a second, so the end is seen coming. */
const ending = computed(() => resting.value && remaining.value <= 5)

const restingAfter = computed(() => {
  const index = activeSession.session?.restExerciseIndex
  const exercise = index != null ? activeSession.session?.draft.exercises[index] : undefined
  return exercise ? exerciseName(exercise.name) : ''
})

/** The timer ran out on its own (not skipped or stopped): said once, briefly. */
const restOver = ref(false)
let restOverTimer: ReturnType<typeof setTimeout> | undefined

watch(endsAt, (now, before) => {
  if (now !== null || before === null) return
  // Skipped, turned off or taken away with its exercise: ended early, so nothing to say.
  if (Date.now() < before) return
  restOver.value = true
  clearTimeout(restOverTimer)
  restOverTimer = setTimeout(() => (restOver.value = false), 2600)
})

watch(resting, (now) => {
  if (now) restOver.value = false
})

onBeforeUnmount(() => clearTimeout(restOverTimer))

function adjust(seconds: number) {
  activeSession.adjustRestTimer(seconds)
  void HapticsService.selection()
}

function skip() {
  activeSession.skipRestTimer()
  void HapticsService.selection()
}
</script>

<template>
  <p v-if="restOver && !resting" class="rest-over" role="status">
    <BellRing :size="20" :stroke-width="2.5" />
    {{ t('workout.restOver') }}
  </p>

  <section
    v-if="resting"
    class="rest"
    :class="{ 'rest--ending': ending }"
    role="timer"
    :aria-label="t('restTimer.panelAria', { time: formatClock(remaining) })"
  >
    <div class="rest__body">
      <span class="rest__label">
        {{
          restingAfter ? t('restTimer.after', { name: restingAfter }) : t('session.restTimer.rest')
        }}
      </span>
      <!-- Keyed by the second, so the last few can beat once each. -->
      <span :key="ending ? remaining : 'time'" class="rest__time">{{
        formatClock(remaining)
      }}</span>
    </div>
    <div class="rest__actions">
      <button
        type="button"
        class="rest__btn"
        :aria-label="t('restTimer.lessAria', { n: REST_STEP_SECONDS })"
        @click="adjust(-REST_STEP_SECONDS)"
      >
        −{{ REST_STEP_SECONDS }}
      </button>
      <button
        type="button"
        class="rest__btn"
        :aria-label="t('restTimer.moreAria', { n: REST_STEP_SECONDS })"
        @click="adjust(REST_STEP_SECONDS)"
      >
        +{{ REST_STEP_SECONDS }}
      </button>
      <button type="button" class="rest__btn rest__btn--skip" @click="skip">
        {{ t('session.restTimer.skip') }}
      </button>
    </div>
    <span class="rest__track" aria-hidden="true">
      <i :style="{ transform: `scaleX(${fraction})` }" />
    </span>
  </section>
</template>

<style scoped>
.rest {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 76px;
  padding: calc(var(--space-3) + 6px) var(--space-3) var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  box-shadow: inset 0 0 0 1px var(--color-border-hover);
  overflow: hidden;
  animation: rest-in var(--motion-base) var(--ease-out);
}

.rest__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rest__label {
  font-size: var(--text-small);
  font-weight: var(--weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rest__time {
  font-size: 40px;
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
  transform-origin: left center;
}

.rest--ending .rest__time {
  color: var(--color-accent);
}

.rest__actions {
  flex-shrink: 0;
  display: flex;
  gap: 6px;
}

.rest__btn {
  min-width: var(--size-touch);
  height: var(--size-touch);
  padding: 0 10px;
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

.rest__btn:active {
  transform: scale(0.94);
}

.rest__btn--skip {
  padding: 0 14px;
}

/* The bar empties across the whole panel, along its top edge. */
.rest__track {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 6px;
  background: var(--color-background-mute);
}

.rest__track i {
  display: block;
  height: 100%;
  background: var(--color-accent);
  transform-origin: left;
}

/* Over: one line where the timer was, tinted with the accent — not filled,
   so it never reads as a second button above the real one. Gone on its own. */
.rest-over {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--size-touch);
  border-radius: var(--radius-lg);
  font-size: var(--text-body);
  font-weight: var(--weight-heavy);
  color: var(--color-heading);
  background: color-mix(in srgb, var(--color-accent) 16%, var(--color-background-soft));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 45%, transparent);
  animation: rest-in var(--motion-base) var(--ease-spring);
}

.rest-over svg {
  color: var(--color-accent);
}

@keyframes rest-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.98);
  }
}

/* Movement only. With reduced motion the bar steps and the digits just change colour. */
@media (prefers-reduced-motion: no-preference) {
  .rest__track i {
    transition: transform 1s linear;
  }

  .rest--ending .rest__time {
    animation: rest-beat 0.4s var(--ease-out);
  }
}

@keyframes rest-beat {
  from {
    transform: scale(1.12);
  }
}
</style>
