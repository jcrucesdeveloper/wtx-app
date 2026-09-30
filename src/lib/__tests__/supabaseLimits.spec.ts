import { describe, it, expect } from 'vitest'
import { isRateLimited, jsonByteLength, rpcErrorCode } from '@/lib/supabase/limits'

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
})
