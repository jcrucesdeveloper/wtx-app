import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { i18n } from '@/i18n'

const showAfterFinish = vi.hoisted(() => vi.fn<() => Promise<boolean>>(async () => true))
const maybeAsk = vi.hoisted(() => vi.fn<(input: unknown) => Promise<boolean>>(async () => false))

vi.mock('@/services/ads', () => ({ AdService: { showAfterFinish } }))
vi.mock('@/services/appReview', () => ({ AppReviewService: { maybeAsk } }))
vi.mock('@/services/haptics', () => ({
  HapticsService: {
    heavy: vi.fn<() => Promise<void>>(),
    success: vi.fn<() => Promise<void>>(),
    light: vi.fn<() => Promise<void>>(),
    medium: vi.fn<() => Promise<void>>(),
  },
}))
vi.mock('@/lib/exercises/imageCache', () => ({ warmExerciseImages: () => Promise.resolve() }))
vi.mock('@/services/analytics', () => ({ track: () => {} }))

import SessionCompleteView from '../SessionCompleteView.vue'
import { useSessionsStore } from '@/stores/sessions'

/** The finish screen's Done button, without the summary around it. */
const FinishSummaryStub = defineComponent({
  emits: ['done', 'share'],
  setup(_, { emit }) {
    return () => h('button', { class: 'done-btn', onClick: () => emit('done') }, 'Done')
  },
})

async function mountFinishedWorkout() {
  setActivePinia(createPinia())
  const stored = useSessionsStore().add('# Push day - 2026-11-13\n', undefined, Date.now(), undefined, true)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/sessions', component: { template: '<div />' } },
      { path: '/sessions/:id/complete', component: SessionCompleteView },
    ],
  })
  await router.push(`/sessions/${stored.id}/complete`)
  const wrapper = mount(SessionCompleteView, {
    global: {
      plugins: [i18n, router],
      stubs: {
        AppPage: { template: '<div><slot /></div>' },
        FinishSummary: FinishSummaryStub,
        FinishSharePrompt: true,
        TeamFinishCard: true,
        MemberSessionSheet: true,
      },
    },
  })
  return { wrapper, router }
}

describe('SessionCompleteView: the ad after Done', () => {
  beforeEach(() => {
    localStorage.clear()
    showAfterFinish.mockClear()
    maybeAsk.mockReset()
    maybeAsk.mockResolvedValue(false)
  })

  it('shows the interstitial once Done is tapped, after leaving the screen', async () => {
    const { wrapper, router } = await mountFinishedWorkout()
    expect(showAfterFinish).not.toHaveBeenCalled()

    await wrapper.find('.done-btn').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/sessions')
    expect(showAfterFinish).toHaveBeenCalledTimes(1)
  })

  it('never stacks the ad on a rating request', async () => {
    maybeAsk.mockResolvedValue(true)
    const { wrapper } = await mountFinishedWorkout()

    await wrapper.find('.done-btn').trigger('click')
    await flushPromises()

    expect(showAfterFinish).not.toHaveBeenCalled()
  })
})
