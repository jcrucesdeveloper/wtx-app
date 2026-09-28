import { describe, it, expect } from 'vitest'
import {
  buildFollowUrl,
  isValidFollowCode,
  normalizeFollowCode,
  readScannedFollowCode,
} from '../followCode'

describe('follow codes', () => {
  it('normalizes case, spaces and dashes', () => {
    expect(normalizeFollowCode(' k7qm-3x9p ')).toBe('K7QM3X9P')
  })

  it('rejects look-alike characters and wrong lengths', () => {
    expect(isValidFollowCode('K7QM3X9P')).toBe(true)
    expect(isValidFollowCode('K7QM3X90')).toBe(false)
    expect(isValidFollowCode('K7QM3XIP')).toBe(false)
    expect(isValidFollowCode('K7QM3X')).toBe(false)
  })

  it('round-trips a follow link through the QR reader', () => {
    const url = buildFollowUrl('K7QM3X9P', '/social/follow')
    expect(readScannedFollowCode(url)).toBe('K7QM3X9P')
  })

  it('reads a bare code and ignores junk', () => {
    expect(readScannedFollowCode('k7qm3x9p')).toBe('K7QM3X9P')
    expect(readScannedFollowCode('https://example.com')).toBeNull()
    expect(readScannedFollowCode('hello world')).toBeNull()
  })
})
