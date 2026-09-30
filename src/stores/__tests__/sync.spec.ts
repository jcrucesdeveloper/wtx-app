import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

/**
 * A tiny in-memory stand-in for the Supabase tables sync touches. `select`
 * mimics RLS after the social feed migration: your own rows, plus the shared
 * sessions of people in `followed`.
 */
type Row = Record<string, unknown> & { id: string; user_id: string }
const db = vi.hoisted(() => ({
  me: '',
  followed: new Set<string>(),
  tables: { routines: [] as Row[], sessions: [] as Row[] } as Record<string, Row[]>,
  upserts: [] as { table: string; rows: Row[] }[],
}))

vi.mock('@/services/supabase', () => {
  function visible(table: string, row: Row) {
    if (row.user_id === db.me) return true
    return table === 'sessions' && !!row.shared && !row.deleted_at && db.followed.has(row.user_id)
  }
  function run(table: string, mode: 'select' | 'upsert' | 'update', payload: unknown, filters: ((r: Row) => boolean)[]) {
    const rows = db.tables[table]!
    if (mode === 'upsert') {
      const incoming = payload as Row[]
      db.upserts.push({ table, rows: incoming })
      for (const r of incoming) {
        const i = rows.findIndex((x) => x.id === r.id)
        const next = { ...r, updated_at: new Date().toISOString(), deleted_at: r.deleted_at ?? null }
        if (i >= 0) rows[i] = next
        else rows.push(next)
      }
      return { data: null, error: null }
    }
    if (mode === 'update') {
      for (const r of rows) if (r.user_id === db.me && filters.every((f) => f(r))) Object.assign(r, payload)
      return { data: null, error: null }
    }
    const data = rows.filter((r) => visible(table, r) && filters.every((f) => f(r)))
    return { data: data.map((r) => ({ ...r })), error: null }
  }
  function from(table: string) {
    const filters: ((r: Row) => boolean)[] = []
    let mode: 'select' | 'upsert' | 'update' = 'select'
    let payload: unknown
    // Awaitable like supabase-js's builder: the query runs a microtask later,
    // after the synchronous `.eq().in()…` chain has added its filters.
    const result = Promise.resolve().then(() => run(table, mode, payload, filters))
    const builder = Object.assign(result, {
      select: () => builder,
      order: () => builder,
      range: () => builder,
      eq: (col: string, v: unknown) => (filters.push((r) => r[col] === v), builder),
      neq: (col: string, v: unknown) => (filters.push((r) => r[col] !== v), builder),
      gt: (col: string, v: string) => (filters.push((r) => String(r[col]) > v), builder),
      in: (col: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[col])), builder),
      upsert: (rows: Row[]) => ((mode = 'upsert'), (payload = rows), builder),
      update: (fields: unknown) => ((mode = 'update'), (payload = fields), builder),
    })
    return builder
  }
  return {
    supabase: null,
    isSupabaseConfigured: true,
    requireSupabase: () => ({ from }),
  }
})
vi.mock('@/lib/exercises/imageCache', () => ({ warmExerciseImages: () => Promise.resolve() }))
vi.mock('@/services/analytics', () => ({ track: () => {} }))

import { useSyncStore } from '@/stores/sync'
import { useSessionsStore } from '@/stores/sessions'

const ME = '00000000-0000-4000-8000-00000000000a'
const FRIEND = '00000000-0000-4000-8000-00000000000b'
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const TEXT = (name: string) => `# ${name} - 2026-09-01\n`

function sessionRow(n: number, userId: string, extra: Partial<Row> = {}): Row {
  return {
    id: id(n),
    user_id: userId,
    routine_id: null,
    room_id: null,
    raw_text: TEXT(`S${n}`),
    shared: false,
    feed_snapshot: null,
    created_at: '2026-09-01T10:00:00.000Z',
    updated_at: '2026-09-01T10:00:00.000Z',
    deleted_at: null,
    ...extra,
  }
}

