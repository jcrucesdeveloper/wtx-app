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
  photoRect: () => ({ x: 32, y: 32, width: 1016, height: 1160 }),
  workoutCardFrame: () => ({ width: 1080, height: 1920, safeTop: 250, safeBottom: 340 }),
}))
const pickPhoto = vi.hoisted(() => vi.fn<(source: string) => Promise<unknown>>())
vi.mock('@/services/photoPicker', () => ({ canTakePhoto: () => true, pickPhoto }))
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

function mountSheet(
  card: WorkoutCardData,
  style: WorkoutCardStyle = 'card',
  photo: HTMLImageElement | null = null,
) {
  i18n.global.locale.value = 'en'
  return mount(ShareWorkoutSheet, {
    props: { open: true, data: card, caption: '', style, photo },
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

describe('ShareWorkoutSheet: the photo', () => {
  beforeEach(() => pickPhoto.mockReset().mockResolvedValue(null))

  const buttonNamed = (wrapper: ReturnType<typeof mountSheet>, name: string) =>
    wrapper.findAll('button').find((b) => b.text() === name || b.attributes('aria-label') === name)

  it('shows where the photo goes, with the camera and the gallery, before opening either', async () => {
    const wrapper = mountSheet(data(2))
    await buttonNamed(wrapper, 'Photo')!.trigger('click')
    await nextTick()
    // Choosing the look opens nothing by itself: both ways in are on the image.
    expect(pickPhoto).not.toHaveBeenCalled()
    const slot = wrapper.find('.photo-slot--empty')
    expect(slot.text()).toContain('Add your photo')
    expect(slot.attributes('style')).toContain('left: 2.96')

    await buttonNamed(wrapper, 'Take photo')!.trigger('click')
    expect(pickPhoto).toHaveBeenLastCalledWith('camera')
    await buttonNamed(wrapper, 'Choose photo')!.trigger('click')
    expect(pickPhoto).toHaveBeenLastCalledWith('gallery')
  })

  it('offers to change, retake or remove a photo once there is one', () => {
    const wrapper = mountSheet(data(2), 'photo', {} as HTMLImageElement)
    expect(wrapper.find('.photo-slot--empty').exists()).toBe(false)
    expect(buttonNamed(wrapper, 'Change photo')).toBeDefined()
    expect(buttonNamed(wrapper, 'Take a new photo')).toBeDefined()
    expect(buttonNamed(wrapper, 'Remove photo')).toBeDefined()
  })

  it('has nothing about a photo on the card look', () => {
    const wrapper = mountSheet(data(2))
    expect(wrapper.find('.photo-slot').exists()).toBe(false)
  })
})
