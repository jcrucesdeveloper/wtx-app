import { describe, it, expect } from 'vitest'
import { detectMilestone } from '../sessionMilestones'

describe('detectMilestone', () => {
  it('is undefined off a threshold', () => {
    expect(detectMilestone(11, 1)).toBeUndefined()
  })

  it('fires a total-sessions milestone on a round number', () => {
    expect(detectMilestone(50, 2)).toEqual({
      kind: 'total-sessions',
      count: 50,
      label: '50 workouts logged',
    })
  })

  it('fires a week-streak milestone', () => {
    expect(detectMilestone(51, 4)).toEqual({
      kind: 'week-streak',
      count: 4,
      label: '4-week streak',
    })
  })

  it('prefers a session-count milestone over a streak milestone on the same finish', () => {
    expect(detectMilestone(100, 4)).toEqual({
      kind: 'total-sessions',
      count: 100,
      label: '100 workouts logged',
    })
  })
})
