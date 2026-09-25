import { describe, it, expect } from 'vitest'
import {
  completesExercise,
  isLiveRecord,
  isReactionEmoji,
  parsePrPayload,
  parseReactionPayload,
} from '../roomEvents'

describe('reaction payloads', () => {
  it('accepts a well-formed reaction', () => {
    expect(parseReactionPayload({ from: 'a', to: 'b', emoji: '🔥' })).toEqual({ from: 'a', to: 'b', emoji: '🔥' })
  })

  it('rejects unknown emojis and malformed payloads', () => {
    expect(isReactionEmoji('💩')).toBe(false)
    expect(parseReactionPayload({ from: 'a', to: 'b', emoji: '💩' })).toBeNull()
    expect(parseReactionPayload({ from: 'a', emoji: '🔥' })).toBeNull()
    expect(parseReactionPayload(null)).toBeNull()
  })
})

describe('PR payloads', () => {
  it('accepts a well-formed PR and rejects nonsense numbers', () => {
    expect(parsePrPayload({ from: 'a', exercise: 'Bench Press', weight: 80, reps: 5 })).toEqual({
      from: 'a',
      exercise: 'Bench Press',
      weight: 80,
      reps: 5,
    })
    expect(parsePrPayload({ from: 'a', exercise: 'Bench Press', weight: -1, reps: 5 })).toBeNull()
    expect(parsePrPayload({ from: 'a', exercise: 'Bench Press', weight: Infinity, reps: 5 })).toBeNull()
    expect(parsePrPayload({ from: 'a', exercise: '', weight: 80, reps: 5 })).toBeNull()
  })
})

describe('isLiveRecord', () => {
  const prior = { weight: 80, reps: 5 }

  it('needs history and a strictly heavier weight', () => {
    expect(isLiveRecord(undefined, undefined, 100)).toBe(false)
    expect(isLiveRecord(prior, undefined, 80)).toBe(false)
    expect(isLiveRecord(prior, undefined, 82.5)).toBe(true)
  })

  it('only re-announces a heavier set within the same workout', () => {
    expect(isLiveRecord(prior, 82.5, 82.5)).toBe(false)
    expect(isLiveRecord(prior, 82.5, 85)).toBe(true)
  })
})

describe('completesExercise', () => {
  it('fires exactly on the set that reaches the plan', () => {
    expect(completesExercise(3, 1)).toBe(false)
    expect(completesExercise(3, 2)).toBe(true)
    expect(completesExercise(3, 3)).toBe(false)
    expect(completesExercise(undefined, 2)).toBe(false)
  })
})
