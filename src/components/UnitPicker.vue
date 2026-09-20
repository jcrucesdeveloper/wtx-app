<script setup lang="ts">
import type { WeightUnit } from '@/stores/settings'

defineProps<{
  modelValue: WeightUnit
}>()

const emit = defineEmits<{
  'update:modelValue': [value: WeightUnit]
}>()

const OPTIONS: { value: WeightUnit; label: string }[] = [
  { value: 'kg', label: 'Kilograms' },
  { value: 'lb', label: 'Pounds' },
]
</script>

<template>
  <div class="unit-picker" role="radiogroup" aria-label="Default weight unit">
    <button
      v-for="option in OPTIONS"
      :key="option.value"
      type="button"
      class="option"
      :class="{ 'option--active': option.value === modelValue }"
      role="radio"
      :aria-checked="option.value === modelValue"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.unit-picker {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.option {
  padding: 10px 8px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-background-mute);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  cursor: pointer;
}

.option--active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
