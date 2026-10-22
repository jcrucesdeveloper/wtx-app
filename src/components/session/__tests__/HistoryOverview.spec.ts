import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { useSessionsStore } from '@/stores/sessions'
import HistoryOverview from '../HistoryOverview.vue'

vi.mock('@/services/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: false,
  requireSupabase: () => {
    throw new Error('no server in tests')
  },
}))

const session = (name: string, date: string) => `# ${name} - ${date}
unit: kg

Bench Press | 1x8 | 60
1 | 60 | 8
`

function mountHistory(count: number) {
  const sessions = useSessionsStore()
  // Day n of September, added in date order so the newest is listed first.
  for (let n = 1; n <= count; n++) {
    const day = String(n).padStart(2, '0')
    sessions.add(session(`Workout ${n}`, `2026-09-${day}`), undefined, new Date(2026, 8, n, 9).getTime())
  }
  return mount(HistoryOverview, {
    global: { plugins: [i18n], stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
}

describe('HistoryOverview', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 20, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('puts the calendar and workouts first, then the streak and best sets', () => {
    const history = mountHistory(2)
    const html = history.html()
    const calendar = html.indexOf('class="cal')
    const list = html.indexOf('class="row"')
    const summary = html.indexOf('class="summary"')
    const best = html.indexOf('Best sets')
    expect(calendar).toBeGreaterThan(-1)
    expect(calendar).toBeLessThan(list)
    expect(list).toBeLessThan(summary)
    expect(summary).toBeLessThan(best)
  })

  it('lists only the recent workouts until asked for all of them', async () => {
    const history = mountHistory(10)
    expect(history.findAll('.row')).toHaveLength(8)
    expect(history.find('.row__name').text()).toBe('Workout 10')

    const more = history.find('.more')
    expect(more.text()).toBe('Show all 10 workouts')
    await more.trigger('click')
    expect(history.findAll('.row')).toHaveLength(10)
    expect(history.find('.more').exists()).toBe(false)
  })

  it('shows no "show all" button when every workout already fits', () => {
    expect(mountHistory(3).find('.more').exists()).toBe(false)
  })

  it('filters to a tapped day, including one older than the recent few', async () => {
    const history = mountHistory(10)
    const day1 = history.findAll('.cal__day--trained').find((b) => b.text() === '1')!
    await day1.trigger('click')

    expect(history.findAll('.row').map((r) => r.find('.row__name').text())).toEqual(['Workout 1'])
    expect(history.find('.more').exists()).toBe(false)

    await history.find('.filter__clear').trigger('click')
    expect(history.findAll('.row')).toHaveLength(8)
  })
})
