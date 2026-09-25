import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { i18n } from '@/i18n'
import { useRoomStore } from '@/stores/room'
import GroupProgressStrip from '../GroupProgressStrip.vue'

const ROUTINE = `# Push Day
unit: kg

Bench Press | reps 2x8 | 60
Squat | reps 2x5 | 100
`
// Planned working sets per person: 4. Two people → team total 8.

const at = (minute: number) => new Date(Date.UTC(2026, 8, 25, 18, minute)).toISOString()
let seq = 0
const set = (user_id: string, exercise_name: string) => ({
  id: `s${++seq}`,
  room_id: 'room-1',
  user_id,
  exercise_name,
  set_type: 'number' as const,
  weight: 50,
  reps: 5,
  completed_at: at(seq),
})

describe('GroupProgressStrip', () => {
  let pinia: Pinia
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    i18n.global.locale.value = 'en'
    pinia = createPinia()
    setActivePinia(pinia)
    const room = useRoomStore()
    room.room = {
      id: 'room-1',
      code: 'K7QM3X',
      host_id: 'jaco',
      routine_name: 'Push Day',
      routine_wtt: ROUTINE,
      unit: 'kg',
      status: 'active',
      created_at: at(0),
      started_at: at(1),
      finished_at: null,
    }
    room.members = [
      { userId: 'jaco', displayName: 'Jaco', joinedAt: at(0), finishedAt: null },
      { userId: 'ana', displayName: 'Ana', joinedAt: at(0), finishedAt: null },
    ]
    room.setLogs = []
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  function mountStrip() {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
    wrapper = mount(GroupProgressStrip, {
      props: { roomId: 'room-1' },
      attachTo: document.body,
      global: { plugins: [pinia, i18n, router] },
    })
    return wrapper
  }

  it('shows shared team progress instead of a ranking', async () => {
    const room = useRoomStore()
    room.setLogs = [set('jaco', 'Bench Press'), set('ana', 'Bench Press'), set('ana', 'Squat')]
    const strip = mountStrip()
    await nextTick()

    expect(strip.text()).toContain('Team')
    expect(strip.text()).toContain('3/8 sets')
    expect(strip.text()).not.toMatch(/leading|behind/i)
    // One segment per member, sized by their part of the plan.
    const widths = strip.findAll('.team__segment').map((s) => (s.element as HTMLElement).style.width)
    expect(widths).toEqual(['12.5%', '25%'])
  })

  it('rallies around the last one in, once everyone else is done', async () => {
    const room = useRoomStore()
    room.setLogs = [
      set('ana', 'Bench Press'),
      set('ana', 'Bench Press'),
      set('ana', 'Squat'),
      set('ana', 'Squat'),
      set('jaco', 'Bench Press'),
    ]
    const strip = mountStrip()
    await nextTick()

    expect(strip.text()).toContain('Almost there — Jaco has 3 sets left 💪')
  })

  it('celebrates when the whole team has finished', async () => {
    const room = useRoomStore()
    room.members = room.members.map((m) => ({ ...m, finishedAt: at(30) }))
    const strip = mountStrip()
    await nextTick()

    expect(strip.text()).toContain('Team finished 🎉')
  })

  it('lets you mute group alerts', async () => {
    const room = useRoomStore()
    room.muted = false
    const strip = mountStrip()
    await strip.find('.strip__mute').trigger('click')
    expect(room.muted).toBe(true)
  })
})
