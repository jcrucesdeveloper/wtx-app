import { describe, it, expect } from 'vitest'
import {
  formatSessionDate,
  recencyGroup,
  computeWeekStreak,
  monthCalendar,
  sessionsThisWeek,
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

describe('monthCalendar', () => {
  // September 2026 starts on a Tuesday and ends on a Wednesday.
  const weeks = monthCalendar(['2026-09-01', '2026-09-16', '2026-09-16', '2026-08-31'], 2026, 8, NOW)

  it('lays the month out as full Monday-first weeks', () => {
    expect(weeks).toHaveLength(5)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[0]![0]).toMatchObject({ date: '2026-08-31', inMonth: false })
    expect(weeks[0]![1]).toMatchObject({ date: '2026-09-01', day: 1, inMonth: true })
    expect(weeks[4]![2]).toMatchObject({ date: '2026-09-30', inMonth: true })
    expect(weeks[4]![6]).toMatchObject({ date: '2026-10-04', inMonth: false })
  })

  it('counts sessions per day, including padding days', () => {
    const days = weeks.flat()
    expect(days.find((d) => d.date === '2026-09-16')?.count).toBe(2)
    expect(days.find((d) => d.date === '2026-09-01')?.count).toBe(1)
    expect(days.find((d) => d.date === '2026-08-31')?.count).toBe(1)
    expect(days.find((d) => d.date === '2026-09-02')?.count).toBe(0)
  })

  it('flags today and the days after it', () => {
    const days = weeks.flat()
    expect(days.find((d) => d.isToday)?.date).toBe('2026-09-16')
    expect(days.find((d) => d.date === '2026-09-15')?.isFuture).toBe(false)
    expect(days.find((d) => d.date === '2026-09-17')?.isFuture).toBe(true)
  })
})

describe('sessionsThisWeek', () => {
  it('counts every session from Monday to now, not just the days', () => {
    expect(sessionsThisWeek(['2026-09-14', '2026-09-16', '2026-09-16', '2026-09-13'], NOW)).toBe(3)
  })
})
