import { onBeforeUnmount, ref, type Ref } from 'vue'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Whether the OS asked for reduced motion — gates staged reveals/animations. */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia(QUERY).matches
  } catch {
    return false
  }
}

/**
 * The same answer as a ref that follows the setting while the component is
 * mounted, for templates that render differently without motion. CSS needs
 * neither: the motion tokens in base.css already collapse on their own.
 */
export function useReducedMotion(): Ref<boolean> {
  const reduced = ref(prefersReducedMotion())
  try {
    const media = window.matchMedia(QUERY)
    const update = () => (reduced.value = media.matches)
    media.addEventListener('change', update)
    onBeforeUnmount(() => media.removeEventListener('change', update))
  } catch {
    /* no matchMedia — stays at the initial answer */
  }
  return reduced
}
