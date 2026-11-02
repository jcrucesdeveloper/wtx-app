import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { RoutineDraft } from '@/lib/serializeRoutine'
import RoutineForm from '../RoutineForm.vue'

// No network or Cache Storage in tests: the how-to sheet just gets no picture.
vi.mock('@/lib/exercises/imageCache', () => ({
  getCachedImageObjectUrl: vi.fn<() => Promise<string | undefined>>(async () => undefined),
  warmExerciseImages: vi.fn<() => Promise<void>>(async () => {}),
}))

function draft(names: string[]): RoutineDraft {
  return {
    name: 'Push Day',
    unit: 'kg',
    notes: '',
    tags: [],
    exercises: names.map((name) => ({ name, kind: 'reps', sets: 3, reps: 10, durationSeconds: 60 })),
  }
}

function dialog(): Element | null {
  return document.body.querySelector('[role="dialog"]')
}

describe('RoutineForm', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    i18n.global.locale.value = 'en'
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
  })

  function mountForm(names: string[]) {
    wrapper = mount(RoutineForm, {
      props: { modelValue: draft(names) },
      attachTo: document.body,
      global: { plugins: [i18n] },
    })
    return wrapper
  }

  it("tapping an exercise's picture opens how to do it", async () => {
    const w = mountForm(['Barbell Bench Press'])
    const thumb = w.get('button[aria-label="How to do Barbell Bench Press"]')
    await thumb.trigger('click')
    await flushPromises()
    expect(dialog()?.getAttribute('aria-label')).toBe('Barbell Bench Press')
  })

  it('the picture tap neither expands the card nor opens the exercise picker', async () => {
    const w = mountForm(['Barbell Bench Press'])
    expect(w.find('.exercise--open').exists()).toBe(false)
    await w.get('.exercise__thumb').trigger('click')
    await flushPromises()
    expect(w.find('.exercise--open').exists()).toBe(false)
    expect(document.body.querySelectorAll('[role="dialog"]')).toHaveLength(1)
    expect(dialog()?.getAttribute('aria-label')).not.toBe('Choose exercise')
  })

  it('the picture is not a drag handle', () => {
    const w = mountForm(['Barbell Bench Press'])
    expect(w.get('.exercise__thumb').classes()).not.toContain('exercise__handle')
    expect(w.get('.exercise__thumb').element.closest('.exercise__handle')).toBeNull()
  })

  it('an unnamed exercise has nothing to show yet', async () => {
    const w = mountForm([''])
    const thumb = w.get('.exercise__thumb')
    expect(thumb.attributes('disabled')).toBeDefined()
  })

  it('closing the how-to sheet goes back to the form', async () => {
    const w = mountForm(['Barbell Bench Press'])
    await w.get('.exercise__thumb').trigger('click')
    await flushPromises()
    const close = document.body.querySelector<HTMLButtonElement>('[role="dialog"] .icon-btn')!
    close.click()
    await flushPromises()
    expect(dialog()).toBeNull()
  })
})
