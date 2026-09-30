import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { closeTopOverlay, openOverlayCount, pushBackHandler } from '../backStack'

describe('backStack', () => {
  it('returns false when nothing is open', () => {
    expect(closeTopOverlay()).toBe(false)
  })

  it('closes the most recently opened overlay first', () => {
    const calls: string[] = []
    const popA = pushBackHandler(() => calls.push('a'))
    const popB = pushBackHandler(() => calls.push('b'))

    expect(closeTopOverlay()).toBe(true)
    expect(calls).toEqual(['b'])

    popB()
    expect(closeTopOverlay()).toBe(true)
    expect(calls).toEqual(['b', 'a'])

    popA()
    popA() // idempotent
    expect(openOverlayCount()).toBe(0)
  })

  it('unregisters out of order', () => {
    const a = vi.fn<() => void>()
    const popA = pushBackHandler(a)
    const popB = pushBackHandler(() => {})
    popA()
    popB()
    expect(closeTopOverlay()).toBe(false)
    expect(a).not.toHaveBeenCalled()
  })
})

describe('BottomSheet + backStack', () => {
  const i18n = createI18n({ legacy: false, locale: 'en', missingWarn: false, fallbackWarn: false })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('registers while open and closes the top sheet on back', async () => {
    const outer = ref(false)
    const inner = ref(false)
    const Host = defineComponent({
      setup() {
        return () => [
          h(BottomSheet, { open: outer.value, title: 'Outer', onClose: () => (outer.value = false) }),
          h(BottomSheet, { open: inner.value, title: 'Inner', onClose: () => (inner.value = false) }),
        ]
      },
    })
    const wrapper = mount(Host, { global: { plugins: [i18n] } })
    expect(openOverlayCount()).toBe(0)

    outer.value = true
    await nextTick()
    inner.value = true
    await nextTick()
    expect(openOverlayCount()).toBe(2)

    expect(closeTopOverlay()).toBe(true)
    await nextTick()
    expect(inner.value).toBe(false)
    expect(outer.value).toBe(true)
    expect(openOverlayCount()).toBe(1)

    wrapper.unmount()
    expect(openOverlayCount()).toBe(0)
  })

  it('registers a sheet that mounts already open', () => {
    const wrapper = mount(BottomSheet, {
      props: { open: true, title: 'T' },
      global: { plugins: [i18n] },
    })
    expect(openOverlayCount()).toBe(1)
    expect(closeTopOverlay()).toBe(true)
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
    expect(openOverlayCount()).toBe(0)
  })
})
