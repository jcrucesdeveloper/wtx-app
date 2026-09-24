<script setup lang="ts">
import { computed } from 'vue'
import { Flame } from '@lucide/vue'

const props = defineProps<{
  weekStreak: number
}>()

/** Loss-aversion framing: emphasize keeping the streak alive, not just its size. */
const label = computed(() => {
  if (props.weekStreak <= 1) return "You're on the board — come back next week to keep it going."
  return "Don't break it now — train again next week to extend the streak."
})
</script>

<template>
  <div class="streak">
    <Flame :size="22" :stroke-width="2.25" class="streak__icon" />
    <div class="streak__body">
      <span class="streak__value"
        >{{ weekStreak }} week{{ weekStreak === 1 ? '' : 's' }} in a row</span
      >
      <span class="streak__label">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.streak {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.streak__icon {
  flex-shrink: 0;
  color: var(--color-accent);
}

.streak__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.streak__value {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

.streak__label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.65;
}
</style>
