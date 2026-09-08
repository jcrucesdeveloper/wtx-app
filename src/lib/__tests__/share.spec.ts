import { describe, it, expect } from 'vitest'
import {
  encodeRoutineParam,
  decodeRoutineParam,
  buildImportUrl,
  readScannedRoutine,
  ROUTINE_PARAM,
} from '../share'

const SAMPLE = `# Push Day
unit: kg

Bench Press | reps 4x8 | 60 | rest 1m30s
Lateral Raise (Dumbbell) | reps 3x15 | 8
`

describe('routine share encoding', () => {
  it('round-trips arbitrary .wtt text, including unicode', () => {
    const text = `${SAMPLE}\n# entrenamiento 💪 — café`
    expect(decodeRoutineParam(encodeRoutineParam(text))).toBe(text)
  })

  it('produces a URL-safe parameter', () => {
    const param = encodeRoutineParam(SAMPLE)
    expect(param).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('builds an absolute import URL carrying the payload', () => {
    const url = buildImportUrl(SAMPLE, '/import')
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/import')
    expect(decodeRoutineParam(parsed.searchParams.get(ROUTINE_PARAM)!)).toBe(SAMPLE)
  })
})

describe('readScannedRoutine', () => {
  it('reads the routine out of a scanned import URL', () => {
    const url = buildImportUrl(SAMPLE, 'https://wtx.example/import')
    expect(readScannedRoutine(url)).toBe(SAMPLE)
  })

  it('reads a bare ?r= fragment', () => {
    expect(readScannedRoutine(`?${ROUTINE_PARAM}=${encodeRoutineParam(SAMPLE)}`)).toBe(SAMPLE)
  })

  it('accepts raw .wtt text encoded straight into the code', () => {
    expect(readScannedRoutine(`  ${SAMPLE}  `)).toBe(SAMPLE.trim())
  })

  it('returns null for an unrelated QR code', () => {
    expect(readScannedRoutine('https://example.com/hello')).toBeNull()
    expect(readScannedRoutine('just some text')).toBeNull()
    expect(readScannedRoutine('')).toBeNull()
  })
})
