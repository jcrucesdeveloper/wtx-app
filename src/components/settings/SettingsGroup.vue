<script setup lang="ts">
/** A titled group of settings rows — the unit the settings screen is built from. */
defineProps<{ title: string }>()
</script>

<template>
  <section class="group">
    <h2 class="group__title">{{ title }}</h2>
    <div class="group__rows">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.group__title {
  margin: 0 4px 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
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
</style>
