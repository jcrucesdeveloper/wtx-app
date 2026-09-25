/**
 * Focus handler that scrolls the focused element clear of the on-screen
 * keyboard. Scrolling immediately on focus doesn't help — the keyboard
 * hasn't opened yet, so the browser doesn't know how much of the viewport
 * it's about to cover. `visualViewport`'s `resize` event fires once it has,
 * so we scroll then; the timeout is a fallback for when the keyboard was
 * already open (moving focus between fields fires no resize) or the
 * WebView has no `visualViewport` support.
 */
export function scrollFocusedIntoView(event: FocusEvent) {
  const el = event.target as HTMLElement | null
  if (!el) return

  const scroll = () => el.scrollIntoView({ block: 'center', behavior: 'smooth' })

  const fallback = setTimeout(scroll, 300)
  window.visualViewport?.addEventListener(
    'resize',
    () => {
      clearTimeout(fallback)
      scroll()
    },
    { once: true },
  )
}
