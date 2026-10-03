import { describe, it, expect } from 'vitest'
import { shouldAskForReview } from '../reviewPrompt'

const DAY = 24 * 60 * 60 * 1000
const now = Date.UTC(2026, 9, 2)

describe('shouldAskForReview', () => {
  it('asks after a win once the app has been used a few times', () => {
    expect(shouldAskForReview({ hadWin: true, totalSessions: 3, lastAskedAt: null, now })).toBe(
      true,
    )
  })

  it('never asks on an ordinary finish', () => {
    expect(shouldAskForReview({ hadWin: false, totalSessions: 40, lastAskedAt: null, now })).toBe(
      false,
    )
  })

  it('waits for the third workout', () => {
    expect(shouldAskForReview({ hadWin: true, totalSessions: 2, lastAskedAt: null, now })).toBe(
      false,
    )
  })

  it('does not ask again inside the cooldown', () => {
    expect(
      shouldAskForReview({ hadWin: true, totalSessions: 9, lastAskedAt: now - 30 * DAY, now }),
    ).toBe(false)
  })

  it('asks again once the cooldown has passed', () => {
    expect(
      shouldAskForReview({ hadWin: true, totalSessions: 9, lastAskedAt: now - 91 * DAY, now }),
    ).toBe(true)
  })
})
