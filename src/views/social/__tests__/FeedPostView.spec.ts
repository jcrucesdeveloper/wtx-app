import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { SaveRoutineCopyResult } from '@/composables/useSaveRoutineCopy'
import FeedPostView from '../FeedPostView.vue'

const post = vi.hoisted(() => ({
  value: {
    sessionId: 's1',
    posterId: 'ana',
    posterName: 'Ana',
    createdAt: '2026-10-01T10:00:00Z',
    session: { name: 'Push Day', unit: 'kg', exercises: [] as unknown[], notes: '' },
  },
}))
const me = vi.hoisted(() => ({ id: 'me' }))
const saveCopy = vi.hoisted(() => vi.fn<(p: unknown) => SaveRoutineCopyResult>())
const push = vi.hoisted(() => vi.fn<(to: unknown) => void>())

vi.mock('@/stores/feed', () => ({
  useFeedStore: () => ({ getPost: () => post.value, loadPost: () => Promise.resolve(post.value) }),
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: me }) }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 's1' } }),
  useRouter: () => ({ push, back: vi.fn<() => void>(), replace: vi.fn<() => void>() }),
}))
vi.mock('@/composables/useSaveRoutineCopy', () => ({ useSaveRoutineCopy: () => ({ saveCopy }) }))

const PageStub = {
  name: 'AppPage',
  template: '<div><slot name="leading" /><slot name="actions" /><slot /></div>',
}
const SheetStub = {
  name: 'BottomSheet',
  props: ['open'],
  template: '<div v-if="open" class="sheet-stub"><slot /></div>',
}

function mountView() {
  return mount(FeedPostView, {
    global: {
      plugins: [i18n],
      stubs: {
        AppPage: PageStub,
        BottomSheet: SheetStub,
        FeedPostSummary: true,
        FeedKudosButton: true,
        LoggedExerciseList: true,
        ReportSheet: true,
        BlockConfirmSheet: true,
      },
    },
  })
}

const routine = { id: 'r1', filename: 'Push Day (from @Ana).wtt', rawText: '', addedAt: 0 }

describe('FeedPostView ⋯ menu', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
    me.id = 'me'
    saveCopy.mockReset()
  })

  async function openMenu() {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('.icon-btn--action').trigger('click')
    return wrapper
  }

  it("saves a friend's routine to the library from the menu and closes it", async () => {
    saveCopy.mockReturnValue({ status: 'saved', routine, name: 'Push Day (from @Ana)', fromRoutine: true })
    const wrapper = await openMenu()
    const row = wrapper.get('[data-test="menu-save"]')
    expect(row.text()).toBe('Save to my library')

    await row.trigger('click')
    expect(saveCopy).toHaveBeenCalledWith(post.value)
    expect(wrapper.find('.sheet-stub').exists()).toBe(false)
    expect(wrapper.get('.copy__done').text()).toContain('Push Day (from @Ana)')
  })

  it('offers the save only until it is saved', async () => {
    saveCopy.mockReturnValue({ status: 'saved', routine, name: 'Push Day (from @Ana)', fromRoutine: true })
    const wrapper = await openMenu()
    await wrapper.get('[data-test="menu-save"]').trigger('click')
    await wrapper.get('.icon-btn--action').trigger('click')
    expect(wrapper.find('[data-test="menu-save"]').exists()).toBe(false)
  })

  it('shows the limit message when the library is full', async () => {
    saveCopy.mockReturnValue({ status: 'limit' })
    const wrapper = await openMenu()
    await wrapper.get('[data-test="menu-save"]').trigger('click')
    expect(wrapper.find('.copy__error').exists()).toBe(true)
    // Still offered: deleting a routine makes room again.
    await wrapper.get('.icon-btn--action').trigger('click')
    expect(wrapper.find('[data-test="menu-save"]').exists()).toBe(true)
  })

  it('has no menu on your own post', async () => {
    me.id = 'ana'
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('.icon-btn--action').exists()).toBe(false)
  })
})
