<script setup lang="ts">
/**
 * The button. Four variants, chosen by what the action means:
 *
 * - `primary`  the one thing to do on a screen — accent-filled, at most one visible.
 * - `secondary` (default) any other action — outlined.
 * - `quiet`    a small action beside something else — a soft pill.
 * - `danger`   destructive — red text, never a filled red button.
 *
 * It answers a press with a scale on `:active`, which needs no animation to
 * start, so the response is on the same frame as the touch.
 */
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
    /** `lg` for a screen's main action, `md` for most, `sm` for a pill beside a row. */
    size?: 'lg' | 'md' | 'sm'
    /** Fills the width of its container. */
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'secondary', size: 'md', block: false, disabled: false, type: 'button' },
)
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block }]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 1px solid transparent;
  font: inherit;
  font-weight: var(--weight-bold);
  line-height: 1.2;
  text-align: center;
  cursor: pointer;
  transition: transform var(--motion-instant) ease-out;
}

.btn:active:not(:disabled) {
  transform: scale(0.97);
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn--block {
  display: flex;
  width: 100%;
}

/* Sizes */
.btn--lg {
  min-height: var(--size-action);
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-lg);
  font-size: var(--text-body);
}

.btn--md {
  min-height: var(--size-control);
  padding: var(--space-2) 14px;
  border-radius: 14px;
  font-size: var(--text-small);
}

.btn--sm {
  min-height: 40px;
  padding: 0 14px;
  border-radius: var(--radius-pill);
  font-size: var(--text-small);
}

/* Variants */
.btn--primary {
  color: var(--color-on-accent);
  background: var(--color-accent);
}

.btn--secondary {
  border-color: var(--color-border-hover);
  color: var(--color-heading);
  background: transparent;
}

.btn--secondary:active:not(:disabled) {
  background: var(--color-background-mute);
}

.btn--quiet {
  color: var(--color-heading);
  background: var(--color-background-mute);
}

.btn--danger {
  color: var(--color-danger);
  background: transparent;
}
</style>
