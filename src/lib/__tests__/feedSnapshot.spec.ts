import { describe, it, expect } from 'vitest'
import { parseFeedSnapshot, toFeedSnapshot, type FeedSnapshot } from '../feedSnapshot'

const full: FeedSnapshot = {
  personalRecords: [{ exerciseName: 'Bench Press', weight: 100, reps: 5, previousWeight: 95, previousReps: 5 }],
  comparison: { volumeDelta: -120, workingSetsDelta: 1, isVolumeUp: false },
  milestone: { kind: 'total-sessions', count: 50 },
  weekStreak: 6,
  elapsedSeconds: 3600,
}

describe('feed snapshot', () => {
  it('round-trips a full recap through JSON', () => {
    const roundTripped = JSON.parse(JSON.stringify(toFeedSnapshot(full)))
    expect(parseFeedSnapshot(roundTripped)).toEqual(full)
  })

  it('round-trips a bare recap with no comparison/milestone', () => {
    const bare: FeedSnapshot = { personalRecords: [], comparison: undefined, milestone: undefined, weekStreak: 0, elapsedSeconds: 90 }
    const roundTripped = JSON.parse(JSON.stringify(toFeedSnapshot(bare)))
    expect(parseFeedSnapshot(roundTripped)).toEqual({ ...bare, comparison: undefined, milestone: undefined })
  })

  it('rejects malformed input rather than throwing', () => {
    expect(parseFeedSnapshot(null)).toBeNull()
    expect(parseFeedSnapshot('not an object')).toBeNull()
    expect(parseFeedSnapshot({ personalRecords: [], weekStreak: -1, elapsedSeconds: 0 })).toBeNull()
    expect(parseFeedSnapshot({ personalRecords: 'nope', weekStreak: 0, elapsedSeconds: 0 })).toBeNull()
  })

  it('drops a malformed personal record instead of failing the whole snapshot', () => {
    const result = parseFeedSnapshot({
      personalRecords: [{ exerciseName: 'Squat' /* missing weight/reps */ }],
      weekStreak: 1,
      elapsedSeconds: 60,
    })
    expect(result?.personalRecords).toEqual([])
  })

  it('rejects an unknown milestone kind', () => {
    const result = parseFeedSnapshot({
      personalRecords: [],
      milestone: { kind: 'bogus', count: 10 },
      weekStreak: 1,
      elapsedSeconds: 60,
    })
    expect(result?.milestone).toBeUndefined()
  })
})
