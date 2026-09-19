<script setup lang="ts">
import { computed } from 'vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { formatClock } from '@/lib/format'

const activeSession = useActiveSessionStore()

const visible = computed(() => activeSession.session?.restEndsAt != null)
</script>

<template>
  <div v-if="visible" class="bar">
    <span class="bar__label">Rest</span>
    <span class="bar__time">{{ formatClock(activeSession.restRemainingSeconds) }}</span>
    <div class="bar__actions">
      <button type="button" @click="activeSession.adjustRestTimer(-15)">−15s</button>
      <button type="button" @click="activeSession.adjustRestTimer(15)">+15s</button>
      <button type="button" class="bar__skip" @click="activeSession.skipRestTimer()">Skip</button>
    </div>
  </div>
</template>

<style scoped>
.bar {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px -20px -24px;
  padding: 10px 20px calc(10px + env(safe-area-inset-bottom));
  background: var(--color-background-soft);
  border-top: 1px solid var(--color-border-hover);
}

.bar__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.bar__time {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-heading);
}

.bar__actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.bar__actions button {
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  cursor: pointer;
}

.bar__skip {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}
</style>
