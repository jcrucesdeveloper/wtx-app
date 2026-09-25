import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import { useExerciseName } from '../useExerciseName'

function mountWithExerciseName() {
  let exerciseName!: (name: string) => string
  const Host = defineComponent({
    setup() {
      exerciseName = useExerciseName().exerciseName
      return () => h('div')
    },
  })
  mount(Host, { global: { plugins: [i18n] } })
  return (name: string) => exerciseName(name)
}

describe('useExerciseName', () => {
  it('returns the English name when the locale is English', () => {
    i18n.global.locale.value = 'en'
    const exerciseName = mountWithExerciseName()
    expect(exerciseName('Squat')).toBe('Squat')
  })

  it('returns the Spanish name when the locale is Spanish', () => {
    i18n.global.locale.value = 'es'
    const exerciseName = mountWithExerciseName()
    expect(exerciseName('Squat')).toBe('Sentadilla')
    i18n.global.locale.value = 'en'
  })

  it('falls back to the stored name for a custom exercise with no catalog match', () => {
    i18n.global.locale.value = 'es'
    const exerciseName = mountWithExerciseName()
    expect(exerciseName('My Custom Exercise')).toBe('My Custom Exercise')
    i18n.global.locale.value = 'en'
  })
})
