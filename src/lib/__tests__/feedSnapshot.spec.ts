import { describe, it, expect } from 'vitest'
import {
  parseFeedSnapshot,
  SHARED_ROUTINE_MAX_CHARS,
  toFeedSnapshot,
  toSharedRoutine,
  type FeedSnapshot,
} from '../feedSnapshot'

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

  it('round-trips training partners and drops malformed names', () => {
    const withPartners: FeedSnapshot = { ...full, trainedWith: ['Ana', 'Bruno'] }
    expect(parseFeedSnapshot(JSON.parse(JSON.stringify(withPartners)))).toEqual(withPartners)
    expect(parseFeedSnapshot({ ...full, trainedWith: ['Ana', 42, ''] })?.trainedWith).toEqual(['Ana'])
    expect(parseFeedSnapshot({ ...full, trainedWith: 'Ana' })).not.toHaveProperty('trainedWith')
  })

  it('round-trips the routine the workout followed, and drops a malformed one', () => {
    const routine = { wtt: '# Push\n\nBench | reps 3x8 | 60 | rest 90s\n', section: 'PPL' }
    expect(parseFeedSnapshot(JSON.parse(JSON.stringify({ ...full, routine })))).toEqual({ ...full, routine })
    expect(parseFeedSnapshot({ ...full, routine: { wtt: routine.wtt, section: 7 } })?.routine).toEqual({
      wtt: routine.wtt,
    })
    expect(parseFeedSnapshot({ ...full, routine: { wtt: '' } })).not.toHaveProperty('routine')
    expect(parseFeedSnapshot({ ...full, routine: 'Push' })).not.toHaveProperty('routine')
  })

  it('only attaches a routine small enough to ride along', () => {
    expect(toSharedRoutine('# Push\n', ' PPL ')).toEqual({ wtt: '# Push\n', section: 'PPL' })
    expect(toSharedRoutine('# Push\n', '')).toEqual({ wtt: '# Push\n' })
    expect(toSharedRoutine(undefined)).toBeUndefined()
    expect(toSharedRoutine('x'.repeat(SHARED_ROUTINE_MAX_CHARS + 1))).toBeUndefined()
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
