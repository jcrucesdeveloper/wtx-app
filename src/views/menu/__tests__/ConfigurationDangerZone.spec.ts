import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { Session } from '@supabase/supabase-js'
import { i18n } from '@/i18n'

vi.mock('@capacitor-community/admob', () => ({ AdMob: {}, AdmobConsentStatus: {} }))
vi.mock('@/services/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: true,
  requireSupabase: () => {
    throw new Error('no network in tests')
  },
}))

const { useAuthStore } = await import('@/stores/auth')
const { useRoutinesStore } = await import('@/stores/routines')
const { useSessionsStore } = await import('@/stores/sessions')
const { default: ConfigurationView } = await import('../ConfigurationView.vue')

function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:any(.*)*', name: 'any', component: { template: '<div />' } }],
  })
  return mount(ConfigurationView, { global: { plugins: [i18n, router] } })
}

function signIn() {
  useAuthStore().session = {
    user: { id: 'u1', email: 'me@example.com' },
  } as unknown as Session
}

describe('Configuration: Danger zone', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
  })

  afterEach(() => vi.restoreAllMocks())

  it('is the last section on the screen', () => {
    const sections = mountView().findAll('section.group')
    const last = sections[sections.length - 1]
    expect(last?.attributes('data-test')).toBe('danger-zone')
    expect(last?.classes()).toContain('group--danger')
  })

  it('holds every delete action, signed in', () => {
    signIn()
    const zone = mountView().get('[data-test="danger-zone"]')
    expect(zone.find('[data-test="delete-all-data"]').exists()).toBe(true)
    expect(zone.find('[data-test="delete-account"]').exists()).toBe(true)
  })

  it('leaves no delete action in any other section', () => {
    signIn()
    const wrapper = mountView()
    const others = wrapper
      .findAll('section.group')
      .filter((s) => s.attributes('data-test') !== 'danger-zone')
    for (const section of others) {
      expect(section.text()).not.toContain('Delete all data')
      expect(section.text()).not.toContain('Delete account')
    }
    // Log out stays with the account.
    expect(wrapper.text()).toContain('Log out')
  })

  it('shows no account deletion when signed out', () => {
    const zone = mountView().get('[data-test="danger-zone"]')
    expect(zone.find('[data-test="delete-all-data"]').exists()).toBe(true)
    expect(zone.find('[data-test="delete-account"]').exists()).toBe(false)
  })

  it('still asks before deleting all data', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const reset = vi.spyOn(useRoutinesStore(), 'resetToDefaults')
    const clear = vi.spyOn(useSessionsStore(), 'clear')
    await mountView().get('[data-test="delete-all-data"]').trigger('click')
    expect(confirm).toHaveBeenCalledOnce()
    expect(reset).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
  })

  it('deletes all data once confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const clear = vi.spyOn(useSessionsStore(), 'clear')
    await mountView().get('[data-test="delete-all-data"]').trigger('click')
    expect(clear).toHaveBeenCalledOnce()
  })

  it('still asks for the confirm word before deleting the account', async () => {
    signIn()
    const remove = vi.spyOn(useAuthStore(), 'deleteAccount').mockResolvedValue()
    const wrapper = mountView()
    await wrapper.get('[data-test="delete-account"]').trigger('click')
    const confirm = wrapper.get('[data-test="delete-account-confirm"]')
    expect(confirm.attributes('disabled')).toBeDefined()
    await confirm.trigger('click')
    expect(remove).not.toHaveBeenCalled()

    await wrapper.get('[data-test="delete-account-form"] input').setValue('DELETE')
    expect(confirm.attributes('disabled')).toBeUndefined()
    await confirm.trigger('click')
    expect(remove).toHaveBeenCalledOnce()
  })
})
