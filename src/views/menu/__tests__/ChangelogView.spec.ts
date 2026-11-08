import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { i18n } from '@/i18n'
import changelog from '@/changelog.txt?raw'
import ChangelogView from '../ChangelogView.vue'

describe('ChangelogView', () => {
  it('shows the date and every change from src/changelog.txt', () => {
    i18n.global.locale.value = 'en'
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
    const wrapper = mount(ChangelogView, { global: { plugins: [i18n, router] } })

    const [date, ...lines] = changelog.trim().split(/\r?\n/)
    expect(wrapper.find('.released').text()).toContain(date)
    expect(wrapper.findAll('.changes li')).toHaveLength(lines.length)
  })
})
