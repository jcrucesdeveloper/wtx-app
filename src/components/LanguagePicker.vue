<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Locale } from '@/i18n'

defineProps<{
  modelValue: Locale
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Locale]
}>()

const { t } = useI18n()

const OPTIONS = computed<{ value: Locale; label: string }[]>(() => [
  { value: 'en', label: t('settings.languageEnglish') },
  { value: 'es', label: t('settings.languageSpanish') },
])
</script>

<template>
  <div class="language-picker" role="radiogroup" :aria-label="t('settings.language')">
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
.language-picker {
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
