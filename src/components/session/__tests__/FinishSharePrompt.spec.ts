import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { WorkoutCardData } from '@/lib/workoutCard'
import FinishSharePrompt from '../FinishSharePrompt.vue'

vi.mock('@/lib/workoutCard', () => ({ paintWorkoutCard: vi.fn<() => void>() }))
const selection = vi.hoisted(() => vi.fn<() => Promise<void>>(() => Promise.resolve()))
vi.mock('@/services/haptics', () => ({ HapticsService: { selection } }))

const SheetStub = { name: 'ShareWorkoutSheet', props: ['open'], template: '<div />' }

function mountPrompt(data: WorkoutCardData | null = {} as WorkoutCardData) {
  return mount(FinishSharePrompt, {
    props: { data, caption: 'caption' },
    global: { plugins: [i18n], stubs: { ShareWorkoutSheet: SheetStub } },
  })
}

describe('FinishSharePrompt', () => {
  it('is one button: tapping anywhere on it opens the share sheet', async () => {
    const wrapper = mountPrompt()
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(1)
    expect(wrapper.findComponent(SheetStub).props('open')).toBe(false)

    await buttons[0]!.trigger('click')
    await nextTick()

    expect(selection).toHaveBeenCalledOnce()
    expect(wrapper.findComponent(SheetStub).props('open')).toBe(true)
  })

  it('shows nothing to tap without a card to share', () => {
    expect(mountPrompt(null).find('button').exists()).toBe(false)
  })
})
