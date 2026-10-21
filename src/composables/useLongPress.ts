import { onBeforeUnmount, ref, type Ref } from 'vue'

/** How long a finger stays down before it is a long press — between Android's 400ms and iOS's 500ms. */
export const LONG_PRESS_MS = 450
/** How far it may drift and still be held, not scrolled — iOS's own allowance. */
export const LONG_PRESS_SLOP = 10

export interface LongPressHandlers {
  pointerdown: (event: PointerEvent) => void
  pointermove: (event: PointerEvent) => void
  pointerup: () => void
  pointercancel: () => void
  contextmenu: (event: Event) => void
}

/**
 * Press and hold for a menu, the way a list item does on a phone. Bind the
 * handlers from `bind(key)` to each item with `v-on`; `onLongPress(key)` runs
 * once the finger has stayed put for {@link LONG_PRESS_MS}.
 *
 * - Moving more than {@link LONG_PRESS_SLOP}px, lifting early, or the browser
 *   taking the touch for a scroll cancels it, so scrolling never opens a menu.
 * - Once it fires, the click that the same press ends with is swallowed, so
 *   holding a row doesn't also tap it.
 * - `contextmenu` — a right-click, the keyboard's menu key, or a touch
 *   browser's own long press — opens the same thing instead of the native menu.
 *
 * `pressing` is the item being held, until it fires or is let go, so it can
 * show that something is about to happen.
 */
export function useLongPress<K>(
  onLongPress: (key: K) => void,
  options: { delay?: number; slop?: number } = {},
) {
  const delay = options.delay ?? LONG_PRESS_MS
  const slop = options.slop ?? LONG_PRESS_SLOP

  const pressing = ref(null) as Ref<K | null>
  let timer: ReturnType<typeof setTimeout> | undefined
  let start: { x: number; y: number; pointerId: number } | null = null
  /** The press under way has already opened the menu; a touch browser's own contextmenu for it is not another. */
  let fired = false

  function cancel() {
    clearTimeout(timer)
    timer = undefined
    start = null
    pressing.value = null
  }

  // ----- the click the long press ends with is not a tap -----
  let disarmTimer: ReturnType<typeof setTimeout> | undefined
  function swallow(event: Event) {
    event.preventDefault()
    event.stopPropagation()
    disarm()
  }
  function disarm() {
    clearTimeout(disarmTimer)
    window.removeEventListener('click', swallow, true)
    window.removeEventListener('pointerdown', disarm, true)
  }
  function arm() {
    disarm()
    window.addEventListener('click', swallow, true)
    // A new press means that click isn't coming (touch often sends none).
    window.addEventListener('pointerdown', disarm, true)
  }

  function fire(key: K) {
    // Only a finger or button still down has a click to come; a right-click
    // or the menu key doesn't, and the next click is a real one.
    const held = start !== null
    fired = true
    cancel()
    if (held) arm()
    onLongPress(key)
  }

  function bind(key: K): LongPressHandlers {
    return {
      pointerdown(event) {
        fired = false
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
        cancel()
        start = { x: event.clientX, y: event.clientY, pointerId: event.pointerId }
        pressing.value = key
        timer = setTimeout(() => fire(key), delay)
      },
      pointermove(event) {
        if (!start || event.pointerId !== start.pointerId) return
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > slop) cancel()
      },
      pointerup() {
        cancel()
        // Whatever click this press was going to send has been sent by then.
        if (fired) disarmTimer = setTimeout(disarm, 600)
        fired = false
      },
      pointercancel() {
        cancel()
        fired = false
      },
      contextmenu(event) {
        event.preventDefault()
        if (fired) return
        fire(key)
      },
    }
  }

  onBeforeUnmount(() => {
    cancel()
    disarm()
  })

  return { pressing, bind }
}
