<script setup lang="ts">
/**
 * A screen with nothing to show: something missing, empty or unavailable.
 * It says what happened in a line, why in another, and offers one way on.
 */
defineProps<{
  title: string
  hint?: string
}>()
</script>

<template>
  <div class="quiet-state">
    <p class="quiet-state__title">{{ title }}</p>
    <p v-if="hint" class="quiet-state__hint">{{ hint }}</p>
    <div v-if="$slots.default" class="quiet-state__action">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.quiet-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-8);
}

.quiet-state__title {
  font-size: var(--text-title);
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  color: var(--color-heading);
}

.quiet-state__hint {
  font-size: var(--text-body);
  line-height: 1.45;
}

.quiet-state__action {
  margin-top: var(--space-4);
}
</style>
