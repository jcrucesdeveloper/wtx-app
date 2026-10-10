import { prefersReducedMotion } from '@/lib/reducedMotion'

/** The motion tokens defined in base.css, by the part after `--motion-`. */
export type MotionToken = 'instant' | 'quick' | 'base' | 'slow' | 'stagger'
export type EaseToken = 'out' | 'spring'

/** `"280ms"` or `"0.28s"` → milliseconds. Anything unreadable is 0. */
export function parseDuration(value: string): number {
  const text = value.trim()
  const amount = parseFloat(text)
  if (Number.isNaN(amount)) return 0
  return text.endsWith('ms') ? amount : text.endsWith('s') ? amount * 1000 : amount
}

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name)
}

/** A motion token's current length in ms — already collapsed when motion is reduced. */
export function motionMs(name: MotionToken): number {
  return parseDuration(token(`--motion-${name}`))
}

/**
 * Plays a one-off animation with the Web Animations API, timed and eased by
 * the same tokens CSS uses. Returns `null` and does nothing when motion is
 * reduced: the caller's state change has already happened without it.
 *
 * Only animate `transform` and `opacity` with this.
 */
export function animateOnce(
  el: Element | null | undefined,
  keyframes: Keyframe[],
  options: { duration?: MotionToken; easing?: EaseToken; delay?: number } = {},
): Animation | null {
  if (!el || prefersReducedMotion() || typeof el.animate !== 'function') return null
  return el.animate(keyframes, {
    duration: motionMs(options.duration ?? 'base'),
    easing: token(`--ease-${options.easing ?? 'out'}`).trim() || 'ease-out',
    delay: options.delay ?? 0,
    fill: 'backwards',
  })
}

/** The CSS delay for the n-th item of a staged reveal: `animation-delay: staggerDelay(2)`. */
export function staggerDelay(index: number): string {
  return `calc(var(--motion-stagger) * ${index})`
}
