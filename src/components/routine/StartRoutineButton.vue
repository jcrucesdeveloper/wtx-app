<script setup lang="ts">
import { useStartRoutine } from '@/composables/useStartRoutine'

const props = defineProps<{
  routineId: string
}>()

const { startRoutine } = useStartRoutine()

function onClick() {
  startRoutine(props.routineId)
}
</script>

<template>
  <button type="button" class="start-btn" @click.stop.prevent="onClick">Start routine</button>
</template>

<style scoped>
.start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  border: none;
  border-radius: var(--radius-md);
  padding: 10px 16px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}

.start-btn:active {
  opacity: 0.85;
}
</style>
