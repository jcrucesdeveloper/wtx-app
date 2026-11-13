<script setup lang="ts">
/**
 * A titled group of settings rows — the unit the settings screen is built
 * from. `danger` marks the group of actions that can't be undone: red title,
 * red outline, an optional note under the title.
 */
withDefaults(defineProps<{ title: string; hint?: string; danger?: boolean }>(), {
  hint: '',
  danger: false,
})
</script>

<template>
  <section class="group" :class="{ 'group--danger': danger }">
    <h2 class="group__title">
      <slot name="icon" />
      {{ title }}
    </h2>
    <p v-if="hint" class="group__hint">{{ hint }}</p>
    <div class="group__rows">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.group__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 4px 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.group__hint {
  margin: -4px 4px 10px;
  font-size: 13px;
  line-height: 1.4;
}

.group__rows {
  border-radius: 16px;
  background: var(--color-background-soft);
  overflow: hidden;
}

/* Rows are divided by a hairline, not boxed one by one. */
.group .group__rows > :deep(* + *) {
  border-top: 1px solid var(--color-border);
}

.group--danger .group__title {
  color: var(--color-danger);
}

.group--danger .group__rows {
  border: 1px solid color-mix(in srgb, var(--color-danger) 45%, var(--color-border));
  background: color-mix(in srgb, var(--color-danger) 5%, var(--color-background-soft));
}

.group--danger .group__rows > :deep(* + *) {
  border-top-color: color-mix(in srgb, var(--color-danger) 25%, var(--color-border));
}
</style>
