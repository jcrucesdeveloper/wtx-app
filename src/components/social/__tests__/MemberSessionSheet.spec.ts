import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { i18n } from '@/i18n'
import { useRoomStore } from '@/stores/room'
import MemberSessionSheet from '../MemberSessionSheet.vue'

const ROUTINE = `# Push Day
unit: kg

Bench Press | reps 3x8 | 60
Squat | reps 3x5 | 100
`

const at = (minute: number) => new Date(Date.UTC(2026, 8, 25, 18, minute)).toISOString()

function seedRoom(pinia: Pinia) {
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
  room.setLogs = [
    { id: 'a1', room_id: 'room-1', user_id: 'ana', exercise_name: 'Bench Press', set_type: 'number', weight: 45, reps: 10, completed_at: at(5) },
    { id: 'a2', room_id: 'room-1', user_id: 'ana', exercise_name: 'Bench Press', set_type: 'number', weight: 47.5, reps: 8, completed_at: at(8) },
    { id: 'j1', room_id: 'room-1', user_id: 'jaco', exercise_name: 'Squat', set_type: 'number', weight: 100, reps: 5, completed_at: at(6) },
  ]
  return room
}

describe('MemberSessionSheet', () => {
  let pinia: Pinia
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    i18n.global.locale.value = 'en'
    pinia = createPinia()
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  function mountSheet(userId: string | null) {
    const room = seedRoom(pinia)
    wrapper = mount(MemberSessionSheet, {
      props: { userId },
      attachTo: document.body,
      global: { plugins: [pinia, i18n] },
    })
    return room
  }

  it("shows the member's routine with the sets they've logged so far", async () => {
    mountSheet('ana')
    await nextTick()
    const text = document.body.textContent ?? ''

    expect(text).toContain('Ana')
    expect(text).toContain('On Bench Press')
    expect(text).toContain('2/6 sets')
    expect(text).toContain('45 kg × 10')
    expect(text).toContain('47.5 kg × 8')
    // Their untouched exercise is still listed, and other members' sets aren't mixed in.
    expect(text).toContain('Squat')
    expect(text).not.toContain('100 kg × 5')
  })

  it('updates live as new sets arrive', async () => {
    const room = mountSheet('ana')
    await nextTick()
    room.setLogs.push({
      id: 'a3',
      room_id: 'room-1',
      user_id: 'ana',
      exercise_name: 'Squat',
      set_type: 'number',
      weight: 60,
      reps: 5,
      completed_at: at(12),
    })
    await nextTick()
    const text = document.body.textContent ?? ''

    expect(text).toContain('On Squat')
    expect(text).toContain('60 kg × 5')
    expect(text).toContain('3/6 sets')
  })

  it('stays closed without a member', async () => {
    mountSheet(null)
    await nextTick()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })
})
