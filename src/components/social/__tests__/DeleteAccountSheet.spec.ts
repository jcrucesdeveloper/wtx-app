import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
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
const { default: DeleteAccountSheet } = await import('../DeleteAccountSheet.vue')

function mountSheet() {
  return mount(DeleteAccountSheet, {
    props: { open: true },
    global: { plugins: [i18n], stubs: { teleport: true } },
    attachTo: document.body,
  })
}

describe('DeleteAccountSheet', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
  })

  it('stays disabled until the confirm word is typed', async () => {
    const wrapper = mountSheet()
    const confirm = wrapper.get('[data-test="delete-account-confirm"]')
    expect(confirm.attributes('disabled')).toBeDefined()
    await wrapper.get('[data-test="delete-account-input"]').setValue('delete')
    expect(confirm.attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('deletes, then confirms it is done and reports deleted on close', async () => {
    const auth = useAuthStore()
    const spy = vi.spyOn(auth, 'deleteAccount').mockResolvedValue()
    const wrapper = mountSheet()
    await wrapper.get('[data-test="delete-account-input"]').setValue('DELETE')
    await wrapper.get('[data-test="delete-account-confirm"]').trigger('click')
    await flushPromises()
    expect(spy).toHaveBeenCalledOnce()
    const done = wrapper.get('[data-test="delete-account-done"]')
    expect(done.text()).toContain('permanently deleted')
    await done.get('button').trigger('click')
    expect(wrapper.emitted('deleted')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('shows an error and stays open when deleting fails', async () => {
    const auth = useAuthStore()
    vi.spyOn(auth, 'deleteAccount').mockRejectedValue(new Error('nope'))
    const wrapper = mountSheet()
    await wrapper.get('[data-test="delete-account-input"]').setValue('DELETE')
    await wrapper.get('[data-test="delete-account-confirm"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain("Couldn't delete your account")
    expect(wrapper.emitted('deleted')).toBeUndefined()
    wrapper.unmount()
  })
})
