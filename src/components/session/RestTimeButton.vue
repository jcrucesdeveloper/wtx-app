<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Timer, TimerOff } from '@lucide/vue'
import RestTimeSheet from '@/components/session/RestTimeSheet.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { formatClock } from '@/lib/format'
import type { SessionSetDraft } from '@/lib/serializeSession'

/**
 * A set row's rest: how long the exercise rests after a set, tapped to change
 * it. On the set whose rest is running it counts down instead, so the row you
 * just logged says how long until the next. A warm-up starts no rest, so its
 * row keeps the space empty and the columns stay lined up.
 */
const props = defineProps<{ exerciseIndex: number; set: SessionSetDraft }>()

const { t } = useI18n()
const activeSession = useActiveSessionStore()

const seconds = computed(
  () => activeSession.session?.draft.exercises[props.exerciseIndex]?.restSeconds ?? 0,
)
const live = computed(() => {
  const session = activeSession.session
  return (
    !!session?.restEndsAt &&
    session.restExerciseIndex === props.exerciseIndex &&
    session.restSetId === props.set.id
  )
})
const shown = computed(() => (live.value ? activeSession.restRemainingSeconds : seconds.value))

const editing = ref(false)
</script>

<template>
  <span v-if="set.type === 'W'" class="rest-time rest-time--none" aria-hidden="true" />
  <button
    v-else
    type="button"
    class="rest-time"
    :class="{ 'rest-time--off': !shown, 'rest-time--live': live }"
    :aria-label="
      shown ? t('restTimer.buttonAria', { time: formatClock(shown) }) : t('restTimer.offAria')
    "
    @click.stop="editing = true"
  >
    <component :is="shown ? Timer : TimerOff" :size="15" :stroke-width="2.5" />
    <span v-if="shown">{{ formatClock(shown) }}</span>
  </button>
  <RestTimeSheet
    v-if="set.type !== 'W'"
    :open="editing"
    :exercise-index="exerciseIndex"
    @close="editing = false"
  />
</template>

<style scoped>
/* Width comes from the set list (`--rest-time-width`), so its head lines up. */
.rest-time {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: var(--rest-time-width, 60px);
  height: var(--size-control);
  border: none;
  padding: 0;
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-text);
  background: transparent;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.rest-time--none {
  cursor: inherit;
}

.rest-time--off {
  opacity: 0.55;
}

.rest-time:active:not(.rest-time--none) {
  color: var(--color-heading);
  transform: scale(0.94);
}

/* The rest running after this set: counting down, in the accent. */
.rest-time--live {
  color: var(--color-accent);
}
</style>
