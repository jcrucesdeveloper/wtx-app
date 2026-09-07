<script setup lang="ts">
import { computed } from 'vue'
import type { WorkoutTemplate } from '@/lib/wtx'
import { formatNumber } from '@/lib/format'

const props = defineProps<{
  template: WorkoutTemplate
}>()

const chips = computed(() => {
  const t = props.template
  const items = [`${t.exerciseCount} ${t.exerciseCount === 1 ? 'exercise' : 'exercises'}`]
  if (t.totalTime > 0) items.push(`~${t.totalTimeHumanReadable}`)
  if (t.estimatedVolume > 0) {
    items.push(`${formatNumber(t.estimatedVolume)} ${t.unit ?? ''}`.trim() + ' volume')
  }
  return items
})
</script>

<template>
  <div class="summary">
    <span v-for="chip in chips" :key="chip" class="chip">{{ chip }}</span>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--color-background-mute);
  color: var(--color-text);
}
</style>
