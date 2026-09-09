<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <section class="page">
    <header class="page__header">
      <slot name="leading" />
      <h1 class="page__title">{{ title }}</h1>
      <slot name="actions" />
    </header>
    <div class="page__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.page__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 20px 12px;
}

.page__title {
  flex: 1;
  min-width: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page__body {
  flex: 1;
  padding: 4px 20px 24px;
}
</style>
