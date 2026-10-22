import { describe, it, expect } from 'vitest'
import { routineToRow, rowToRoutine, rowToSection, rowToSession, sectionToRow, sessionToRow } from '../rows'

const USER = '00000000-0000-4000-8000-000000000001'
const ROUTINE_ID = '00000000-0000-4000-8000-000000000002'
const SECTION_ID = '00000000-0000-4000-8000-000000000003'

describe('sync rows', () => {
  it('round-trips a routine', () => {
    const routine = { id: ROUTINE_ID, filename: 'push.wtt', rawText: '# Push', addedAt: 1_700_000_000_000 }
    const row = routineToRow(routine, USER, 3)
    expect(row).toMatchObject({ user_id: USER, position: 3, raw_text: '# Push', deleted_at: null })

    const back = rowToRoutine({
      ...row,
      section_id: row.section_id ?? null,
      position: 3,
      created_at: row.created_at!,
      updated_at: row.created_at!,
      deleted_at: null,
    })
    expect(back).toEqual({ ...routine, position: 3, deleted: false })
  })

  it('round-trips the section a routine is filed under, and sends null for unsorted', () => {
    const routine = { id: ROUTINE_ID, filename: 'push.wtt', rawText: '# Push', addedAt: 0, sectionId: SECTION_ID }
    const row = routineToRow(routine, USER, 0)
    expect(row.section_id).toBe(SECTION_ID)
    expect(routineToRow({ ...routine, sectionId: undefined }, USER, 0).section_id).toBeNull()

    const back = rowToRoutine({
      ...row,
      section_id: row.section_id ?? null,
      position: 0,
      created_at: row.created_at!,
      updated_at: row.created_at!,
      deleted_at: null,
    })
    expect(back.sectionId).toBe(SECTION_ID)
  })

  it('never sends a non-UUID section id', () => {
    const row = routineToRow({ id: ROUTINE_ID, filename: 'a', rawText: '#', addedAt: 0, sectionId: 's_1' }, USER, 0)
    expect(row.section_id).toBeNull()
  })

  it('round-trips a section', () => {
    const section = { id: SECTION_ID, name: 'Push/Pull/Legs', color: '#10b981', addedAt: 1_700_000_000_000 }
    const row = sectionToRow(section, USER, 2)
    expect(row).toMatchObject({ user_id: USER, name: 'Push/Pull/Legs', color: '#10b981', position: 2, deleted_at: null })

    const back = rowToSection({
      ...row,
      position: 2,
      created_at: row.created_at!,
      updated_at: row.created_at!,
      deleted_at: null,
    })
    expect(back).toEqual({ ...section, position: 2, deleted: false })
  })

  it('keeps a section row within the server checks', () => {
    const row = sectionToRow({ id: SECTION_ID, name: `  ${'x'.repeat(100)}`, color: 'red', addedAt: 0 }, USER, 0)
    expect(row.name.length).toBeLessThanOrEqual(60)
    expect(row.color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('maps a tombstoned section row', () => {
    const back = rowToSection({
      id: SECTION_ID,
      user_id: USER,
      name: 'Old',
      color: '#3b82f6',
      position: 0,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
      deleted_at: new Date(0).toISOString(),
    })
    expect(back.deleted).toBe(true)
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

  it('truncates a routine filename to the server cap', () => {
    const row = routineToRow({ id: ROUTINE_ID, filename: 'x'.repeat(300), rawText: '#', addedAt: 0 }, USER, 0)
    expect(row.filename).toHaveLength(255)
  })

  it('drops a feed snapshot too large for the server rather than failing the sync', () => {
    const huge = {
      personalRecords: [],
      comparison: undefined,
      milestone: undefined,
      weekStreak: 1,
      elapsedSeconds: 1,
      trainedWith: ['x'.repeat(40 * 1024)],
    }
    const row = sessionToRow({ id: ROUTINE_ID, rawText: '# S', addedAt: 0, shared: true, feedSnapshot: huge }, USER)
    expect(row.feed_snapshot).toBeNull()
    expect(row.shared).toBe(true)
  })
})
