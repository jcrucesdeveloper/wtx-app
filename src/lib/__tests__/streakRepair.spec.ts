import { describe, expect, it } from 'vitest'
import { computeWeekStreak, streakRepair } from '../sessionStats'

// A Wednesday. This week is Sep 14–20; last week Sep 7–13; the one before Aug 31–Sep 6.
const NOW = new Date(2026, 8, 16)

/** Three trained weeks ending the week before last: Aug 17, Aug 24, Aug 31. */
const RUN = ['2026-08-19', '2026-08-26', '2026-09-02']

describe('computeWeekStreak with a missed week', () => {
  it('is broken by the missed week until it is made up', () => {
    expect(computeWeekStreak(RUN, NOW)).toBe(0)
    expect(computeWeekStreak([...RUN, '2026-09-14'], NOW)).toBe(1)
  })

  it('carries on across the missed week after two workouts in the next one', () => {
    expect(computeWeekStreak([...RUN, '2026-09-14', '2026-09-16'], NOW)).toBe(4)
  })

  it('counts two workouts on the same day as two', () => {
    expect(computeWeekStreak([...RUN, '2026-09-15', '2026-09-15'], NOW)).toBe(4)
  })

  it('does not forgive two missed weeks in a row', () => {
    // Trained Aug 17 and Aug 24 only; Aug 31 and Sep 7 both missed.
    const dates = ['2026-08-19', '2026-08-26', '2026-09-14', '2026-09-16']
    expect(computeWeekStreak(dates, NOW)).toBe(1)
  })

  it('forgives a repaired gap further back in the run too', () => {
    // Aug 10, [Aug 17 missed], Aug 24 ×2, Aug 31, Sep 7, Sep 14.
    const dates = ['2026-08-12', '2026-08-25', '2026-08-27', '2026-09-02', '2026-09-09', '2026-09-16']
    expect(computeWeekStreak(dates, NOW)).toBe(5)
  })

  it('still stops at a gap the following week did not make up', () => {
    // Aug 10, [Aug 17 missed], Aug 24 ×1, Aug 31, Sep 7, Sep 14.
    const dates = ['2026-08-12', '2026-08-25', '2026-09-02', '2026-09-09', '2026-09-16']
    expect(computeWeekStreak(dates, NOW)).toBe(4)
  })
})

describe('streakRepair', () => {
  it('offers the repair when last week was missed after a run', () => {
    expect(streakRepair(RUN, NOW)).toEqual({ needed: 2, weeks: 4 })
  })

  it('needs one more after the first workout of the week', () => {
    expect(streakRepair([...RUN, '2026-09-14'], NOW)).toEqual({ needed: 1, weeks: 4 })
  })

  it('has nothing to offer once the week has made it up', () => {
    expect(streakRepair([...RUN, '2026-09-14', '2026-09-16'], NOW)).toBeNull()
  })

  it('has nothing to offer when last week was trained', () => {
    expect(streakRepair([...RUN, '2026-09-09'], NOW)).toBeNull()
  })

  it('has nothing to offer after two missed weeks', () => {
    expect(streakRepair(['2026-08-19', '2026-08-26'], NOW)).toBeNull()
  })

  it('has nothing to offer with no history', () => {
    expect(streakRepair([], NOW)).toBeNull()
  })
})
