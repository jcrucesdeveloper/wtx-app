<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Monitor, Sun, Moon } from '@lucide/vue'
import type { ThemeMode } from '@/stores/theme'

defineProps<{
  modelValue: ThemeMode
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ThemeMode]
}>()

const { t } = useI18n()

const OPTIONS = computed<{ value: ThemeMode; label: string; icon: typeof Monitor }[]>(() => [
  { value: 'native', label: t('themeModePicker.native'), icon: Monitor },
  { value: 'light', label: t('themeModePicker.light'), icon: Sun },
  { value: 'dark', label: t('themeModePicker.dark'), icon: Moon },
])
</script>

<template>
  <div class="mode-picker" role="radiogroup" :aria-label="t('themeModePicker.titleAria')">
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
      <component :is="option.icon" :size="16" :stroke-width="2.25" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.mode-picker {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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
