import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import ExerciseListSheet from '../ExerciseListSheet.vue'

vi.mock('@/lib/exercises/imageCache', () => ({ warmExerciseImages: () => Promise.resolve() }))

const KEY = 'wtx:exercisePicker:chipsHidden'
const SheetStub = { name: 'BottomSheet', props: ['open'], template: '<div><slot /></div>' }

async function mountPicker() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(ExerciseListSheet, {
    props: { open: false },
    global: {
      plugins: [pinia, i18n],
      stubs: {
        BottomSheet: SheetStub,
        ExerciseThumb: true,
        ExerciseImageSheet: true,
        MarqueeText: true,
      },
    },
  })
  await wrapper.setProps({ open: true })
  return wrapper
}

const chipRows = (w: Awaited<ReturnType<typeof mountPicker>>) =>
  w.get('#picker-chip-rows').element as HTMLElement

describe('ExerciseListSheet filter chips toggle', () => {
  beforeEach(() => {
    localStorage.clear()
    i18n.global.locale.value = 'en'
  })

  it('shows the chips by default, with a Hide button beside the muscle label', async () => {
    const wrapper = await mountPicker()
    const toggle = wrapper.get('[data-test="chips-toggle"]')
    expect(chipRows(wrapper).style.display).not.toBe('none')
    expect(toggle.text()).toBe('Hide')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('#picker-filter-muscle').text()).toBe('Muscle')
  })

  it('hides and shows the chips, and remembers it on this device', async () => {
    const wrapper = await mountPicker()
    await wrapper.get('[data-test="chips-toggle"]').trigger('click')
    expect(chipRows(wrapper).style.display).toBe('none')
    expect(wrapper.get('[data-test="chips-toggle"]').text()).toBe('Show')
    expect(wrapper.get('[data-test="chips-toggle"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('#picker-filter-muscle').text()).toBe('Filters')
    expect(localStorage.getItem(KEY)).toBe('1')

    const again = await mountPicker()
    expect(chipRows(again).style.display).toBe('none')

    await again.get('[data-test="chips-toggle"]').trigger('click')
    expect(chipRows(again).style.display).not.toBe('none')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('names the active filters while the chips are hidden', async () => {
    const wrapper = await mountPicker()
    const chest = wrapper.findAll('.picker__chip').find((c) => c.text() === 'Chest')!
    await chest.trigger('click')
    expect(wrapper.find('.picker__filter-active').exists()).toBe(false)

    await wrapper.get('[data-test="chips-toggle"]').trigger('click')
    expect(wrapper.get('.picker__filter-active').text()).toBe('Chest')
    // The filter still applies and can still be cleared.
    expect(wrapper.find('.picker__clear').exists()).toBe(true)
  })

  it('is translated', async () => {
    i18n.global.locale.value = 'es'
    const wrapper = await mountPicker()
    expect(wrapper.get('[data-test="chips-toggle"]').text()).toBe('Ocultar')
    await wrapper.get('[data-test="chips-toggle"]').trigger('click')
    expect(wrapper.get('[data-test="chips-toggle"]').text()).toBe('Mostrar')
    expect(wrapper.get('#picker-filter-muscle').text()).toBe('Filtros')
  })
})
