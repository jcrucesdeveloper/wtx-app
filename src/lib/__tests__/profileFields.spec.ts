import { describe, it, expect } from 'vitest'
import { BIO_MAX, NAME_MAX, isValidBio, isValidDisplayName } from '../profileFields'
import { colorForId, memberColor } from '../memberColors'

describe('profile fields', () => {
  it('accepts a 1–24 character name once trimmed', () => {
    expect(isValidDisplayName('Ana')).toBe(true)
    expect(isValidDisplayName('  Ana  ')).toBe(true)
    expect(isValidDisplayName('a'.repeat(NAME_MAX))).toBe(true)
    expect(isValidDisplayName('')).toBe(false)
    expect(isValidDisplayName('   ')).toBe(false)
    expect(isValidDisplayName('a'.repeat(NAME_MAX + 1))).toBe(false)
  })

  it('allows an empty bio and caps it at the column limit', () => {
    expect(isValidBio('')).toBe(true)
    expect(isValidBio('Powerlifting · Mon/Wed/Fri')).toBe(true)
    expect(isValidBio('a'.repeat(BIO_MAX))).toBe(true)
    expect(isValidBio(`${'a'.repeat(BIO_MAX)}  `)).toBe(true)
    expect(isValidBio('a'.repeat(BIO_MAX + 1))).toBe(false)
  })
})

describe('colorForId', () => {
  const palette = Array.from({ length: 8 }, (_, i) => memberColor(i))

  it('gives the same person the same color every time', () => {
    const id = '3f2b6c1e-8a4d-4f7e-9b21-5c0d7e8f9a10'
    expect(colorForId(id)).toBe(colorForId(id))
  })

  it('always picks from the member palette', () => {
    for (const id of [
      'a',
      'zz',
      '00000000-0000-0000-0000-000000000000',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
    ]) {
      expect(palette).toContain(colorForId(id))
    }
  })

  it('spreads different ids across colors', () => {
    const ids = Array.from({ length: 40 }, (_, i) => `user-${i}`)
    expect(new Set(ids.map(colorForId)).size).toBeGreaterThan(3)
  })
})
