import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

/** Scroll speed of an overflowing name, in px per second. */
export const MARQUEE_SPEED = 30
/** Overflow below this many px is rounding noise, not a cut-off name. */
export const MARQUEE_TOLERANCE = 2
/**
 * Share of each animation run spent holding still at either end (see the
 * keyframes in MarqueeText.vue). With `alternate`, the two holds meet, so the
 * text rests for twice this share at the start and at the end.
 */
export const MARQUEE_HOLD = 0.2

export interface MarqueeMetrics {
  /** How far the text slides left so its end lines up with the box's end. */
  distance: number
  /** One run (one direction), in seconds, holds included. */
  duration: number
}

/**
 * How far and how long a name has to slide to be read whole, or null when it
 * already fits (only names that are actually cut off should move).
 */
export function marqueeMetrics(boxWidth: number, contentWidth: number): MarqueeMetrics | null {
  const distance = Math.ceil(contentWidth - boxWidth)
  if (!(boxWidth > 0) || distance <= MARQUEE_TOLERANCE) return null
  const moving = Math.max(1, distance / MARQUEE_SPEED)
  const duration = Math.round((moving / (1 - 2 * MARQUEE_HOLD)) * 100) / 100
  return { distance, duration }
}

/**
 * Measures `box` (an overflow-hidden, no-wrap element) and says whether its
 * text overflows, with the CSS variables that drive the slide. Re-measures
 * when the box or its content resizes, and pauses while the box is off-screen.
 */
export function useMarquee(box: Ref<HTMLElement | null>, content: Ref<unknown>) {
  const metrics = ref<MarqueeMetrics | null>(null)
  const visible = ref(true)

  function measure() {
    const el = box.value
    metrics.value = el ? marqueeMetrics(el.clientWidth, el.scrollWidth) : null
  }

  let resize: ResizeObserver | undefined
  let intersect: IntersectionObserver | undefined

  onMounted(() => {
    const el = box.value
    if (!el) return
    measure()
    if (typeof ResizeObserver !== 'undefined') {
      resize = new ResizeObserver(() => measure())
      resize.observe(el)
      if (el.firstElementChild) resize.observe(el.firstElementChild)
    }
    if (typeof IntersectionObserver !== 'undefined') {
      intersect = new IntersectionObserver(([entry]) => {
        if (entry) visible.value = entry.isIntersecting
      })
      intersect.observe(el)
    }
  })

  // A new name may fit where the old one didn't; the inner span's resize
  // usually catches it, this covers environments without ResizeObserver.
  watch(content, () => queueMicrotask(measure), { flush: 'post' })

  onBeforeUnmount(() => {
    resize?.disconnect()
    intersect?.disconnect()
  })

  const style = computed(() =>
    metrics.value
      ? {
          '--marquee-distance': `${metrics.value.distance}px`,
          '--marquee-duration': `${metrics.value.duration}s`,
        }
      : undefined,
  )

  return { metrics, visible, style, measure }
}
