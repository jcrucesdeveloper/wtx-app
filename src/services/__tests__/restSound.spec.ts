import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const platform = vi.hoisted(() => ({ name: 'web', plugin: false }))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => platform.name,
    isPluginAvailable: () => platform.plugin,
  },
}))

const { RestSoundService, restSoundPlaysNatively } = await import('../restSound')
const { useSettingsStore } = await import('@/stores/settings')

describe('RestSoundService.restEnded', () => {
  let play: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    platform.name = 'web'
    platform.plugin = false
    play = vi.spyOn(RestSoundService, 'play').mockResolvedValue()
  })

  afterEach(() => play.mockRestore())

  it('chimes when a rest has just run out', () => {
    RestSoundService.restEnded()
    expect(play).toHaveBeenCalledOnce()
  })

  it('stays quiet when the sound is turned off', () => {
    useSettingsStore().setRestSoundEnabled(false)
    RestSoundService.restEnded()
    expect(play).not.toHaveBeenCalled()
  })

  it('leaves the chime to the native notification on Android', () => {
    platform.name = 'android'
    platform.plugin = true
    expect(restSoundPlaysNatively()).toBe(true)
    RestSoundService.restEnded()
    expect(play).not.toHaveBeenCalled()
  })

  it('plays in the web view on iOS', () => {
    platform.name = 'ios'
    expect(restSoundPlaysNatively()).toBe(false)
    RestSoundService.restEnded()
    expect(play).toHaveBeenCalledOnce()
  })
})

describe('settings.restSoundEnabled', () => {
  beforeEach(() => localStorage.clear())

  it('defaults on and remembers being turned off', async () => {
    setActivePinia(createPinia())
    const settings = useSettingsStore()
    expect(settings.restSoundEnabled).toBe(true)
    settings.setRestSoundEnabled(false)
    await Promise.resolve()
    expect(localStorage.getItem('wtx:rest-sound')).toBe('0')

    setActivePinia(createPinia())
    expect(useSettingsStore().restSoundEnabled).toBe(false)
  })
})
