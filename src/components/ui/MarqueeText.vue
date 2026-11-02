<script setup lang="ts">
import { toRef, useTemplateRef } from 'vue'
import { useMarquee } from '@/composables/useMarquee'

/**
 * One line of text that, when cut off, slides sideways so it can be read
 * whole: hold, slide to the end, hold, slide back. Text that fits stays put;
 * off-screen rows pause; with reduced motion it falls back to an ellipsis.
 */
const props = defineProps<{ text: string }>()

const box = useTemplateRef<HTMLElement>('box')
const { metrics, visible, style } = useMarquee(box, toRef(props, 'text'))
</script>

<template>
  <span
    ref="box"
    class="marquee"
    :class="{ 'marquee--on': metrics, 'marquee--paused': !visible }"
    :style="style"
  >
    <span class="marquee__text">{{ text }}</span>
  </span>
</template>

<style scoped>
.marquee {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.marquee__text {
  display: inline-block;
}

.marquee--on {
  text-overflow: clip;
}

.marquee--on .marquee__text {
  animation: marquee-slide var(--marquee-duration, 6s) ease-in-out infinite alternate;
  will-change: transform;
}

.marquee--paused .marquee__text {
  animation-play-state: paused;
}

/* Keep in step with MARQUEE_HOLD in useMarquee.ts. */
@keyframes marquee-slide {
  0%,
  20% {
    transform: translateX(0);
  }
  80%,
  100% {
    transform: translateX(calc(-1 * var(--marquee-distance, 0px)));
  }
}

@media (prefers-reduced-motion: reduce) {
  .marquee--on {
    text-overflow: ellipsis;
  }

  .marquee__text {
    display: inline;
  }

  .marquee--on .marquee__text {
    animation: none;
  }
}
</style>
