import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import MarqueeText from '@/components/ui/MarqueeText.vue'
import { MARQUEE_HOLD, MARQUEE_SPEED, MARQUEE_TOLERANCE, marqueeMetrics } from '../useMarquee'

describe('marqueeMetrics', () => {
  it('leaves names that fit alone', () => {
    expect(marqueeMetrics(200, 120)).toBeNull()
    expect(marqueeMetrics(200, 200)).toBeNull()
  })

  it('ignores sub-pixel rounding overflow', () => {
    expect(marqueeMetrics(200, 200 + MARQUEE_TOLERANCE)).toBeNull()
  })

  it('does nothing before the box has a width', () => {
    expect(marqueeMetrics(0, 300)).toBeNull()
  })

  it('slides an overflowing name exactly by its overflow', () => {
    expect(marqueeMetrics(200, 290)?.distance).toBe(90)
    expect(marqueeMetrics(200, 289.4)?.distance).toBe(90)
  })

  it('moves at a steady speed, with time to hold at both ends', () => {
    const metrics = marqueeMetrics(200, 200 + MARQUEE_SPEED * 3)!
    // 3s of movement is the middle share of the run; the rest is holding.
    expect(metrics.duration).toBeCloseTo(3 / (1 - 2 * MARQUEE_HOLD), 2)
  })

  it('gives tiny overflows a readable minimum run', () => {
    const metrics = marqueeMetrics(200, 205)!
    expect(metrics.duration).toBeCloseTo(1 / (1 - 2 * MARQUEE_HOLD), 2)
  })
})

describe('MarqueeText', () => {
  let wrapper: VueWrapper | undefined
  let resizeCallbacks: (() => void)[]
  let intersectCallbacks: ((entries: Partial<IntersectionObserverEntry>[]) => void)[]
  let widths: { client: number; scroll: number }

  beforeEach(() => {
    resizeCallbacks = []
    intersectCallbacks = []
    widths = { client: 200, scroll: 120 }
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => widths.client)
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(() => widths.scroll)
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          resizeCallbacks.push(cb)
        }
        observe() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: (entries: Partial<IntersectionObserverEntry>[]) => void) {
          intersectCallbacks.push(cb)
        }
        observe() {}
        disconnect() {}
      },
    )
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('stays still when the name fits', () => {
    wrapper = mount(MarqueeText, { props: { text: 'Squat' } })
    expect(wrapper.text()).toBe('Squat')
    expect(wrapper.classes()).not.toContain('marquee--on')
    expect(wrapper.attributes('style')).toBeUndefined()
  })

  it('animates a cut-off name and sets the distance and duration', async () => {
    widths.scroll = 290
    wrapper = mount(MarqueeText, { props: { text: 'Barbell Incline Bench Press' } })
    await nextTick()
    expect(wrapper.classes()).toContain('marquee--on')
    const style = wrapper.attributes('style')
    expect(style).toContain('--marquee-distance: 90px')
    expect(style).toContain('--marquee-duration:')
  })

  it('starts or stops when a resize changes whether it fits', async () => {
    wrapper = mount(MarqueeText, { props: { text: 'Barbell Incline Bench Press' } })
    expect(wrapper.classes()).not.toContain('marquee--on')

    widths.client = 100
    resizeCallbacks.forEach((cb) => cb())
    await nextTick()
    expect(wrapper.classes()).toContain('marquee--on')

    widths.client = 400
    resizeCallbacks.forEach((cb) => cb())
    await nextTick()
    expect(wrapper.classes()).not.toContain('marquee--on')
  })

  it('pauses while the row is off-screen', async () => {
    widths.scroll = 290
    wrapper = mount(MarqueeText, { props: { text: 'Barbell Incline Bench Press' } })
    intersectCallbacks.forEach((cb) => cb([{ isIntersecting: false }]))
    await nextTick()
    expect(wrapper.classes()).toContain('marquee--paused')

    intersectCallbacks.forEach((cb) => cb([{ isIntersecting: true }]))
    await nextTick()
    expect(wrapper.classes()).not.toContain('marquee--paused')
  })

  it('re-measures when the name changes', async () => {
    widths.scroll = 290
    wrapper = mount(MarqueeText, { props: { text: 'Barbell Incline Bench Press' } })
    await nextTick()
    expect(wrapper.classes()).toContain('marquee--on')

    widths.scroll = 60
    await wrapper.setProps({ text: 'Squat' })
    await Promise.resolve()
    await nextTick()
    expect(wrapper.classes()).not.toContain('marquee--on')
  })
})
