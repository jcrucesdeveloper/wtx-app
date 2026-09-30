import { describe, it, expect, vi } from 'vitest'
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

  it('links to the public URL when configured', () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://wtx.app')
    expect(buildFollowUrl('K7QM3X9P', '/social/follow')).toBe(
      'https://wtx.app/social/follow?follow=K7QM3X9P',
    )
    vi.unstubAllEnvs()
  })

  it('still reads old in-app (localhost) links', () => {
    expect(readScannedFollowCode('https://localhost/social/follow?follow=K7QM3X9P')).toBe('K7QM3X9P')
    expect(readScannedFollowCode('capacitor://localhost/social/follow?follow=k7qm3x9p')).toBe(
      'K7QM3X9P',
    )
  })

  it('reads a bare code and ignores junk', () => {
    expect(readScannedFollowCode('k7qm3x9p')).toBe('K7QM3X9P')
    expect(readScannedFollowCode('https://example.com')).toBeNull()
    expect(readScannedFollowCode('hello world')).toBeNull()
  })
})
