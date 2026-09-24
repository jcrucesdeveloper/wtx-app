<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { WorkoutTemplate } from '@/lib/wtx'
import { formatNumber } from '@/lib/format'

const props = defineProps<{
  template: WorkoutTemplate
}>()

const { t: translate } = useI18n()

const chips = computed(() => {
  const tmpl = props.template
  const items = [translate('routine.summary.exercise', { count: tmpl.exerciseCount }, tmpl.exerciseCount)]
  if (tmpl.totalTime > 0) items.push(`~${tmpl.totalTimeHumanReadable}`)
  if (tmpl.estimatedVolume > 0) {
    const amount = `${formatNumber(tmpl.estimatedVolume)} ${tmpl.unit ?? ''}`.trim()
    items.push(translate('routine.summary.volume', { amount }))
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
  font-size: 11px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: var(--radius-xs);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}
</style>
