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

describe('room store: the host owns the exercise order', () => {
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

  it("puts a late-joining guest's session in the host's order", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow({ exercise_order: [2, 0, 1], order_version: 3 })
    startWorkout()
    await flush()
    expect(names()).toEqual(['Dips', 'Bench Press', 'Overhead Press'])
    expect(useActiveSessionStore().session!.orderVersion).toBe(3)
    // Taking the order on joining is not news.
    expect(room.events.filter((e) => e.kind === 'order-changed')).toEqual([])
  })

  it("moves a guest's session mid-workout, keeping logged sets, and says so", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    const active = useActiveSessionStore()
    const bench = active.session!.draft.exercises[0]!
    active.completeSet(0, bench.loggedSets[0]!.id)
    active.startRestTimer(0, bench.loggedSets[0]!.id, 90)

    room.room = roomRow({ exercise_order: [1, 2, 0], order_version: 1 })
    await flush()
    expect(names()).toEqual(['Overhead Press', 'Dips', 'Bench Press'])
    expect(active.session!.draft.exercises[2]).toBe(bench)
    expect(bench.loggedSets[0]!.completed).toBe(true)
    // The rest timer started by that set follows Bench to its new place.
    expect(active.session!.restExerciseIndex).toBe(2)
    expect(room.events.map((e) => e.kind)).toContain('order-changed')
  })

  it('ignores an order older than the one followed', async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow({ exercise_order: [2, 1, 0], order_version: 5 })
    startWorkout()
    await flush()
    expect(useActiveSessionStore().followRoomOrder([0, 1, 2], 4)).toBe(false)
    expect(names()).toEqual(['Dips', 'Overhead Press', 'Bench Press'])
  })

  it("undoes a guest's own reorder", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    const active = useActiveSessionStore()
    const [a, b, c] = active.session!.draft.exercises
    active.reorderExercises([c!, b!, a!])
    expect(names()).toEqual(['Bench Press', 'Overhead Press', 'Dips'])
    expect(rpc).not.toHaveBeenCalled()
  })

  it("sends the host's reorder to the room and shows it at once", async () => {
    signIn('host')
    const room = useRoomStore()
    room.room = roomRow({ order_version: 2 })
    startWorkout()
    await flush()
    rpc.mockResolvedValue({ data: roomRow({ exercise_order: [2, 0, 1], order_version: 3 }), error: null })
    const active = useActiveSessionStore()
    const [a, b, c] = active.session!.draft.exercises
    active.reorderExercises([c!, a!, b!])

    expect(room.room?.exercise_order).toEqual([2, 0, 1])
    expect(rpc).toHaveBeenCalledWith('set_room_exercise_order', { p_room_id: 'room-1', p_order: [2, 0, 1] })
    await flush()
    expect(room.room?.order_version).toBe(3)
    // The host's own session is the source: never rewritten from the room.
    expect(names()).toEqual(['Dips', 'Bench Press', 'Overhead Press'])
  })

  it('keeps a slot the host removed in the room order, and marks it removed for everyone', async () => {
    signIn('host')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    rpc.mockResolvedValue({ data: null, error: null })
    const active = useActiveSessionStore()
    active.removeExercise(1) // Overhead Press
    expect(rpc).toHaveBeenLastCalledWith('set_room_plan', { p_room_id: 'room-1', p_order: [0, 1, 2], p_removed: [1] })
    await flush()
    const [a, c] = active.session!.draft.exercises
    active.reorderExercises([c!, a!])
    await flush()
    expect(rpc).toHaveBeenLastCalledWith('set_room_plan', { p_room_id: 'room-1', p_order: [2, 0, 1], p_removed: [1] })
    expect(room.routineExercises.map((e) => e.name)).toEqual(['Dips', 'Bench Press'])
  })

  it('sends only the latest order when the host reorders again while a write is in flight', async () => {
    signIn('host')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    let release: () => void = () => {}
    rpc.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: roomRow({ exercise_order: [1, 0, 2], order_version: 1 }), error: null })
        }),
    )
    rpc.mockResolvedValue({ data: roomRow({ exercise_order: [2, 1, 0], order_version: 2 }), error: null })
    const active = useActiveSessionStore()
    const [a, b, c] = active.session!.draft.exercises
    active.reorderExercises([b!, a!, c!])
    active.reorderExercises([c!, b!, a!])
    expect(rpc).toHaveBeenCalledTimes(1)

    release()
    await flush()
    await flush()
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc).toHaveBeenLastCalledWith('set_room_exercise_order', { p_room_id: 'room-1', p_order: [2, 1, 0] })
    expect(room.room?.exercise_order).toEqual([2, 1, 0])
    expect(room.room?.order_version).toBe(2)
  })

  it('shows members the routine in the room order', () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow({ exercise_order: [1, 0, 2], order_version: 1 })
    expect(room.routineExercises.map((e) => e.name)).toEqual(['Overhead Press', 'Bench Press', 'Dips'])
  })
})

