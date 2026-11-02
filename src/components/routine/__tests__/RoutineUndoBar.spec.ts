import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'

vi.mock('@/lib/exercises/imageCache', () => ({ warmExerciseImages: () => Promise.resolve() }))
vi.mock('@/services/analytics', () => ({ track: () => {} }))
vi.mock('@/services/haptics', () => ({ HapticsService: { light: () => Promise.resolve() } }))

import { useRoutinesStore } from '@/stores/routines'
import RoutineUndoBar from '../RoutineUndoBar.vue'
import TrainEditRow from '../TrainEditRow.vue'

const TEXT = (name: string) => `# ${name}\nunit: kg\n\nSquat | reps 3x5 | 100\n`

describe('RoutineUndoBar', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('wtx:routines', '[]')
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
  })

  it('says which routine went and puts it back', async () => {
    const routines = useRoutinesStore()
    const legs = routines.add(TEXT('Legs'), 'legs.wtt')
    const wrapper = mount(RoutineUndoBar, { global: { plugins: [i18n] } })
    expect(wrapper.find('.undo').exists()).toBe(false)

    routines.remove(legs.id)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('“Legs” deleted')

    await wrapper.find('button').trigger('click')
    expect(routines.getById(legs.id)).toBeDefined()
    expect(wrapper.find('.undo').exists()).toBe(false)
  })

  it('speaks Spanish too', async () => {
    i18n.global.locale.value = 'es'
    const routines = useRoutinesStore()
    routines.remove(routines.add(TEXT('Pierna'), 'p.wtt').id)
    const wrapper = mount(RoutineUndoBar, { global: { plugins: [i18n] } })
    expect(wrapper.text()).toContain('“Pierna” eliminada')
    expect(wrapper.text()).toContain('Deshacer')
  })
})

describe('TrainEditRow', () => {
  it("won't delete the routine being trained", async () => {
    i18n.global.locale.value = 'en'
    const wrapper = mount(TrainEditRow, {
      props: { name: 'Legs', meta: '', favorite: false, training: true },
      global: { plugins: [i18n] },
    })
    const bin = wrapper.find('.row__delete')
    expect(bin.attributes('disabled')).toBeDefined()
    await bin.trigger('click')
    expect(wrapper.emitted('remove')).toBeUndefined()
  })
})
