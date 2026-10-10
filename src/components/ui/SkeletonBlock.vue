<script setup lang="ts">
/**
 * A placeholder in the shape of what is loading, so the screen doesn't jump
 * when the content arrives. It breathes while it waits; with reduced motion
 * it simply holds still.
 */
withDefaults(
  defineProps<{
    /** Any CSS length. */
    width?: string
    height?: string
    /** A radius token name, or `circle`. */
    radius?: 'sm' | 'md' | 'lg' | 'xl' | 'pill' | 'circle'
  }>(),
  { width: '100%', height: '16px', radius: 'md' },
)
</script>

<template>
  <span
    class="skeleton"
    aria-hidden="true"
    :style="{
      width,
      height,
      borderRadius: radius === 'circle' ? '50%' : `var(--radius-${radius})`,
    }"
  />
</template>

<style scoped>
.skeleton {
  display: block;
  flex-shrink: 0;
  background: var(--color-background-mute);
}

@media (prefers-reduced-motion: no-preference) {
  .skeleton {
    animation: skeleton-breathe 1.4s ease-in-out infinite;
  }
}

@keyframes skeleton-breathe {
  50% {
    opacity: 0.45;
  }
}
</style>
