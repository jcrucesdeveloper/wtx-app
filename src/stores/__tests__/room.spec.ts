import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const rpc = vi.fn<(fn: string, args?: unknown) => Promise<{ data: unknown; error: { message: string } | null }>>()

vi.mock('@/services/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: true,
  requireSupabase: () => ({ rpc }),
}))
vi.mock('@/lib/exercises/imageCache', () => ({ warmExerciseImages: () => Promise.resolve() }))
vi.mock('@/services/analytics', () => ({ track: () => {} }))

import { RoomError, useRoomStore } from '@/stores/room'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useRoutinesStore } from '@/stores/routines'
import { useSessionsStore } from '@/stores/sessions'
import type { RoomRow } from '@/lib/supabase/database.types'

const ROUTINE = `# Push Day
unit: kg

Bench Press | reps 2x8 | 60
`

function roomRow(status: RoomRow['status']): RoomRow {
  return {
    id: 'room-1',
    code: 'ABC123',
    host_id: 'someone-else',
    routine_wtt: ROUTINE,
    routine_name: 'Push Day',
    unit: 'kg',
    status,
    started_at: null,
    created_at: '2026-10-13T10:00:00Z',
  } as RoomRow
}

/** The code a room action was refused with, or `null` if it got as far as the server. */
async function refusal(action: () => Promise<unknown>): Promise<string | null> {
  rpc.mockClear()
  const error = await action().then(
    () => null,
    (e: unknown) => e,
  )
  if (rpc.mock.calls.length > 0) return null
  return error instanceof RoomError ? error.code : 'threw something else'
}

describe('room store: one workout at a time', () => {
  let routineId: string

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('wtx:routines', '[]')
    setActivePinia(createPinia())
    rpc.mockReset()
    // The server is never reached in these tests when the guard works.
    rpc.mockResolvedValue({ data: null, error: { message: 'unknown' } })
    routineId = useRoutinesStore().add(ROUTINE, 'push-day.wtt').id
  })

  function startWorkout(roomId?: string) {
    const routines = useRoutinesStore()
    const parsed = routines.parsed(routineId)
    if (!parsed?.ok) throw new Error('routine did not parse')
    useActiveSessionStore().start(routines.getById(routineId)!, parsed.template, roomId ? { roomId } : undefined)
  }

  it('reaches the server when nothing is running', async () => {
    const room = useRoomStore()
    expect(await refusal(() => room.create(routineId))).toBeNull()
    expect(await refusal(() => room.join('ABC123'))).toBeNull()
  })

  it('refuses to create or join a room while a workout of your own is running', async () => {
    const room = useRoomStore()
    startWorkout()
    expect(await refusal(() => room.create(routineId))).toBe('workout_in_progress')
    expect(await refusal(() => room.join('ABC123'))).toBe('workout_in_progress')
  })

  it('refuses another room while a group workout is running', async () => {
    const room = useRoomStore()
    startWorkout('room-1')
    expect(await refusal(() => room.create(routineId))).toBe('group_workout_in_progress')
    expect(await refusal(() => room.join('XYZ789'))).toBe('group_workout_in_progress')
  })

  it.each(['lobby', 'active'] as const)('refuses another room from inside a room that is %s', async (status) => {
    const room = useRoomStore()
    room.room = roomRow(status)
    expect(room.openRoomId).toBe('room-1')
    expect(await refusal(() => room.create(routineId))).toBe('in_room')
    expect(await refusal(() => room.join('XYZ789'))).toBe('in_room')
  })

  it('is free again once the room has finished', async () => {
    const room = useRoomStore()
    room.room = roomRow('finished')
    expect(room.openRoomId).toBeNull()
    expect(await refusal(() => room.create(routineId))).toBeNull()
  })

  it('is free again once your own workout in the room is logged', async () => {
    const room = useRoomStore()
    room.room = roomRow('active')
    useSessionsStore().add('# Push Day - 2026-10-13\nunit: kg\n', routineId, Date.now(), 'room-1')
    expect(room.openRoomId).toBeNull()
    expect(await refusal(() => room.create(routineId))).toBeNull()
  })

  it('is not held by a room id left in storage from another day', () => {
    localStorage.setItem('wtx:currentRoom', 'room-1')
    setActivePinia(createPinia())
    const room = useRoomStore()
    expect(room.currentRoomId).toBe('room-1')
    expect(room.openRoomId).toBeNull()
  })
})
