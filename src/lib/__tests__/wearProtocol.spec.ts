import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseConfirmedRest, WEAR_HOST_CAPABILITY, WEAR_PATHS, WEAR_PROTOCOL_VERSION } from '@/lib/wearProtocol'

/** The contract shared with the Java and Kotlin sides (their own tests read the same file). */
const fixtures = JSON.parse(
  readFileSync(resolve(process.cwd(), 'android/protocol/wear-v1.json'), 'utf8'),
) as {
  version: number
  capability: string
  paths: Record<string, string>
}

describe('the shared protocol file', () => {
  it('names the same version, capability and paths as this side', () => {
    expect(WEAR_PROTOCOL_VERSION).toBe(fixtures.version)
    expect(WEAR_HOST_CAPABILITY).toBe(fixtures.capability)
    expect(WEAR_PATHS).toEqual(fixtures.paths)
  })
})

describe('parseConfirmedRest', () => {
  const valid = {
    sessionId: 's-1',
    restId: 'r-1',
    restRev: 2,
    restEndsAt: 1_700_000_090_000,
    restDurationSeconds: 105,
  }

  it('reads a rest the host confirmed', () => {
    expect(parseConfirmedRest(valid)).toEqual(valid)
  })

  it('reads a rest that is over: no deadline', () => {
    expect(parseConfirmedRest({ ...valid, restEndsAt: undefined })).toEqual({
      ...valid,
      restEndsAt: null,
    })
  })

  it.each([
    ['nothing', null],
    ['an empty object', {}],
    ['no session', { ...valid, sessionId: '' }],
    ['no rest id', { ...valid, restId: undefined }],
    ['a fractional revision', { ...valid, restRev: 1.5 }],
    ['a negative revision', { ...valid, restRev: -1 }],
    ['a text deadline', { ...valid, restEndsAt: 'soon' }],
    ['a deadline of zero', { ...valid, restEndsAt: 0 }],
    ['a negative length', { ...valid, restDurationSeconds: -1 }],
  ])('refuses %s', (_name, raw) => {
    expect(parseConfirmedRest(raw)).toBeNull()
  })
})
