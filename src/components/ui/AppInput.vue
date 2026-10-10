<script setup lang="ts">
/**
 * A labelled text field. The label is always visible (a placeholder is not a
 * label), an error replaces the hint, and the text is 16px so iOS does not
 * zoom the page when the field takes focus.
 */
withDefaults(
  defineProps<{
    label: string
    hint?: string
    error?: string
    type?: string
    placeholder?: string
    inputmode?: 'text' | 'decimal' | 'numeric' | 'email' | 'search' | 'tel' | 'url'
    autocomplete?: string
    maxlength?: number
    disabled?: boolean
  }>(),
  {
    hint: '',
    error: '',
    type: 'text',
    placeholder: '',
    inputmode: undefined,
    autocomplete: 'off',
    maxlength: undefined,
    disabled: false,
  },
)

const model = defineModel<string>({ default: '' })
</script>

<template>
  <label class="field" :class="{ 'field--error': !!error }">
    <span class="field__label">{{ label }}</span>
    <input
      v-model="model"
      class="field__input"
      :type="type"
      :placeholder="placeholder"
      :inputmode="inputmode"
      :autocomplete="autocomplete"
      :maxlength="maxlength"
      :disabled="disabled"
      :aria-invalid="!!error"
    />
    <span v-if="error" class="field__note field__note--error" role="alert">{{ error }}</span>
    <span v-else-if="hint" class="field__note">{{ hint }}</span>
  </label>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field__label {
  font-size: var(--text-small);
  font-weight: var(--weight-medium);
  color: var(--color-text);
}

.field__input {
  width: 100%;
  min-height: var(--size-control);
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 14px;
  font: inherit;
  font-size: var(--text-body);
  color: var(--color-heading);
  background: var(--color-background-soft);
  outline: none;
}

.field__input::placeholder {
  color: var(--color-text);
  opacity: 0.7;
}

.field__input:focus {
  border-color: var(--color-border-hover);
}

.field__input:disabled {
  opacity: 0.5;
}

.field--error .field__input {
  border-color: var(--color-danger);
}

.field__note {
  font-size: var(--text-small);
  line-height: 1.4;
}

.field__note--error {
  color: var(--color-danger);
}
</style>
