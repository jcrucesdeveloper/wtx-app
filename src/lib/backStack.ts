/**
 * A stack of open overlays (bottom sheets, dialogs) that the Android hardware
 * back button should dismiss before it navigates. Each overlay registers a
 * close handler while it is open; back closes the most recently opened one.
 */

type CloseHandler = () => void

const stack: { id: symbol; close: CloseHandler }[] = []

/**
 * Registers an open overlay. Returns an unregister function to call once the
 * overlay closes (or unmounts); calling it more than once is harmless.
 */
export function pushBackHandler(close: CloseHandler): () => void {
  const id = Symbol('overlay')
  stack.push({ id, close })
  return () => {
    const index = stack.findIndex((entry) => entry.id === id)
    if (index !== -1) stack.splice(index, 1)
  }
}

/**
 * Closes the topmost open overlay, if any. Returns true when it handled the
 * back press, so the caller should not also navigate/exit.
 */
export function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1]
  if (!top) return false
  top.close()
  return true
}

/** Number of overlays currently registered (for tests/debugging). */
export function openOverlayCount(): number {
  return stack.length
}
