import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RoomRecapBody from '../RoomRecapBody.vue'
import { buildRoomSummary, groupCelebrationTier } from '@/lib/roomSummary'
import type { MemberSetLog, PlannedExercise } from '@/lib/memberSession'
import type { TeamMember } from '@/lib/teamProgress'

const routine: PlannedExercise[] = [
  { name: 'Squat', kind: 'reps', sets: 2 },
  { name: 'Plank', kind: 'time', sets: 1 },
]

const at = (minute: number) => new Date(Date.UTC(2026, 9, 16, 18, minute)).toISOString()
let seq = 0
const log = (user_id: string, exercise_name: string, weight: number, reps: number, minute: number): MemberSetLog => ({
  id: `s${++seq}`,
  user_id,
  exercise_name,
  set_type: 'number',
  weight,
  reps,
  completed_at: at(minute),
})

const logs = [
  log('ana', 'Squat', 60, 5, 5),
  log('jaco', 'Squat', 100, 5, 6),
  log('ana', 'Squat', 62.5, 5, 9),
  log('jaco', 'Squat', 100, 6, 12),
  log('jaco', 'Plank', 20, 45, 15),
  log('ana', 'Plank', 0, 90, 18),
]

const colors = { jaco: '#4f7cff', ana: '#ff7a59' }

function mountBody(members: TeamMember[], status: 'active' | 'finished' = 'finished') {
  const summary = buildRoomSummary({ routine, members, logs, startedAt: at(0) })
  return mount(RoomRecapBody, {
    props: {
      summary,
      colors,
      unit: 'kg',
      myId: 'jaco',
      hostId: 'ana',
      status,
      pips: [
        { name: 'Squat', cleared: true },
        { name: 'Plank', cleared: true },
      ],
      tier: groupCelebrationTier(summary),
      celebrate: false,
    },
    global: { plugins: [i18n] },
  })
}

describe('RoomRecapBody', () => {
  let wrapper: VueWrapper | undefined

  afterEach(() => {
    wrapper?.unmount()
    i18n.global.locale.value = 'en'
  })

  it('leads with the team against the plan, then everyone in join order', () => {
    i18n.global.locale.value = 'en'
    wrapper = mountBody([
      { userId: 'jaco', displayName: 'Jaco', finishedAt: at(20) },
      { userId: 'ana', displayName: 'Ana', finishedAt: at(22) },
    ])
    expect(wrapper.find('.hero__label').text()).toBe('Team finished')
    expect(wrapper.find('.hero__value').text()).toContain('6/6')
    // Volume counts the squats only: the plank's "reps" are seconds.
    expect(wrapper.find('.hero__sub').text()).toMatch(/^2 of you · 22 min · 1.?713 kg$/)
    const names = wrapper.findAll('.member__name').map((n) => n.text())
    expect(names).toEqual(['Jaco', 'Ana'])
    expect(wrapper.text()).not.toMatch(/#1|1st/)
  })

  it('gives each member their own highlight and shows timed sets as time', () => {
    i18n.global.locale.value = 'en'
    wrapper = mountBody([
      { userId: 'jaco', displayName: 'Jaco', finishedAt: at(20) },
      { userId: 'ana', displayName: 'Ana', finishedAt: at(22) },
    ])
    const highlights = wrapper.findAll('.member__highlight').map((h) => h.text())
    expect(highlights).toEqual(['Squat 100 kg × 6', 'Squat 62.5 kg × 5'])
    const plankRows = wrapper.findAll('.side__exercise')[1]!.findAll('.side__best').map((b) => b.text())
    expect(plankRows[0]).toContain('20 kg ·')
    expect(plankRows[0]).not.toContain('×')
  })

  it('translates exercise names', () => {
    i18n.global.locale.value = 'es'
    wrapper = mountBody([
      { userId: 'jaco', displayName: 'Jaco', finishedAt: at(20) },
      { userId: 'ana', displayName: 'Ana', finishedAt: at(22) },
    ])
    expect(wrapper.find('.side__name').text()).toBe('Sentadilla')
    expect(wrapper.text()).toContain('Todos completaron Sentadilla')
  })

  it("shows who's still going while the room is live", () => {
    i18n.global.locale.value = 'en'
    wrapper = mountBody(
      [
        { userId: 'jaco', displayName: 'Jaco', finishedAt: at(20) },
        { userId: 'ana', displayName: 'Ana', finishedAt: null },
      ],
      'active',
    )
    expect(wrapper.find('.hero__label').text()).toBe('1 of 2 done')
    expect(wrapper.findAll('.member__facts')[1]!.text()).toContain('On Plank')
  })

  it('emits the member to watch', async () => {
    i18n.global.locale.value = 'en'
    wrapper = mountBody([{ userId: 'jaco', displayName: 'Jaco', finishedAt: at(20) }])
    await wrapper.find('.member').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['jaco']])
  })
})
