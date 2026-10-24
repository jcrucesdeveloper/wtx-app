import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { Session } from '@supabase/supabase-js'

const rpc = vi.fn<(fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>>()

vi.mock('@/services/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: true,
  requireSupabase: () => ({ rpc }),
}))
vi.mock('@/lib/exercises/imageCache', () => ({ warmExerciseImages: () => Promise.resolve() }))
vi.mock('@/services/analytics', () => ({ track: () => {} }))

import { useRoomStore } from '@/stores/room'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useRoutinesStore } from '@/stores/routines'
import { useAuthStore } from '@/stores/auth'
import type { RoomRow } from '@/lib/supabase/database.types'

const ROUTINE = `# Push Day
unit: kg

Bench Press | reps 2x8 | 60
Overhead Press | reps 2x8 | 40
Dips | reps 2x10
`

function roomRow(patch: Partial<RoomRow> = {}): RoomRow {
  return {
    id: 'room-1',
    code: 'ABC123',
    host_id: 'host',
    routine_wtt: ROUTINE,
    routine_name: 'Push Day',
    unit: 'kg',
    status: 'active',
    created_at: '2026-10-13T10:00:00Z',
    started_at: '2026-10-13T10:01:00Z',
    finished_at: null,
    exercise_order: null,
    order_version: 0,
    ...patch,
  }
}

const flush = async () => {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

let routineId: string

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wtx:routines', '[]')
  setActivePinia(createPinia())
  rpc.mockReset()
  routineId = useRoutinesStore().add(ROUTINE, 'push-day.wtt').id
})

function signIn(id: string) {
  useAuthStore().session = { user: { id } } as unknown as Session
}

function startWorkout() {
  const routines = useRoutinesStore()
  const parsed = routines.parsed(routineId)
  if (!parsed?.ok) throw new Error('routine did not parse')
  useActiveSessionStore().start(routines.getById(routineId)!, parsed.template, { roomId: 'room-1' })
}

const names = () => useActiveSessionStore().session!.draft.exercises.map((e) => e.name)
const eventsOf = (kind: string) => useRoomStore().events.filter((e) => e.kind === kind)

