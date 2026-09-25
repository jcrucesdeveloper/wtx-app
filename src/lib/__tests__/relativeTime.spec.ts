import { describe, it, expect } from 'vitest'
import { formatRelativeTime } from '../relativeTime'
import { colorForId, memberColor } from '../memberColors'

const NOW = new Date(2026, 8, 25, 18, 0).getTime()
const MIN = 60_000

describe('formatRelativeTime', () => {
  it('says "now" for the last minute', () => {
    expect(formatRelativeTime(NOW - 20_000, 'en', NOW)).toBe('now')
  })

  it('counts minutes, hours and days', () => {
    expect(formatRelativeTime(NOW - 5 * MIN, 'en', NOW)).toBe('5 min. ago')
    expect(formatRelativeTime(NOW - 3 * 60 * MIN, 'en', NOW)).toBe('3 hr. ago')
    expect(formatRelativeTime(NOW - 24 * 60 * MIN, 'en', NOW)).toBe('yesterday')
    expect(formatRelativeTime(NOW - 3 * 24 * 60 * MIN, 'en', NOW)).toBe('3 days ago')
  })

  it('switches to a date after a week', () => {
    expect(formatRelativeTime(new Date(2026, 8, 3).getTime(), 'en', NOW)).toBe('Sep 3')
    expect(formatRelativeTime(new Date(2025, 8, 3).getTime(), 'en', NOW)).toBe('Sep 3, 2025')
  })

  it('never reads as the future on a skewed clock', () => {
    expect(formatRelativeTime(NOW + 5 * MIN, 'en', NOW)).toBe('now')
  })

  it('follows the locale', () => {
    expect(formatRelativeTime(NOW - 24 * 60 * MIN, 'es', NOW)).toBe('ayer')
  })
})

describe('colorForId', () => {
  it('is stable for the same account and picks from the member palette', () => {
    const id = '3f1c7a52-9d0e-4b8a-a1f2-6c5d4e3b2a10'
    expect(colorForId(id)).toBe(colorForId(id))
    const palette = Array.from({ length: 8 }, (_, i) => memberColor(i))
    expect(palette).toContain(colorForId(id))
  })

  it('spreads different accounts across colors', () => {
    const colors = new Set(Array.from({ length: 40 }, (_, i) => colorForId(`user-${i}`)))
    expect(colors.size).toBeGreaterThan(4)
  })
})
