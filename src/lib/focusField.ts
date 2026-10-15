/**
 * Focusing an input from a tap somewhere else, so the user can type a new
 * number straight away.
 *
 * iOS only raises the on-screen keyboard when `focus()` runs synchronously
 * inside the tap. When the input to focus is about to be re-rendered (a new
 * element arrives after Vue's next tick), `holdKeyboard` focuses a throwaway
 * input during the tap so the keyboard comes up, and focus is then handed to
 * the real input once it exists — moving focus between inputs keeps the
 * keyboard open, even outside the gesture.
 */

/** Selects the whole value, so typing replaces it. Never throws. */
export function selectAll(input: HTMLInputElement) {
  try {
    input.select()
  } catch {
    // Some engines refuse selection on certain input types; focus is enough.
  }
}

/** Focuses `input` and selects its value. Returns whether there was one to focus. */
export function focusAndSelect(input: HTMLInputElement | null | undefined): boolean {
  if (!input) return false
  input.focus({ preventScroll: true })
  selectAll(input)
  return true
}

/**
 * Focuses an invisible input now, inside the user's tap, and returns a
 * function that removes it. Call that after focusing the real input — or
 * without, which drops focus and lets the keyboard close.
 */
export function holdKeyboard(inputMode: string = 'decimal'): () => void {
  const proxy = document.createElement('input')
  proxy.type = 'text'
  proxy.inputMode = inputMode
  proxy.tabIndex = -1
  proxy.setAttribute('aria-hidden', 'true')
  // 16px, or iOS zooms the page to it; off to the side so nothing scrolls.
  proxy.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px;pointer-events:none;'
  document.body.appendChild(proxy)
  proxy.focus({ preventScroll: true })
  return () => proxy.remove()
}
