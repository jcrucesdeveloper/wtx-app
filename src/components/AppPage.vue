<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    /** A screen reached from a tab rather than a tab itself: its title is a label, not a headline. */
    sub?: boolean
    /** Lets the content fill the screen, so a dock at its end rests on the bottom edge. */
    fill?: boolean
  }>(),
  { sub: false, fill: false },
)
</script>

<template>
  <section class="page" :class="{ 'page--sub': sub, 'page--fill': fill }">
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
  min-height: 64px;
  padding: var(--space-5) var(--space-5) var(--space-2);
}

.page__title {
  flex: 1;
  min-width: 0;
  font-size: 26px;
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page--sub .page__title {
  font-size: 18px;
  font-weight: var(--weight-bold);
  letter-spacing: 0;
}

.page__body {
  flex: 1;
  padding: var(--space-1) var(--space-5) var(--space-6);
}

.page--fill .page__body {
  display: flex;
  flex-direction: column;
}
</style>
