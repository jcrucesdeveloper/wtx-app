import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useRoomStore } from '@/stores/room'
import GroupStartSheet from '../GroupStartSheet.vue'

type CreateRoom = ReturnType<typeof useRoomStore>['create']

// Accounts on; nothing here talks to a server — room creation is stubbed.
vi.mock('@/services/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: true,
  requireSupabase: () => {
    throw new Error('no server in tests')
  },
}))

const push = vi.fn<(to: unknown) => void>()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

function button(label: string): HTMLButtonElement {
  const found = [...document.body.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(label),
  )
  if (!found) throw new Error(`no "${label}" button`)
  return found
}

describe('GroupStartSheet', () => {
  let pinia: Pinia
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    i18n.global.locale.value = 'en'
    pinia = createPinia()
    setActivePinia(pinia)
    push.mockReset()
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  function logIn() {
    useAuthStore().session = { user: { id: 'me' } } as never
  }

  function openSheet() {
    wrapper = mount(GroupStartSheet, {
      props: { open: true, routineId: 'r1', name: 'Push Day' },
      attachTo: document.body,
      global: { plugins: [pinia, i18n] },
    })
    return wrapper
  }

  it('explains that this starts a group workout for the routine', () => {
    logIn()
    openSheet()
    expect(document.body.textContent).toContain('Start a group workout?')
    expect(document.body.textContent).toContain('open a room for Push Day')
  })

  it('Cancel closes without creating a room', async () => {
    logIn()
    const room = useRoomStore()
    const create = vi.fn<CreateRoom>()
    room.create = create
    const w = openSheet()
    button('Cancel').click()
    await flushPromises()
    expect(w.emitted('update:open')).toEqual([[false]])
    expect(create).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('Confirm creates the room and opens its lobby', async () => {
    logIn()
    const room = useRoomStore()
    const create = vi.fn<CreateRoom>().mockResolvedValue({ id: 'room-1' } as Awaited<ReturnType<CreateRoom>>)
    room.create = create
    const w = openSheet()
    button('Create room').click()
    await flushPromises()
    expect(create).toHaveBeenCalledWith('r1')
    expect(push).toHaveBeenCalledWith({ name: 'room-lobby', params: { id: 'room-1' } })
    expect(w.emitted('update:open')).toEqual([[false]])
  })

  it('a failed create stays open with the reason', async () => {
    logIn()
    useRoomStore().create = vi.fn<CreateRoom>().mockRejectedValue(new Error('offline'))
    const w = openSheet()
    button('Create room').click()
    await flushPromises()
    expect(w.emitted('update:open')).toBeUndefined()
    expect(document.body.querySelector('[role="alert"]')?.textContent).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })

  it('logged out, Confirm sends the user to Social to sign in', async () => {
    const create = vi.fn<CreateRoom>()
    useRoomStore().create = create
    openSheet()
    expect(document.body.textContent).toContain('need an account')
    button('Sign in to continue').click()
    await flushPromises()
    expect(push).toHaveBeenCalledWith({ name: 'social' })
    expect(create).not.toHaveBeenCalled()
  })
})