describe('room store: the host adds and swaps exercises for everyone', () => {
  it("gives the host's added exercise the routine's next slot and sends it to the room", async () => {
    signIn('host')
    const room = useRoomStore()
    room.room = roomRow({ order_version: 2 })
    startWorkout()
    await flush()
    rpc.mockResolvedValue({ data: null, error: null })
    const active = useActiveSessionStore()
    active.addExercise('Push-up')

    expect(active.session!.draft.exercises[3]!.slot).toBe(3)
    expect(rpc).toHaveBeenLastCalledWith('set_room_routine', {
      p_room_id: 'room-1',
      p_order: [0, 1, 2, 3],
      p_removed: [],
      p_added: ['Push-up'],
      p_swaps: {},
      p_focus: null,
    })
    expect(room.routineExercises.map((e) => e.name)).toEqual(['Bench Press', 'Overhead Press', 'Dips', 'Push-up'])
    expect(room.orderVersion).toBe(3)
  })

  it("adds the host's exercise to a guest's session where the host put it, keeping their sets, and says so", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    const active = useActiveSessionStore()
    const bench = active.session!.draft.exercises[0]!
    active.completeSet(0, bench.loggedSets[0]!.id)

    room.room = roomRow({ added_exercises: ['Push-up'], exercise_order: [0, 3, 1, 2], order_version: 1 })
    await flush()
    expect(names()).toEqual(['Bench Press', 'Push-up', 'Overhead Press', 'Dips'])
    expect(active.session!.draft.exercises[1]!.slot).toBe(3)
    expect(active.session!.draft.exercises[0]).toBe(bench)
    expect(bench.loggedSets[0]!.completed).toBe(true)
    expect(eventsOf('exercise-added')).toMatchObject([{ from: 'host', exercise: 'Push-up' }])
    // The addition says it all; no separate word about the order.
    expect(eventsOf('order-changed')).toEqual([])

    // Seeing the same row again changes nothing.
    room.room = roomRow({ added_exercises: ['Push-up'], exercise_order: [0, 3, 1, 2], order_version: 1 })
    await flush()
    expect(names()).toEqual(['Bench Press', 'Push-up', 'Overhead Press', 'Dips'])
    expect(eventsOf('exercise-added')).toHaveLength(1)
  })

  it("keeps a guest's own exercises where they put them when the host adds one", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    useActiveSessionStore().addExercise('Curl')
    await flush()
    room.room = roomRow({ added_exercises: ['Push-up'], order_version: 1 })
    await flush()
    expect(names()).toEqual(['Bench Press', 'Overhead Press', 'Dips', 'Curl', 'Push-up'])
    expect(rpc).not.toHaveBeenCalled()
  })

  it('never brings back an added exercise the host took out, from a stale row', async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow({ added_exercises: ['Push-up'], removed_slots: [3], order_version: 2 })
    startWorkout()
    await flush()
    expect(names()).toEqual(['Bench Press', 'Overhead Press', 'Dips'])
    room.room = roomRow({ added_exercises: ['Push-up'], order_version: 1 })
    await flush()
    expect(names()).toEqual(['Bench Press', 'Overhead Press', 'Dips'])
  })

  it("sends the host's swap of a routine exercise to the room", async () => {
    signIn('host')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    rpc.mockResolvedValue({ data: null, error: null })
    useActiveSessionStore().replaceExercise(1, 'Arnold Press')
    expect(rpc).toHaveBeenLastCalledWith(
      'set_room_routine',
      expect.objectContaining({ p_swaps: { '1': 'Arnold Press' }, p_order: [0, 1, 2] }),
    )
    expect(room.routineExercises.map((e) => e.name)).toEqual(['Bench Press', 'Arnold Press', 'Dips'])
  })

  it("swaps an untouched exercise in a guest's session in place", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    const active = useActiveSessionStore()
    const ohp = active.session!.draft.exercises[1]!

    room.room = roomRow({ swapped_slots: { '1': 'Arnold Press' }, order_version: 1 })
    await flush()
    expect(names()).toEqual(['Bench Press', 'Arnold Press', 'Dips'])
    expect(active.session!.draft.exercises[1]).toBe(ohp)
    expect(ohp.slot).toBe(1)
    expect(ohp.loggedSets).toHaveLength(2)
    expect(eventsOf('exercise-swapped')).toMatchObject([
      { exercise: 'Overhead Press', to: 'Arnold Press', kept: false },
    ])
  })

  it('keeps the sets a guest logged on a swapped exercise, and puts the new one right after it', async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    const active = useActiveSessionStore()
    const ohp = active.session!.draft.exercises[1]!
    active.completeSet(1, ohp.loggedSets[0]!.id)

    room.room = roomRow({ swapped_slots: { '1': 'Arnold Press' }, order_version: 1 })
    await flush()
    expect(names()).toEqual(['Bench Press', 'Overhead Press', 'Arnold Press', 'Dips'])
    expect(ohp.slot).toBeUndefined()
    expect(ohp.loggedSets.map((s) => s.completed)).toEqual([true])
    const arnold = active.session!.draft.exercises[2]!
    expect(arnold.slot).toBe(1)
    expect(arnold.loggedSets.map((s) => s.completed)).toEqual([false, false])
    expect(eventsOf('exercise-swapped')).toMatchObject([{ kept: true }])

    // The host reorders later: the kept exercise rides along, the new one follows its slot.
    room.room = roomRow({ swapped_slots: { '1': 'Arnold Press' }, exercise_order: [1, 0, 2], order_version: 2 })
    await flush()
    expect(names()).toEqual(['Arnold Press', 'Bench Press', 'Overhead Press', 'Dips'])
  })

  it("follows each host swap once, so a guest's own later swap stands", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow({ swapped_slots: { '1': 'Arnold Press' }, order_version: 1 })
    startWorkout()
    await flush()
    expect(names()).toEqual(['Bench Press', 'Arnold Press', 'Dips'])
    // A late joiner takes the routine as the host has it, without toasts.
    expect(room.events).toEqual([])

    useActiveSessionStore().replaceExercise(1, 'Dumbbell Press')
    room.room = roomRow({ swapped_slots: { '1': 'Arnold Press' }, exercise_order: [0, 2, 1], order_version: 2 })
    await flush()
    expect(names()).toEqual(['Bench Press', 'Dips', 'Dumbbell Press'])

    room.room = roomRow({ swapped_slots: { '1': 'Machine Press' }, exercise_order: [0, 2, 1], order_version: 3 })
    await flush()
    expect(names()).toEqual(['Bench Press', 'Dips', 'Machine Press'])
  })

  it('gives a late joiner the exercise the host added, under the name the host swapped in', async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow({
      added_exercises: ['Push-up'],
      swapped_slots: { '3': 'Diamond Push-up' },
      exercise_order: [3, 0, 1, 2],
      order_version: 5,
    })
    startWorkout()
    await flush()
    expect(names()).toEqual(['Diamond Push-up', 'Bench Press', 'Overhead Press', 'Dips'])
    expect(room.events).toEqual([])
  })

  it("falls back to the order alone on a server that can't hold additions yet", async () => {
    signIn('host')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    rpc.mockImplementation(async (fn) =>
      fn === 'set_room_routine'
        ? { data: null, error: { message: 'Could not find the function', code: 'PGRST202' } }
        : { data: roomRow({ exercise_order: [0, 1, 2, 3], order_version: 1 }), error: null },
    )
    useActiveSessionStore().addExercise('Push-up')
    await flush()
    await flush()
    expect(rpc).toHaveBeenLastCalledWith('set_room_exercise_order', { p_room_id: 'room-1', p_order: [0, 1, 2, 3] })
    // The host's screen keeps what the server couldn't hold.
    expect(room.addedExercises).toEqual(['Push-up'])
    expect(room.room?.order_version).toBe(1)
  })
})