function local(n: number, extra: Record<string, unknown> = {}) {
  return { id: id(n), rawText: TEXT(`S${n}`), addedAt: 1000 + n, ...extra }
}

describe('sync store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    db.me = ME
    db.followed = new Set([FRIEND])
    db.tables = { routines: [], sessions: [] }
    db.upserts = []
  })

  it("never pulls a followee's shared sessions into your own log", async () => {
    db.tables.sessions!.push(sessionRow(1, ME), sessionRow(2, FRIEND, { shared: true }))

    const sync = useSyncStore()
    await sync.start(ME)

    const sessions = useSessionsStore()
    expect(sessions.sessions.map((s) => s.id)).toEqual([id(1)])
    expect(sync.isFullySynced()).toBe(true)
    sync.stop()
  })

  it('removes previously pulled sessions of other people once, keeping device-only and unsynced ones', async () => {
    db.tables.sessions!.push(sessionRow(1, ME), sessionRow(2, FRIEND, { shared: true }))
    // State as left by the old sync: first sync done, a friend's session in the log.
    localStorage.setItem(
      'wtx:sync',
      JSON.stringify({
        userId: ME,
        routinesCursor: null,
        sessionsCursor: null,
        routinesDirty: false,
        deletedRoutineIds: [],
        upsertSessionIds: [id(4)],
        deletedSessionIds: [],
      }),
    )
    setActivePinia(createPinia())
    const sessions = useSessionsStore()
    sessions.applyRemote([local(1), local(2), local(3, { localOnly: true }), local(4)])

    const sync = useSyncStore()
    await sync.start(ME)

    expect(sessions.sessions.map((s) => s.id).sort()).toEqual([id(1), id(3), id(4)])
    // The queued own session uploaded; the friend's session never was.
    expect(db.tables.sessions!.find((r) => r.id === id(4))?.user_id).toBe(ME)
    expect(db.upserts.flatMap((u) => u.rows).some((r) => r.id === id(2))).toBe(false)
    sync.stop()
  })

  it('keeps sessions it cannot prove belong to someone else', async () => {
    // Session 2 belongs to a friend you no longer follow — RLS hides it now.
    db.tables.sessions!.push(sessionRow(2, FRIEND, { shared: true }))
    db.followed = new Set()
    localStorage.setItem(
      'wtx:sync',
      JSON.stringify({ userId: ME, firstSyncDone: true, upsertSessionIds: [], deletedSessionIds: [] }),
    )
    setActivePinia(createPinia())
    const sessions = useSessionsStore()
    sessions.applyRemote([local(2)])

    const sync = useSyncStore()
    await sync.start(ME)
    expect(sessions.sessions.map((s) => s.id)).toEqual([id(2)])
    sync.stop()
  })

  it('reports unsynced work while offline instead of claiming success', async () => {
    const sync = useSyncStore()
    await sync.start(ME)
    expect(sync.isFullySynced()).toBe(true)

    const sessions = useSessionsStore()
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const added = sessions.add(TEXT('Offline'))
    await sync.syncNow()

    expect(sync.status).toBe('offline')
    expect(sync.isFullySynced()).toBe(false)
    expect(sync.unsyncedSessionIds()).toEqual([added.id])
    onLine.mockRestore()
    sync.stop()
  })

  it('keeps recording changes after a forced stop, for the same account to upload later', async () => {
    const sync = useSyncStore()
    await sync.start(ME)
    sync.stop()

    const sessions = useSessionsStore()
    const added = sessions.add(TEXT('While signed out'))
    expect(sync.unsyncedSessionIds()).toEqual([added.id])

    await sync.start(ME)
    expect(db.tables.sessions!.some((r) => r.id === added.id && r.user_id === ME)).toBe(true)
    sync.stop()
  })

  it('treats every session as unsynced until the first sync completes', () => {
    const sessions = useSessionsStore()
    sessions.applyRemote([local(1), local(2, { localOnly: true })])
    const sync = useSyncStore()
    expect(sync.unsyncedSessionIds()).toEqual([id(1)])
  })
})
