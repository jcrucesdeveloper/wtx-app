import { describe, it, expect } from 'vitest'
import { routineToRow, rowToRoutine, rowToSession, sessionToRow } from '../rows'

const USER = '00000000-0000-4000-8000-000000000001'
const ROUTINE_ID = '00000000-0000-4000-8000-000000000002'

describe('sync rows', () => {
  it('round-trips a routine', () => {
    const routine = { id: ROUTINE_ID, filename: 'push.wtt', rawText: '# Push', addedAt: 1_700_000_000_000 }
    const row = routineToRow(routine, USER, 3)
    expect(row).toMatchObject({ user_id: USER, position: 3, raw_text: '# Push', deleted_at: null })

    const back = rowToRoutine({
      ...row,
      position: 3,
      created_at: row.created_at!,
      updated_at: row.created_at!,
      deleted_at: null,
    })
    expect(back).toEqual({ ...routine, position: 3, deleted: false })
  })

  it('drops legacy non-UUID routine links from sessions', () => {
    const row = sessionToRow({ id: ROUTINE_ID, rawText: '# S', addedAt: 0, routineId: 'r_legacy' }, USER)
    expect(row.routine_id).toBeNull()
  })

  it('maps a tombstoned session row', () => {
    const session = rowToSession({
      id: ROUTINE_ID,
      user_id: USER,
      routine_id: null,
      room_id: 'room',
      raw_text: '# S',
      shared: false,
      feed_snapshot: null,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
      deleted_at: new Date(0).toISOString(),
    })
    expect(session).toEqual({
      id: ROUTINE_ID,
      rawText: '# S',
      addedAt: 0,
      routineId: undefined,
      roomId: 'room',
      shared: false,
      feedSnapshot: undefined,
      deleted: true,
    })
  })

  it('carries a shared session and its feed snapshot through the round trip', () => {
    const snapshot = { personalRecords: [], comparison: undefined, milestone: undefined, weekStreak: 2, elapsedSeconds: 300 }
    const row = sessionToRow({ id: ROUTINE_ID, rawText: '# S', addedAt: 0, shared: true, feedSnapshot: snapshot }, USER)
    expect(row.shared).toBe(true)
    expect(row.feed_snapshot).toEqual(snapshot)

    const back = rowToSession({
      id: ROUTINE_ID,
      user_id: USER,
      routine_id: null,
      room_id: null,
      raw_text: '# S',
      shared: true,
      feed_snapshot: row.feed_snapshot!,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
      deleted_at: null,
    })
    expect(back.shared).toBe(true)
    expect(back.feedSnapshot).toEqual(snapshot)
  })
})