describe('room store: where the host is, everyone goes', () => {
  it('sends the exercise the host moves to', async () => {
    signIn('host')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    rpc.mockResolvedValue({ data: null, error: null })
    const active = useActiveSessionStore()
    active.setFocusedExercise(active.session!.draft.exercises[2]!)
    await flush()
    expect(rpc).toHaveBeenLastCalledWith('set_room_routine', expect.objectContaining({ p_focus: 2 }))
    expect(room.focusSlot).toBe(2)

    // Seen again (a re-render): nothing new to send.
    rpc.mockClear()
    active.setFocusedExercise(active.session!.draft.exercises[2]!)
    await flush()
    expect(rpc).not.toHaveBeenCalled()
  })

  it("doesn't send a guest's own move", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    const active = useActiveSessionStore()
    active.setFocusedExercise(active.session!.draft.exercises[2]!)
    await flush()
    expect(rpc).not.toHaveBeenCalled()
  })

  it("asks a guest's screen to go where the host went, once, and says so", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    const active = useActiveSessionStore()
    active.setFocusedExercise(active.session!.draft.exercises[0]!)

    room.room = roomRow({ focus_slot: 2, order_version: 1 })
    await flush()
    expect(active.focusRequest?.exercise.name).toBe('Dips')
    expect(eventsOf('focus-moved')).toMatchObject([{ from: 'host', exercise: 'Dips' }])
    active.clearFocusRequest(active.focusRequest!.seq)

    // The guest goes back on their own; a later reorder doesn't drag them again.
    room.room = roomRow({ focus_slot: 2, exercise_order: [0, 2, 1], order_version: 2 })
    await flush()
    expect(active.focusRequest).toBeNull()
    expect(eventsOf('focus-moved')).toHaveLength(1)
  })

  it('takes a late joiner to where the host is, quietly', async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow({ focus_slot: 1, order_version: 3 })
    startWorkout()
    await flush()
    expect(useActiveSessionStore().focusRequest?.exercise.name).toBe('Overhead Press')
    expect(room.events).toEqual([])
  })

  it("says nothing when the guest is already on the host's exercise", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    const active = useActiveSessionStore()
    active.setFocusedExercise(active.session!.draft.exercises[1]!)
    room.room = roomRow({ focus_slot: 1, order_version: 1 })
    await flush()
    expect(eventsOf('focus-moved')).toEqual([])
  })
})
