import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import TrainingCalendar from '../TrainingCalendar.vue'

function mountCalendar(dates: string[], selected: string | null = null) {
  return mount(TrainingCalendar, {
    props: { dates, selected },
    global: { plugins: [i18n] },
  })
}

describe('TrainingCalendar', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
    vi.useFakeTimers({ toFake: ['Date'] })
    // A Wednesday in the middle of September 2026.
    vi.setSystemTime(new Date(2026, 8, 16, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('marks the trained days of the current month and counts them', () => {
    const cal = mountCalendar(['2026-09-01', '2026-09-14', '2026-09-16', '2026-09-16', '2026-08-20'])

    const trained = cal.findAll('.cal__day--trained').map((b) => b.text())
    expect(trained).toEqual(['1', '14', '16'])
    expect(cal.find('.cal__count').text()).toBe('4')
    expect(cal.text()).toContain('workouts this month')
    expect(cal.text()).toContain('3 this week')
    expect(cal.text()).toContain('5 all time')
    expect(cal.find('.cal__month').text()).toBe('Sep 2026')
  })

  it('selects a trained day, and tapping it again clears the selection', async () => {
    const cal = mountCalendar(['2026-09-14'])
    await cal.find('.cal__day--trained').trigger('click')
    expect(cal.emitted('select')).toEqual([['2026-09-14']])

    await cal.setProps({ selected: '2026-09-14' })
    await cal.find('.cal__day--trained').trigger('click')
    expect(cal.emitted('select')?.[1]).toEqual([null])
  })

  it('pages back only as far as the oldest session, and never into the future', async () => {
    const cal = mountCalendar(['2026-08-20', '2026-09-02'])
    const [prev, next] = cal.findAll('.cal__nav-btn')
    expect(next!.attributes('disabled')).toBeDefined()

    await prev!.trigger('click')
    expect(cal.find('.cal__month').text()).toBe('Aug 2026')
    expect(cal.text()).toContain('workout in August')
    expect(prev!.attributes('disabled')).toBeDefined()
  })

  it('opens a new, empty month with a fresh-start message instead of a zero', () => {
    const cal = mountCalendar(['2026-08-20'])
    expect(cal.find('.cal__count').exists()).toBe(false)
    expect(cal.text()).toContain('fresh start')
  })
})
