import { describe, it, expect } from 'vitest'
import { containsBlockedTerms, normalizeForFilter } from '@/lib/contentFilter'

describe('normalizeForFilter', () => {
  it('lowercases, folds accents and collapses punctuation to spaces', () => {
    expect(normalizeForFilter('  Maricón!!  ¿Qué tal?')).toBe('maricon que tal')
  })

  it('undoes common leetspeak', () => {
    expect(normalizeForFilter('P0rn')).toBe('porn')
    expect(normalizeForFilter('$lut')).toBe('slut')
  })

  it('re-joins words spelled out letter by letter', () => {
    expect(normalizeForFilter('p u t a')).toBe('puta')
    expect(normalizeForFilter('n.i.g.g.a')).toBe('nigga')
  })
})

describe('containsBlockedTerms', () => {
  it('flags slurs and explicit terms in English and Spanish', () => {
    expect(containsBlockedTerms('you faggot')).toBe(true)
    expect(containsBlockedTerms('Sudaca')).toBe(true)
    expect(containsBlockedTerms('PUTA madre')).toBe(true)
    expect(containsBlockedTerms('maricón')).toBe(true)
  })

  it('catches plurals and light obfuscation', () => {
    expect(containsBlockedTerms('putas')).toBe(true)
    expect(containsBlockedTerms('maricones')).toBe(true)
    expect(containsBlockedTerms('wh0re')).toBe(true)
    expect(containsBlockedTerms('s-l-u-t')).toBe(true)
  })

  it('leaves ordinary workout text and mild words alone', () => {
    expect(containsBlockedTerms('Push Day — bench 5x5 @ 80kg')).toBe(false)
    expect(containsBlockedTerms('Damn, that was hard')).toBe(false)
    expect(containsBlockedTerms('Computo de series')).toBe(false)
    expect(containsBlockedTerms('Spicy leg day in Scunthorpe')).toBe(false)
    expect(containsBlockedTerms('Disputa amistosa')).toBe(false)
  })

  it('checks every text it is given and ignores empty ones', () => {
    expect(containsBlockedTerms('Leg day', undefined, null, '', 'porno')).toBe(true)
    expect(containsBlockedTerms(undefined, '')).toBe(false)
  })
})
