import { describe, it, expect, vi } from 'vitest'
import { buildJoinUrl, isValidRoomCode, normalizeRoomCode, readScannedRoomCode } from '../roomCode'

describe('room codes', () => {
  it('normalizes case, spaces and dashes', () => {
    expect(normalizeRoomCode(' k7q-m3x ')).toBe('K7QM3X')
  })

  it('rejects look-alike characters and wrong lengths', () => {
    expect(isValidRoomCode('K7QM3X')).toBe(true)
    expect(isValidRoomCode('K7QM30')).toBe(false)
    expect(isValidRoomCode('K7QMIX')).toBe(false)
    expect(isValidRoomCode('K7QM3')).toBe(false)
  })

  it('round-trips a join link through the QR reader', () => {
    const url = buildJoinUrl('K7QM3X', '/social/join')
    expect(readScannedRoomCode(url)).toBe('K7QM3X')
  })

  it('links to the public URL when configured', () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://wtx.app')
    expect(buildJoinUrl('K7QM3X', '/social/join')).toBe('https://wtx.app/social/join?code=K7QM3X')
    vi.unstubAllEnvs()
  })

  it('still reads old in-app (localhost) links', () => {
    expect(readScannedRoomCode('https://localhost/social/join?code=K7QM3X')).toBe('K7QM3X')
    expect(readScannedRoomCode('capacitor://localhost/social/join?code=k7qm3x')).toBe('K7QM3X')
  })

  it('reads a bare code and ignores junk', () => {
    expect(readScannedRoomCode('k7qm3x')).toBe('K7QM3X')
    expect(readScannedRoomCode('https://example.com')).toBeNull()
    expect(readScannedRoomCode('hello world')).toBeNull()
  })
})
