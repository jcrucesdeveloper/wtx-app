import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { i18n } from '@/i18n'
import TeamFinishCard from '../TeamFinishCard.vue'

const faces = [
  { userId: 'jaco', name: 'Jaco', color: '#4f7cff', progress: 1, done: true },
  { userId: 'ana', name: 'Ana', color: '#ff7a59', progress: 0.5, done: false },
  { userId: 'tomi', name: 'Tomi', color: '#2bb673', progress: 0.75, done: false },
]
const segments = [
  { userId: 'jaco', done: 4, color: '#4f7cff' },
  { userId: 'ana', done: 2, color: '#ff7a59' },
  { userId: 'tomi', done: 3, color: '#2bb673' },
]

describe('TeamFinishCard', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    i18n.global.locale.value = 'en'
  })

  afterEach(() => wrapper?.unmount())

  function mountCard(props: Partial<InstanceType<typeof TeamFinishCard>['$props']> = {}) {
    wrapper = mount(TeamFinishCard, {
      props: {
        faces,
        segments,
        done: 9,
        total: 12,
        finished: 1,
        members: 3,
        allFinished: false,
        line: '',
        seconds: null,
        ...props,
      },
      global: { plugins: [i18n] },
    })
    return wrapper
  }

  it("is live while others are still going: who's left, and the team's sets", () => {
    const card = mountCard({ line: 'Almost there — Ana has 2 sets left 💪', lineTappable: true })
    expect(card.find('.team-card__status').text()).toBe('2 still going')
    expect(card.find('.team-card__count').text()).toBe('9/12 sets')
    expect(card.findAll('.facepile__face')).toHaveLength(3)
    expect(card.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('9')
    expect(card.find('.team-card__line').text()).toContain('Ana has 2 sets left')
  })

  it("turns into the team's result when the last one finishes", () => {
    const card = mountCard({ done: 12, finished: 3, allFinished: true, seconds: 52 * 60, line: 'Team finished 🎉' })
    expect(card.find('.team-card__status').text()).toContain('Team finished')
    expect(card.find('.team-card__count').text()).toBe('12/12 sets · 52 min')
    expect(card.find('.team-card__line').exists()).toBe(false)
  })

  it('opens a member, the person waited on, and the recap', async () => {
    const card = mountCard({ line: 'Almost there', lineTappable: true })
    await card.findAll('.facepile__face')[1]!.trigger('click')
    await card.find('.team-card__line').trigger('click')
    await card.find('.team-card__recap').trigger('click')
    expect(card.emitted('select')).toEqual([['ana']])
    expect(card.emitted('line')).toHaveLength(1)
    expect(card.emitted('recap')).toHaveLength(1)
  })
})
