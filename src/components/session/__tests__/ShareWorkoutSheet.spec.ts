import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { WorkoutCardData, WorkoutCardStyle } from '@/lib/workoutCard'
import ShareWorkoutSheet from '../ShareWorkoutSheet.vue'

const paint = vi.hoisted(() => vi.fn<(...args: unknown[]) => void>())
vi.mock('@/lib/workoutCard', () => ({
  paintWorkoutCard: paint,
  renderWorkoutCard: vi.fn<() => void>(),
  TOP_LIFTS: 3,
}))
vi.mock('@/services/shareTargets', () => ({
  installedTargets: () => Promise.resolve({ instagram: false, whatsapp: false }),
  sharePlatform: () => 'web',
  shareToTarget: vi.fn<() => void>(),
}))
vi.mock('@/services/analytics', () => ({ track: vi.fn<() => void>() }))
vi.mock('@/services/haptics', () => ({
  HapticsService: { selection: () => Promise.resolve() },
}))

const SheetStub = { name: 'BottomSheet', props: ['open'], template: '<div><slot /></div>' }

function data(lifts: number): WorkoutCardData {
  return {
    eyebrow: '',
    title: 'Push Day',
    stats: [],
    lifts: Array.from({ length: lifts }, (_, i) => ({ name: `Lift ${i}`, detail: '1' })),
    recordLabel: 'PR',
    moreLabel: (count) => `+${count}`,
    host: 'example.com',
    accent: '#e0263a',
  }
}

function mountSheet(card: WorkoutCardData, style: WorkoutCardStyle = 'card') {
  i18n.global.locale.value = 'en'
  return mount(ShareWorkoutSheet, {
    props: { open: true, data: card, caption: '', style },
    global: { plugins: [i18n], stubs: { BottomSheet: SheetStub } },
  })
}

/** The `allLifts` flag on the card that was last drawn. */
function lastDrawnAllLifts(): boolean | undefined {
  const calls = paint.mock.calls
  const card = calls[calls.length - 1]?.[1] as WorkoutCardData | undefined
  return card?.allLifts
}

describe('ShareWorkoutSheet: how many lifts', () => {
  beforeEach(() => paint.mockClear())

  it('draws the top lifts by default and every lift once asked', async () => {
    const wrapper = mountSheet(data(6))
    await nextTick()
    await nextTick()
    expect(lastDrawnAllLifts()).toBe(false)

    const group = wrapper.find('[aria-label="Exercises on the image"]')
    const [top, all] = group.findAll('button')
    expect(top!.text()).toBe('Top 3')
    expect(all!.text()).toBe('All 6')
    expect(top!.attributes('aria-checked')).toBe('true')

    await all!.trigger('click')
    await nextTick()
    await nextTick()
    expect(all!.attributes('aria-checked')).toBe('true')
    expect(lastDrawnAllLifts()).toBe(true)
  })

  it('offers no choice when every lift already fits in the top three', () => {
    expect(mountSheet(data(3)).find('[aria-label="Exercises on the image"]').exists()).toBe(false)
  })

  it('offers no choice on the looks that do not list lifts', () => {
    const wrapper = mountSheet(data(6), 'sticker')
    expect(wrapper.find('[aria-label="Exercises on the image"]').exists()).toBe(false)
  })
})
