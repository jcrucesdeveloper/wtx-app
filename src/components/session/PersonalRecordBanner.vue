<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Trophy } from '@lucide/vue'
import type { PersonalRecord } from '@/lib/sessionRecords'

defineProps<{
  record: PersonalRecord
  unit?: string
}>()

const { t } = useI18n()
</script>

<template>
  <div class="pr">
    <Trophy :size="22" :stroke-width="2.25" class="pr__icon" />
    <div class="pr__body">
      <span class="pr__title">{{ t('session.personalRecordBanner.title') }}</span>
      <span class="pr__detail">
        {{ record.exerciseName }} — {{ record.weight }} {{ unit }}
        <span class="pr__previous">{{
          t('session.personalRecordBanner.was', { value: record.previousWeight, unit })
        }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.pr {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-background-soft));
  border: 1px solid var(--color-accent);
}

.pr__icon {
  flex-shrink: 0;
  color: var(--color-accent);
}

.pr__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.pr__title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: var(--color-accent);
}

.pr__detail {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-heading);
}

.pr__previous {
  font-weight: 500;
  opacity: 0.6;
}
</style>
