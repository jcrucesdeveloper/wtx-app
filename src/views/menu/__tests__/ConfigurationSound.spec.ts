import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { i18n } from '@/i18n'

vi.mock('@capacitor-community/admob', () => ({ AdMob: {}, AdmobConsentStatus: {} }))

const { RestSoundService } = await import('@/services/restSound')
const { useSettingsStore } = await import('@/stores/settings')
const { default: ConfigurationView } = await import('../ConfigurationView.vue')

function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  return mount(ConfigurationView, {
    global: { plugins: [i18n, router], stubs: { AccountSection: true } },
  })
}

describe('Configuration: Sound & vibration', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
    vi.spyOn(RestSoundService, 'play').mockResolvedValue()
  })

  it('groups the sound switches together', () => {
    const group = mountView().get('[data-test="sound-group"]')
    expect(group.text()).toContain('Sounds')
    expect(group.text()).toContain('Rest timer sound')
    expect(group.text()).toContain('Vibrate when rest ends')
  })

  it('saves the master switch and dims the rest sound under it', async () => {
    const wrapper = mountView()
    await wrapper.get('[data-test="sounds-switch"]').trigger('click')

    expect(useSettingsStore().soundsEnabled).toBe(false)
    await Promise.resolve()
    expect(localStorage.getItem('wtx:sounds')).toBe('0')
    const rest = wrapper.get('[data-test="rest-sound-switch"]')
    expect(rest.attributes('aria-disabled')).toBe('true')
    expect(rest.attributes('aria-checked')).toBe('false')
  })

  it('keeps the rest sound choice while sounds are off', async () => {
    const wrapper = mountView()
    await wrapper.get('[data-test="sounds-switch"]').trigger('click')
    await wrapper.get('[data-test="rest-sound-switch"]').trigger('click')
    expect(useSettingsStore().restSoundEnabled).toBe(true)
  })

  it('plays a test sound on demand', async () => {
    await mountView().get('[data-test="test-sound"]').trigger('click')
    expect(RestSoundService.play).toHaveBeenCalledOnce()
  })
})
