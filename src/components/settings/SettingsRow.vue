<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'

/**
 * One line of the settings screen: what it is on the left, its value or
 * control on the right. `action` makes the whole row a button; `#below`
 * holds a control too wide to sit beside the label.
 */
withDefaults(
  defineProps<{
    label: string
    /** A second, quieter line under the label. */
    hint?: string
    /** The whole row is tappable and shows a chevron. */
    action?: boolean
    /** Destructive: red text, never a filled button. */
    danger?: boolean
    disabled?: boolean
  }>(),
  { hint: '', action: false, danger: false, disabled: false },
)

defineEmits<{ click: [] }>()
</script>

<template>
  <component
    :is="action ? 'button' : 'div'"
    :type="action ? 'button' : undefined"
    class="row"
    :class="{ 'row--action': action, 'row--danger': danger }"
    :disabled="action ? disabled : undefined"
    @click="action && $emit('click')"
  >
    <span class="row__main">
      <span class="row__text">
        <span class="row__label">{{ label }}</span>
        <span v-if="hint" class="row__hint">{{ hint }}</span>
      </span>
      <span v-if="$slots.default" class="row__end"><slot /></span>
      <ChevronRight v-else-if="action && !danger" :size="18" class="row__chevron" />
    </span>
    <span v-if="$slots.below" class="row__below"><slot name="below" /></span>
  </component>
</template>

<style scoped>
.row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 12px 16px;
  border: none;
  text-align: left;
  font: inherit;
  color: inherit;
  background: transparent;
}

.row--action {
  cursor: pointer;
}

.row--action:active {
  background: var(--color-background-mute);
}

.row--action:disabled {
  opacity: 0.5;
  cursor: default;
}

.row__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
}

.row__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row__label {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
}

.row--danger .row__label {
  color: #e11d48;
}

.row__hint {
  font-size: 13px;
  line-height: 1.4;
}

.row__end {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.row__chevron {
  flex-shrink: 0;
  opacity: 0.4;
}

.row__below {
  display: block;
}
</style>
