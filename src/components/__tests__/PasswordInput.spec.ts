import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import PasswordInput from '../PasswordInput.vue'

describe('PasswordInput', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
  })

  function render() {
    return mount(PasswordInput, {
      props: { modelValue: 'secret', autocomplete: 'current-password' },
      global: { plugins: [i18n] },
    })
  }

  it('hides the password until the eye is tapped, then hides it again', async () => {
    const wrapper = render()
    const input = wrapper.find('input')
    const eye = wrapper.find('button')
    expect(input.attributes('type')).toBe('password')
    expect(eye.attributes('aria-label')).toBe('Show password')

    await eye.trigger('click')
    expect(input.attributes('type')).toBe('text')
    expect(eye.attributes('aria-label')).toBe('Hide password')

    await eye.trigger('click')
    expect(input.attributes('type')).toBe('password')
  })

  it('passes attributes to the input and reports what is typed', async () => {
    const wrapper = render()
    const input = wrapper.find('input')
    expect(input.attributes('autocomplete')).toBe('current-password')
    expect((input.element as HTMLInputElement).value).toBe('secret')

    await input.setValue('new-secret')
    expect(wrapper.emitted('update:modelValue')).toEqual([['new-secret']])
  })
})
