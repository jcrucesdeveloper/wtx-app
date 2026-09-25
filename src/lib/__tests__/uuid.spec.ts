import { describe, it, expect, vi, afterEach } from 'vitest'
import { isUuid, newUuid } from '../uuid'

afterEach(() => vi.restoreAllMocks())

describe('newUuid', () => {
  it('returns a v4 UUID', () => {
    expect(isUuid(newUuid())).toBe(true)
  })

  it('still returns a UUID when randomUUID is unavailable', () => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('insecure context')
    })
    const id = newUuid()
    expect(isUuid(id)).toBe(true)
    expect(id[14]).toBe('4')
  })

  it('recognizes legacy ids as non-UUIDs', () => {
    expect(isUuid('r_abc_123')).toBe(false)
  })
})
