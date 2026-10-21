<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Timer, TimerOff } from '@lucide/vue'
import RestTimeSheet from '@/components/session/RestTimeSheet.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { formatClock } from '@/lib/format'

/**
 * The exercise's rest, a chip beside the set's type: how long every set of it
 * rests (warm-ups aside), tapped to change it. One setting per exercise, so
 * it shows once, not on every set. It always shows the setting; a running
 * rest counts down in the timer above the log button.
 */
const props = defineProps<{ exerciseIndex: number }>()

const { t } = useI18n()
const activeSession = useActiveSessionStore()

const seconds = computed(
  () => activeSession.session?.draft.exercises[props.exerciseIndex]?.restSeconds ?? 0,
)

const editing = ref(false)
</script>

<template>
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
  <RestTimeSheet :open="editing" :exercise-index="exerciseIndex" @close="editing = false" />
</template>

<style scoped>
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
</style>
