import { describe, it, expect, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

const { toBase64, canShare } = await import('../nativeShare')

describe('nativeShare', () => {
  it('encodes bytes the same way btoa does', () => {
    const bytes = new TextEncoder().encode('wtx export ✓')
    expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'))
  })

  it('encodes a file larger than one chunk without overflowing the stack', () => {
    const bytes = new Uint8Array(200_000).map((_, i) => i % 256)
    expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'))
  })

  it('only offers the share sheet on the web when the browser has one', () => {
    expect(canShare()).toBe(typeof navigator.share === 'function')
  })
})
