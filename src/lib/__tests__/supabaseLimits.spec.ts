import { describe, it, expect } from 'vitest'
import {
  ROUTINE_MAX,
  ROUTINE_WARN_AT,
  canCreateRoutine,
  isNearRoutineLimit,
  isRateLimited,
  isRoutineLimit,
  jsonByteLength,
  routinesLeft,
  rpcErrorCode,
} from '@/lib/supabase/limits'

describe('supabase limits', () => {
  it('finds the first known code in an error message', () => {
    const codes = ['room_not_found', 'rate_limited'] as const
    expect(rpcErrorCode({ message: 'rate_limited' }, codes)).toBe('rate_limited')
    expect(rpcErrorCode({ message: 'ERROR: room_not_found' }, codes)).toBe('room_not_found')
    expect(rpcErrorCode({ message: 'boom' }, codes)).toBe('unknown')
    expect(rpcErrorCode(null, codes)).toBe('unknown')
  })

  it('recognizes a throttled request', () => {
    expect(isRateLimited({ message: 'rate_limited' })).toBe(true)
    expect(isRateLimited(new Error('rate_limited'))).toBe(true)
    expect(isRateLimited({ message: 'not_found' })).toBe(false)
    expect(isRateLimited(null)).toBe(false)
    expect(isRateLimited('rate_limited')).toBe(false)
  })

  it('measures JSON in UTF-8 bytes', () => {
    expect(jsonByteLength({ a: 1 })).toBe(7)
    expect(jsonByteLength('ñ')).toBe(4)
  })

  it('has room for a routine until the library is full', () => {
    expect(ROUTINE_WARN_AT).toBeLessThan(ROUTINE_MAX)
    expect(canCreateRoutine(0)).toBe(true)
    expect(canCreateRoutine(ROUTINE_MAX - 1)).toBe(true)
    expect(canCreateRoutine(ROUTINE_MAX)).toBe(false)
    expect(canCreateRoutine(ROUTINE_MAX - 2, 2)).toBe(true)
    expect(canCreateRoutine(ROUTINE_MAX - 2, 3)).toBe(false)
    expect(routinesLeft(ROUTINE_MAX - 5)).toBe(5)
    expect(routinesLeft(ROUTINE_MAX + 5)).toBe(0)
  })

  it('warns from ROUTINE_WARN_AT on', () => {
    expect(isNearRoutineLimit(ROUTINE_WARN_AT - 1)).toBe(false)
    expect(isNearRoutineLimit(ROUTINE_WARN_AT)).toBe(true)
  })

  it('recognizes the routine cap', () => {
    expect(isRoutineLimit({ message: 'routine_limit' })).toBe(true)
    expect(isRoutineLimit(new Error('P0001: routine_limit'))).toBe(true)
    expect(isRoutineLimit({ message: 'rate_limited' })).toBe(false)
    expect(isRoutineLimit(null)).toBe(false)
  })
})
