import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Session } from '@supabase/supabase-js'

/** Every write the room store sends, in order. */
const writes: { op: 'upsert' | 'delete'; id: string; row?: Record<string, unknown> }[] = []

vi.mock('@/services/supabase', () => {
  function from() {
    const ok = Promise.resolve({ data: null, error: null })
    return {
      upsert(row: Record<string, unknown>) {
        writes.push({ op: 'upsert', id: row.id as string, row })
        return ok
      },
      delete() {
        return {
          eq(_column: string, id: string) {
            writes.push({ op: 'delete', id })
            return ok
          },
        }
      },
    }
  }
  return { supabase: null, isSupabaseConfigured: true, requireSupabase: () => ({ from }) }
})
vi.mock('@/lib/exercises/imageCache', () => ({ warmExerciseImages: () => Promise.resolve() }))
vi.mock('@/services/analytics', () => ({ track: () => {} }))

import { useRoomStore } from '@/stores/room'
import { useAuthStore } from '@/stores/auth'
import { useActiveSessionStore } from '@/stores/activeSession'
import { WorkoutParser } from '@/lib/wtx'
import type { RoomRow } from '@/lib/supabase/database.types'
import type { StoredRoutine } from '@/stores/routines'

const ROUTINE = `# Push Day
unit: kg

Bench Press | reps 2x8 | 60
Squat | reps 1x5 | 100
`

/** A group workout in progress: this user ("me") and a friend, both following ROUTINE. */
function setup() {
  const auth = useAuthStore()
  auth.session = { user: { id: 'me' } } as Session
  const room = useRoomStore()
  room.room = {
    id: 'room-1',
    code: 'ABC123',
    host_id: 'me',
    routine_wtt: ROUTINE,
    routine_name: 'Push Day',
    unit: 'kg',
    status: 'active',
    started_at: null,
    created_at: '2026-10-16T10:00:00Z',
  } as RoomRow
  room.members = [
    { userId: 'me', displayName: 'Me', joinedAt: '2026-10-16T10:00:00Z', finishedAt: null },
    { userId: 'friend', displayName: 'Ana', joinedAt: '2026-10-16T10:00:01Z', finishedAt: null },
  ]
  const session = useActiveSessionStore()
  session.start({ id: 'r1', filename: 'push.wtt' } as StoredRoutine, WorkoutParser.parseTemplate(ROUTINE), {
    roomId: 'room-1',
  })
  return { room, session }
}

describe('room: a deleted set leaves the group workout', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    writes.length = 0
  })

  function logBench(session: ReturnType<typeof useActiveSessionStore>) {
    const ids = session.session!.draft.exercises[0]!.loggedSets.map((s) => s.id)
    for (const id of ids) {
      session.updateSet(0, id, { weight: 60, reps: 8 })
      session.completeSet(0, id)
    }
    return ids
  }

  it('deletes a logged set for everyone, and the team bar drops with it', () => {
    const { room, session } = setup()
    const [first, second] = logBench(session)
    expect(room.setLogs.map((l) => l.id)).toEqual([first, second])
    expect(room.team.done).toBe(2)
    expect(room.progress[0]!.sets).toBe(2)
    writes.length = 0

    session.removeSet(0, second!)

    expect(writes).toEqual([{ op: 'delete', id: second }])
    expect(room.setLogs.map((l) => l.id)).toEqual([first])
    expect(room.team.done).toBe(1)
    expect(room.progress[0]!.sets).toBe(1)
  })

  it('puts it back for everyone on undo, as the same set', () => {
    const { room, session } = setup()
    const [, second] = logBench(session)
    session.removeSet(0, second!)
    writes.length = 0

    session.restoreSet(0, second!)

    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({
      op: 'upsert',
      id: second,
      row: { room_id: 'room-1', user_id: 'me', exercise_name: 'Bench Press', weight: 60, reps: 8 },
    })
    expect(room.setLogs.map((l) => l.id)).toContain(second)
    expect(room.team.done).toBe(2)
  })

  it('has nothing to take back for a set that was never logged', () => {
    const { room, session } = setup()
    const [first] = logBench(session)
    session.addSet(0)
    const sets = session.session!.draft.exercises[0]!.loggedSets
    const extra = sets[sets.length - 1]!.id
    writes.length = 0

    session.removeSet(0, extra)
    session.restoreSet(0, extra)

    // A delete of a row that isn't there is harmless; nothing is ever pushed.
    expect(writes.filter((w) => w.op === 'upsert')).toEqual([])
    expect(room.setLogs.map((l) => l.id)).toEqual([first, expect.any(String)])
    expect(room.team.done).toBe(2)
  })

  it("counts only this member's part down, not the friend's", () => {
    const { room, session } = setup()
    const [first] = logBench(session)
    // Ana's two Bench sets, as they'd arrive over Realtime.
    for (const id of ['ana-1', 'ana-2']) {
      room.setLogs.push({
        id,
        room_id: 'room-1',
        user_id: 'friend',
        exercise_name: 'Bench Press',
        set_type: 'number',
        weight: 50,
        reps: 8,
        completed_at: '2026-10-16T10:05:00Z',
      })
    }
    expect(room.team.done).toBe(4)

    session.removeSet(0, first!)
    expect(room.team.done).toBe(3)
    expect(room.team.segments).toEqual([
      { userId: 'me', done: 1 },
      { userId: 'friend', done: 2 },
    ])
  })
})
