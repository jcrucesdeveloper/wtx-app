import { describe, it, expect, vi, beforeEach } from 'vitest'

const platform = vi.hoisted(() => ({ native: false, name: 'web' }))
const writeFile = vi.hoisted(() => vi.fn<(options: object) => Promise<{ uri: string }>>())
const plugin = vi.hoisted(() => ({
  available: vi.fn<() => Promise<{ instagram: boolean; whatsapp: boolean }>>(),
  share: vi.fn<(options: object) => Promise<{ route: 'story' | 'send' }>>(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => platform.native, getPlatform: () => platform.name },
  registerPlugin: () => plugin,
}))
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile },
}))
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn<() => Promise<void>>() } }))

const { installedTargets, shareToTarget, sharePlatform } = await import('../shareTargets')

function on(name: 'web' | 'android' | 'ios') {
  platform.native = name !== 'web'
  platform.name = name
}

const image = { bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/png', extension: 'png' }

describe('shareTargets', () => {
  beforeEach(() => {
    on('web')
    writeFile.mockReset()
    plugin.available.mockReset()
    plugin.share.mockReset()
    vi.unstubAllEnvs()
  })

  it('knows the platform', () => {
    expect(sharePlatform()).toBe('web')
    on('android')
    expect(sharePlatform()).toBe('android')
    on('ios')
    expect(sharePlatform()).toBe('ios')
  })

  it('finds no direct apps off Android, and asks the plugin on Android', async () => {
    expect(await installedTargets()).toEqual({ instagram: false, whatsapp: false })
    on('ios')
    expect(await installedTargets()).toEqual({ instagram: false, whatsapp: false })
    expect(plugin.available).not.toHaveBeenCalled()

    on('android')
    plugin.available.mockResolvedValue({ instagram: true, whatsapp: false })
    expect(await installedTargets()).toEqual({ instagram: true, whatsapp: false })
  })

  it('treats a build without the plugin as having no direct apps', async () => {
    on('android')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    plugin.available.mockRejectedValue(new Error('not implemented'))
    expect(await installedTargets()).toEqual({ instagram: false, whatsapp: false })
  })

  it('writes the image to the cache and hands it to the app', async () => {
    on('android')
    writeFile.mockResolvedValue({ uri: 'file:///cache/wtx-workout-whatsapp.png' })
    plugin.share.mockResolvedValue({ route: 'send' })
    expect(await shareToTarget('whatsapp', image, { text: 'caption' })).toBe('send')
    expect(writeFile).toHaveBeenCalledWith({
      path: 'wtx-workout-whatsapp.png',
      data: 'AQID',
      directory: 'CACHE',
    })
    expect(plugin.share).toHaveBeenCalledWith({
      target: 'whatsapp',
      file: 'file:///cache/wtx-workout-whatsapp.png',
      mimeType: 'image/png',
      text: 'caption',
    })
  })

  it('sends Instagram the App ID only when one is configured', async () => {
    on('android')
    writeFile.mockResolvedValue({ uri: 'file:///cache/x.png' })
    plugin.share.mockResolvedValue({ route: 'send' })
    await shareToTarget('instagram', image, { sticker: true, clipboard: 'https://x' })
    expect(plugin.share.mock.calls[0]![0]).not.toHaveProperty('appId')

    vi.stubEnv('VITE_FACEBOOK_APP_ID', '1234567890')
    plugin.share.mockResolvedValue({ route: 'story' })
    expect(
      await shareToTarget('instagram', image, {
        sticker: true,
        colors: { top: '#000000', bottom: '#111111' },
      }),
    ).toBe('story')
    expect(plugin.share.mock.calls[1]![0]).toMatchObject({
      appId: '1234567890',
      sticker: true,
      topColor: '#000000',
      bottomColor: '#111111',
    })
  })

  it('resolves null when the app cannot be opened, or off Android', async () => {
    expect(await shareToTarget('instagram', image)).toBeNull()
    on('android')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    writeFile.mockResolvedValue({ uri: 'file:///cache/x.png' })
    plugin.share.mockRejectedValue(
      Object.assign(new Error('App not installed'), { code: 'UNAVAILABLE' }),
    )
    expect(await shareToTarget('instagram', image)).toBeNull()
  })
})
