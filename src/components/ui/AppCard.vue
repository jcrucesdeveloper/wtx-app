<script setup lang="ts">
/**
 * A surface resting on the page. Use it for the one thing a screen is about,
 * or for a group of rows that belong together — not to box every section:
 * space and hairlines group things before a card does.
 */
withDefaults(
  defineProps<{
    /** `button` or `a` when the whole card is tappable. */
    as?: string
    /** `lg` for a screen's hero, `md` for a group. */
    padding?: 'none' | 'md' | 'lg'
  }>(),
  { as: 'div', padding: 'md' },
)
</script>

<template>
  <component
    :is="as"
    class="card"
    :class="[`card--pad-${padding}`, { 'card--tappable': as === 'button' || as === 'a' }]"
    :type="as === 'button' ? 'button' : undefined"
  >
    <slot />
  </component>
</template>

<style scoped>
.card {
  display: block;
  width: 100%;
  border: none;
  border-radius: var(--radius-lg);
  text-align: left;
  font: inherit;
  color: inherit;
  background: var(--color-background-soft);
}

.card--pad-md {
  padding: var(--space-4);
}

.card--pad-lg {
  padding: var(--space-5);
  border-radius: var(--radius-xl);
}

.card--tappable {
  cursor: pointer;
}

.card--tappable:active {
  background: var(--color-background-mute);
}
</style>
