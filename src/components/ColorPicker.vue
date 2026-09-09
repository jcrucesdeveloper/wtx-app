<script setup lang="ts">
import { ACCENT_COLORS, type AccentColor } from '@/config/theme'

withDefaults(
  defineProps<{
    modelValue: string
    options?: AccentColor[]
  }>(),
  {
    options: () => ACCENT_COLORS,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function select(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="color-picker" role="radiogroup" aria-label="Accent color">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="swatch"
      :class="{ 'swatch--active': option.value === modelValue }"
      :style="{ '--swatch': option.value }"
      role="radio"
      :aria-checked="option.value === modelValue"
      :aria-label="option.name"
      :title="option.name"
      @click="select(option.value)"
    >
      <svg
        v-if="option.value === modelValue"
        class="swatch__check"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.color-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: 12px;
}

.swatch {
  position: relative;
  aspect-ratio: 1;
  border: none;
  border-radius: var(--radius-md);
  background: var(--swatch);
  cursor: pointer;
  padding: 0;
  color: #fff;
  box-shadow: 0 0 0 0 var(--swatch);
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}

.swatch:hover {
  transform: scale(1.06);
}

.swatch--active {
  box-shadow:
    0 0 0 3px var(--color-background),
    0 0 0 6px var(--swatch);
}

.swatch__check {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 55%;
  height: 55%;
}
</style>
