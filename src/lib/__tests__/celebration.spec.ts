import { describe, expect, it } from 'vitest'
import { celebrationTier } from '@/lib/celebration'

const none = { personalRecords: 0, milestone: undefined, plateUp: false }

describe('celebrationTier', () => {
  it('is routine when nothing was earned', () => {
    expect(celebrationTier(none)).toBe('routine')
  })

  it('is a win for a personal record', () => {
    expect(celebrationTier({ ...none, personalRecords: 1 })).toBe('win')
  })

  it('is a win for an ordinary milestone', () => {
    expect(celebrationTier({ ...none, milestone: { kind: 'total-sessions', count: 25 } })).toBe('win')
    expect(celebrationTier({ ...none, milestone: { kind: 'week-streak', count: 12 } })).toBe('win')
  })

  it('is an event for a new plate', () => {
    expect(celebrationTier({ ...none, plateUp: true })).toBe('event')
  })

  it('is an event for a year of weeks in a row', () => {
    expect(celebrationTier({ ...none, milestone: { kind: 'week-streak', count: 52 } })).toBe('event')
  })

  it('is an event for a hundred workouts', () => {
    expect(celebrationTier({ ...none, milestone: { kind: 'total-sessions', count: 100 } })).toBe('event')
  })

  it('is an event for three records at once', () => {
    expect(celebrationTier({ ...none, personalRecords: 3 })).toBe('event')
  })
})
