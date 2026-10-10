import { describe, expect, it } from 'vitest'
import { parseDuration, staggerDelay } from '@/lib/motion'

describe('parseDuration', () => {
  it('reads milliseconds', () => {
    expect(parseDuration('280ms')).toBe(280)
    expect(parseDuration(' 1ms ')).toBe(1)
  })

  it('reads seconds', () => {
    expect(parseDuration('0.28s')).toBe(280)
  })

  it('is zero for something unreadable', () => {
    expect(parseDuration('')).toBe(0)
    expect(parseDuration('fast')).toBe(0)
  })
})

describe('staggerDelay', () => {
  it('multiplies the stagger token by the item index', () => {
    expect(staggerDelay(3)).toBe('calc(var(--motion-stagger) * 3)')
  })
})
