import { describe, it, expect } from 'vitest'
import { formatTimeOfDay, formatFileTimeStamp } from '../format'

describe('formatTimeOfDay', () => {
  it('formats morning, noon, and evening times with AM/PM', () => {
    expect(formatTimeOfDay(new Date(2026, 8, 20, 6, 5).getTime())).toBe('6:05 AM')
    expect(formatTimeOfDay(new Date(2026, 8, 20, 12, 0).getTime())).toBe('12:00 PM')
    expect(formatTimeOfDay(new Date(2026, 8, 20, 18, 30).getTime())).toBe('6:30 PM')
    expect(formatTimeOfDay(new Date(2026, 8, 20, 0, 0).getTime())).toBe('12:00 AM')
  })
})

describe('formatFileTimeStamp', () => {
  it('pads hours and minutes into a sortable 24h HHmm stamp', () => {
    expect(formatFileTimeStamp(new Date(2026, 8, 20, 6, 5).getTime())).toBe('0605')
    expect(formatFileTimeStamp(new Date(2026, 8, 20, 18, 30).getTime())).toBe('1830')
  })
})
