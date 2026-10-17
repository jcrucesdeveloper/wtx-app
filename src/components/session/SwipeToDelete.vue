<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { Trash2 } from '@lucide/vue'

/**
 * A row that slides left to show its Delete, the way set rows do in other
 * gym loggers. The swipe only reveals the button — deleting is still a tap on
 * it — so a sideways brush while scrolling can't take a set away. A swipe has
 * no signifier, so it is a shortcut: whatever it deletes must also be
 * reachable from a visible control elsewhere.
 *
 * Only horizontal drags are taken; vertical ones are left to the scroll.
 * While open, a tap on the row (or anywhere else) closes it instead of acting.
 */
const props = defineProps<{
  open: boolean
  /** The revealed button's text. */
  label: string
  /** What it deletes, for screen readers: "Delete set 2". */
  actionLabel: string
}>()

const emit = defineEmits<{ 'update:open': [open: boolean]; delete: [] }>()

/** How far the row slides to show the button. */
const REVEAL = 88
/** Movement before a drag counts as a drag, and picks its direction. */
const SLOP = 8

const root = useTemplateRef<HTMLElement>('root')
const drag = ref<number | null>(null)
let start: { x: number; y: number; from: number } | null = null
let axis: 'x' | 'y' | null = null
/** A drag just ended: the click it produces is not a tap. */
let swallowClick = false

const offset = computed(() => drag.value ?? (props.open ? -REVEAL : 0))
const revealed = computed(() => props.open || (drag.value !== null && drag.value < 0))

function onDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  start = { x: event.clientX, y: event.clientY, from: props.open ? -REVEAL : 0 }
  axis = null
  swallowClick = false
}

function onMove(event: PointerEvent) {
  if (!start || axis === 'y') return
  const dx = event.clientX - start.x
  const dy = event.clientY - start.y
  if (axis === null) {
    if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return
    axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (axis === 'y') return
    ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
  }
  const x = start.from + dx
  // Past either end it resists, so it feels held rather than stuck.
  drag.value = x > 0 ? x * 0.2 : x < -REVEAL ? -REVEAL + (x + REVEAL) * 0.3 : x
}

function onUp() {
  if (drag.value !== null) {
    swallowClick = true
    emit('update:open', drag.value < -REVEAL / 2)
  }
  drag.value = null
  start = null
  axis = null
}

function onClickCapture(event: MouseEvent) {
  if (!swallowClick && !props.open) return
  event.stopPropagation()
  event.preventDefault()
  if (!swallowClick) emit('update:open', false)
  swallowClick = false
}

/** Open: a touch anywhere outside the row puts it back. */
function onOutside(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) emit('update:open', false)
}
watch(
  () => props.open,
  (open) => {
    if (open) document.addEventListener('pointerdown', onOutside, true)
    else document.removeEventListener('pointerdown', onOutside, true)
  },
  { immediate: true },
)
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside, true))
</script>

<template>
  <div ref="root" class="swipe">
    <button
      type="button"
      class="swipe__action"
      :class="{ 'swipe__action--shown': revealed }"
      :aria-label="actionLabel"
      :tabindex="open ? 0 : -1"
      :aria-hidden="open ? undefined : 'true'"
      @click="emit('delete')"
    >
      <Trash2 :size="18" :stroke-width="2.5" />
      <span>{{ label }}</span>
    </button>
    <div
      class="swipe__slide"
      :class="{ 'swipe__slide--dragging': drag !== null }"
      :style="offset ? { transform: `translateX(${offset}px)` } : undefined"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @click.capture="onClickCapture"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.swipe {
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.swipe__action {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 80px;
  border: none;
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--text-micro);
  font-weight: var(--weight-bold);
  color: #fff;
  background: var(--color-danger);
  cursor: pointer;
  visibility: hidden;
}

.swipe__action--shown {
  visibility: visible;
}

.swipe__action:active {
  filter: brightness(0.92);
}

.swipe__slide {
  position: relative;
  /* Vertical drags stay the page's scroll; sideways ones are the swipe's. */
  touch-action: pan-y;
  background: var(--color-background);
  border-radius: inherit;
}

.swipe__slide--dragging {
  user-select: none;
}

@media (prefers-reduced-motion: no-preference) {
  .swipe__slide:not(.swipe__slide--dragging) {
    transition: transform var(--motion-quick) var(--ease-out);
  }
}
</style>