describe('room store: the host removes routine exercises for everyone', () => {
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

  it("drops the host's removed exercise from a guest's session mid-workout, and says so", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()

    room.room = roomRow({ removed_slots: [1], order_version: 1 })
    await flush()
    expect(names()).toEqual(['Bench Press', 'Dips'])
    expect(room.routineExercises.map((e) => e.name)).toEqual(['Bench Press', 'Dips'])
    expect(room.events.filter((e) => e.kind === 'exercise-removed')).toMatchObject([
      { from: 'host', exercise: 'Overhead Press', kept: false },
    ])
  })

  it('keeps the sets a guest already logged on a removed exercise, as their own exercise', async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    const active = useActiveSessionStore()
    const ohp = active.session!.draft.exercises[1]!
    active.completeSet(1, ohp.loggedSets[0]!.id)

    room.room = roomRow({ removed_slots: [1], order_version: 1 })
    await flush()
    expect(names()).toEqual(['Bench Press', 'Overhead Press', 'Dips'])
    // Only what was lifted stays; it's no longer the routine's.
    expect(ohp.loggedSets.map((s) => s.completed)).toEqual([true])
    expect(ohp.slot).toBeUndefined()
    expect(room.events.filter((e) => e.kind === 'exercise-removed')).toMatchObject([
      { exercise: 'Overhead Press', kept: true },
    ])

    // The host reorders later: the kept exercise rides with the one before it.
    room.room = roomRow({ removed_slots: [1], exercise_order: [2, 0, 1], order_version: 2 })
    await flush()
    expect(names()).toEqual(['Dips', 'Bench Press', 'Overhead Press'])
  })

  it("gives a late joiner the host's routine, removals and order, without toasts", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow({ exercise_order: [2, 1, 0], removed_slots: [1], order_version: 4 })
    startWorkout()
    await flush()
    expect(names()).toEqual(['Dips', 'Bench Press'])
    expect(useActiveSessionStore().session!.orderVersion).toBe(4)
    expect(room.events).toEqual([])
  })

  it("won't let a guest remove a routine exercise, but lets them remove one they added", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    const active = useActiveSessionStore()
    expect(active.canReorder).toBe(false)
    expect(active.canRemoveExercise(0)).toBe(false)
    active.removeExercise(0)
    expect(names()).toEqual(['Bench Press', 'Overhead Press', 'Dips'])

    active.addExercise('Push-up')
    expect(active.canRemoveExercise(3)).toBe(true)
    active.removeExercise(3)
    expect(names()).toEqual(['Bench Press', 'Overhead Press', 'Dips'])
    expect(rpc).not.toHaveBeenCalled()
  })

  it('locks the shared routine until the room has loaded, even for the host', async () => {
    signIn('host')
    startWorkout()
    await flush()
    const active = useActiveSessionStore()
    expect(active.canReorder).toBe(false)
    expect(active.canRemoveExercise(0)).toBe(false)

    useRoomStore().room = roomRow()
    await flush()
    expect(active.canReorder).toBe(true)
    expect(active.canRemoveExercise(0)).toBe(true)
  })

  it("removes the host's own added exercise for everyone, like any routine exercise", async () => {
    signIn('host')
    const room = useRoomStore()
    room.room = roomRow()
    startWorkout()
    await flush()
    rpc.mockResolvedValue({ data: null, error: null })
    const active = useActiveSessionStore()
    active.addExercise('Push-up')
    active.removeExercise(3)
    expect(room.removedSlots).toEqual([3])
    expect(room.routineExercises.map((e) => e.name)).toEqual(['Bench Press', 'Overhead Press', 'Dips'])
  })

  it("never lets a stale row bring back a guest's removed exercise", async () => {
    signIn('guest')
    const room = useRoomStore()
    room.room = roomRow({ removed_slots: [0], order_version: 2 })
    startWorkout()
    await flush()
    expect(names()).toEqual(['Overhead Press', 'Dips'])
    room.room = roomRow({ removed_slots: [], order_version: 1 })
    await flush()
    expect(names()).toEqual(['Overhead Press', 'Dips'])
  })
})
