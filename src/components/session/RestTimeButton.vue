<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Play, Timer, TimerOff } from '@lucide/vue'
import RestTimeSheet from '@/components/session/RestTimeSheet.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { formatClock } from '@/lib/format'
import { HapticsService } from '@/services/haptics'

/**
 * The exercise's rest, a chip beside the set's type: how long every set of it
 * rests, warm-ups and drop sets included, tapped to change it. One setting
 * per exercise, so it shows once, not on every set. It always shows the setting; a running
 * rest counts down in the timer above the log button.
 *
 * With no rest running and a set already logged, a play button rides on the
 * chip: it starts the rest after the last logged set, for a rest skipped by
 * mistake — no un-logging and re-logging a set to get it back.
 */
const props = defineProps<{ exerciseIndex: number }>()

const { t } = useI18n()
const activeSession = useActiveSessionStore()

const seconds = computed(
  () => activeSession.session?.draft.exercises[props.exerciseIndex]?.restSeconds ?? 0,
)

const editing = ref(false)

/** Only when a rest could start now: rest on, none running, a set logged. */
const canStartRest = computed(() => activeSession.manualRestSetId(props.exerciseIndex) !== null)

function startRest() {
  activeSession.startRestNow(props.exerciseIndex)
  void HapticsService.selection()
}
</script>

<template>
  <div class="rest-time-group" :class="{ 'rest-time-group--start': canStartRest }">
    <button
      type="button"
      class="rest-time"
      :class="{ 'rest-time--off': !seconds }"
      :aria-label="
        seconds ? t('restTimer.buttonAria', { time: formatClock(seconds) }) : t('restTimer.offAria')
      "
      @click="editing = true"
    >
      <component :is="seconds ? Timer : TimerOff" :size="15" :stroke-width="2.5" />
      <span>{{ seconds ? formatClock(seconds) : t('restTimer.off') }}</span>
    </button>
    <button
      v-if="canStartRest"
      type="button"
      class="rest-start"
      data-test="rest-start"
      :aria-label="t('restTimer.startNowAria')"
      @click="startRest"
    >
      <Play :size="14" :stroke-width="2.75" fill="currentColor" />
    </button>
  </div>
  <RestTimeSheet :open="editing" :exercise-index="exerciseIndex" @close="editing = false" />
</template>

<style scoped>
/* The chip and, when a rest can start by hand, its play button: one pill, two taps. */
.rest-time-group {
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
}

.rest-time-group--start .rest-time {
  padding-right: 8px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

/* The same pill as the set-type chip beside it. */
.rest-time {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  background: var(--color-background-mute);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.rest-time--off {
  color: var(--color-text);
}

.rest-time:active {
  transform: scale(0.96);
}

/* The accent marks the one thing here that does something now. The hit area
   reaches past the pill so the row stays 36px tall but the tap is 44px. */
.rest-start {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  min-height: 36px;
  margin-left: 2px;
  padding: 0;
  border: none;
  border-top-right-radius: var(--radius-pill);
  border-bottom-right-radius: var(--radius-pill);
  color: var(--color-on-accent);
  background: var(--color-accent);
  cursor: pointer;
}

.rest-start::before {
  content: '';
  position: absolute;
  inset: -4px -4px -4px 0;
}

.rest-start:active {
  transform: scale(0.94);
}
</style>
