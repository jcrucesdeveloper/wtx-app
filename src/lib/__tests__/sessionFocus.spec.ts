import { describe, expect, it } from 'vitest'
import { defaultFocus, focusAfterReorder } from '@/lib/sessionFocus'

interface Ex {
  name: string
  done: boolean
}
const isDone = (e: Ex) => e.done
const a: Ex = { name: 'a', done: true }
const b: Ex = { name: 'b', done: false }
const c: Ex = { name: 'c', done: false }

describe('defaultFocus', () => {
  it('is the first exercise not done, or the last once all are', () => {
    expect(defaultFocus([a, b, c], isDone)).toBe(b)
    expect(defaultFocus([a], isDone)).toBe(a)
    expect(defaultFocus([], isDone)).toBeUndefined()
  })
})

describe('focusAfterReorder', () => {
  it('pins the exercise on screen when the new order would move away from it (mid-set)', () => {
    // On b (half done); c is moved in front of it.
    expect(focusAfterReorder([a, b, c], [a, c, b], null, isDone)).toBe(b)
  })

  it('pins nothing when the exercise on screen stays the default', () => {
    // Still on b: a (done) moved behind it.
    expect(focusAfterReorder([a, b, c], [b, a, c], null, isDone)).toBeNull()
    expect(focusAfterReorder([a, b, c], [a, b, c], null, isDone)).toBeNull()
  })

  it('keeps a picked exercise picked', () => {
    expect(focusAfterReorder([a, b, c], [c, b, a], c, isDone)).toBe(c)
  })

  it('pins nothing once the exercise on screen is gone', () => {
    expect(focusAfterReorder([a, b, c], [a, c], null, isDone)).toBeNull()
  })
})
