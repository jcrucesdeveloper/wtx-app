import { describe, it, expect } from 'vitest'
import {
  formatSessionDate,
  recencyGroup,
  computeWeekStreak,
  recentWeeksActivity,
} from '../sessionStats'

// A Wednesday.
const NOW = new Date(2026, 8, 16)

describe('formatSessionDate', () => {
  it('labels today and yesterday', () => {
    expect(formatSessionDate('2026-09-16', NOW)).toBe('Today')
    expect(formatSessionDate('2026-09-15', NOW)).toBe('Yesterday')
  })

  it('labels the rest of the trailing week by weekday name', () => {
    expect(formatSessionDate('2026-09-14', NOW)).toBe('Mon')
    expect(formatSessionDate('2026-09-10', NOW)).toBe('Thu')
  })

  it('falls back to a month/day label outside the trailing week', () => {
    expect(formatSessionDate('2026-09-01', NOW)).toBe('Sep 1')
  })

  it('adds the year once the date is from a previous year', () => {
    expect(formatSessionDate('2025-09-01', NOW)).toBe('Sep 1, 2025')
  })
})

describe('recencyGroup', () => {
  it('buckets into this week, last week, and earlier', () => {
    expect(recencyGroup('2026-09-16', NOW)).toBe('This week')
    expect(recencyGroup('2026-09-10', NOW)).toBe('This week')
    expect(recencyGroup('2026-09-09', NOW)).toBe('Last week')
    expect(recencyGroup('2026-09-03', NOW)).toBe('Last week')
    expect(recencyGroup('2026-09-02', NOW)).toBe('Earlier')
  })
})

describe('computeWeekStreak', () => {
  it('is 0 with no sessions', () => {
    expect(computeWeekStreak([], NOW)).toBe(0)
  })

  it('counts the current week even if it just started', () => {
    expect(computeWeekStreak(['2026-09-16'], NOW)).toBe(1)
  })

  it('does not break the streak for a current week with no session yet', () => {
    // NOW is a Wednesday with nothing logged this week, but last week has one.
    expect(computeWeekStreak(['2026-09-09'], NOW)).toBe(1)
  })

  it('counts consecutive weeks and stops at a gap', () => {
    const dates = ['2026-09-16', '2026-09-09', '2026-09-02', '2026-08-19']
    expect(computeWeekStreak(dates, NOW)).toBe(3)
  })
})

describe('recentWeeksActivity', () => {
  it('marks only the weeks that have a session, oldest to current, same unit as the streak', () => {
    // This week (Mon 09-14) and last week (Mon 09-07) have sessions; the two before don't.
    const result = recentWeeksActivity(['2026-09-16', '2026-09-09'], 4, NOW)
    expect(result).toEqual([
      { active: false, isCurrent: false }, // week of 08-24
      { active: false, isCurrent: false }, // week of 08-31
      { active: true, isCurrent: false }, // week of 09-07 (last week)
      { active: true, isCurrent: true }, // week of 09-14 (this week)
    ])
  })
})
