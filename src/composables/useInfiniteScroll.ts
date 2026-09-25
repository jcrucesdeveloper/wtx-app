import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

/**
 * Calls `onReach` whenever `sentinel` (an element after the last item) comes
 * within `margin` of the viewport — the next page loads before the user hits
 * the bottom. The caller guards against overlapping loads and the end of the list.
 *
 * @returns `recheck` — call after a page lands: an observer only reports
 *   changes, so a sentinel still in range after a short page would otherwise
 *   never fire again.
 */
export function useInfiniteScroll(sentinel: Ref<HTMLElement | null>, onReach: () => void, margin = '600px') {
  if (typeof IntersectionObserver === 'undefined') return { recheck: () => {} }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onReach()
    },
    { rootMargin: `0px 0px ${margin} 0px` },
  )

  watch(
    sentinel,
    (el, previous) => {
      if (previous) observer.unobserve(previous)
      if (el) observer.observe(el)
    },
    { immediate: true },
  )

  async function recheck() {
    await nextTick()
    const el = sentinel.value
    if (!el) return
    observer.unobserve(el)
    observer.observe(el)
  }

  onBeforeUnmount(() => observer.disconnect())

  return { recheck }
}
