import { describe, it, expect, vi, beforeEach } from 'vitest'

const platform = vi.hoisted(() => ({ native: false, name: 'web' }))
const writeFile = vi.hoisted(() => vi.fn<(options: object) => Promise<{ uri: string }>>())
const share = vi.hoisted(() => vi.fn<(options: object) => Promise<void>>())

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => platform.native, getPlatform: () => platform.name },
}))
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE', ExternalStorage: 'EXTERNAL_STORAGE' },
  Filesystem: { writeFile },
}))
vi.mock('@capacitor/share', () => ({ Share: { share } }))

const { toBase64, canShare, imageSaveRoute, saveImage, timestampedName, GALLERY_FOLDER } =
  await import('../nativeShare')

function on(name: 'web' | 'android' | 'ios') {
  platform.native = name !== 'web'
  platform.name = name
}

describe('nativeShare', () => {
  beforeEach(() => {
    on('web')
    writeFile.mockReset()
    share.mockReset()
  })

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

  it('downloads on the web, saves to the gallery on Android, and uses the sheet on iOS', () => {
    expect(imageSaveRoute()).toBe('download')
    on('android')
    expect(imageSaveRoute()).toBe('gallery')
    on('ios')
    expect(imageSaveRoute()).toBe('share-sheet')
  })

  it('writes the image into the gallery folder on Android', async () => {
    on('android')
    writeFile.mockResolvedValue({ uri: 'file:///storage/emulated/0/Pictures/WTX/a.png' })
    const route = await saveImage(new Uint8Array([1, 2, 3]), 'a.png', 'image/png')
    expect(route).toBe('gallery')
    expect(writeFile).toHaveBeenCalledWith({
      path: `${GALLERY_FOLDER}/a.png`,
      data: 'AQID',
      directory: 'EXTERNAL_STORAGE',
      recursive: true,
    })
    expect(share).not.toHaveBeenCalled()
  })

  it('falls back to the share sheet when the gallery write fails', async () => {
    on('android')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    writeFile
      .mockRejectedValueOnce(new Error('denied'))
      .mockResolvedValueOnce({ uri: 'file:///cache/a.png' })
    const route = await saveImage(new Uint8Array([1]), 'a.png', 'image/png')
    expect(route).toBe('share-sheet')
    expect(writeFile).toHaveBeenLastCalledWith(expect.objectContaining({ directory: 'CACHE' }))
    expect(share).toHaveBeenCalledWith({ title: 'a.png', files: ['file:///cache/a.png'] })
  })

  it('names saved images by the time, so a second save keeps the first', () => {
    const at = new Date(2026, 9, 4, 8, 5, 9)
    expect(timestampedName('wtx-workout', 'png', at)).toBe('wtx-workout-20261004-080509.png')
  })
})
