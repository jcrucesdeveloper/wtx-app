import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { requireSupabase } from '@/services/supabase'
import { useRoutinesStore, type StoredRoutine } from '@/stores/routines'
import { useSessionsStore, type StoredSession } from '@/stores/sessions'
import { useActiveSessionStore } from '@/stores/activeSession'
import { mergeRoutines, mergeSessions } from '@/lib/sync/merge'
import { routineToRow, rowToRoutine, rowToSession, sessionToRow } from '@/lib/sync/rows'
import type { Tables } from '@/lib/supabase/database.types'
import { isUuid, newUuid } from '@/lib/uuid'

/**
 * What still has to reach the server, plus how far we've pulled. Persisted so
 * changes made offline (or right before the app is killed) aren't lost.
 */
interface SyncState {
  /** The account this state belongs to — a different one means a fresh first sync. */
  userId: string | null
  routinesCursor: string | null
  sessionsCursor: string | null
  /** The library is small, so any routine change re-uploads all of it (with positions). */
  routinesDirty: boolean
  deletedRoutineIds: string[]
  upsertSessionIds: string[]
  deletedSessionIds: string[]
}

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error'

const STORAGE_KEY = 'wtx:sync'
const PAGE_SIZE = 1000
/** Pull a little before the cursor so rows committed out of order aren't skipped. */
const CURSOR_OVERLAP_MS = 5000
const FLUSH_DEBOUNCE_MS = 1500
const MAX_RETRY_MS = 60_000

/** Store actions that change data — everything else on those stores is a read. */
const ROUTINE_MUTATIONS = new Set(['add', 'update', 'remove', 'reorder', 'clear', 'resetToDefaults'])
const SESSION_MUTATIONS = new Set(['add', 'remove', 'clear', 'saveToProfile'])

function emptyState(userId: string | null = null): SyncState {
  return {
    userId,
    routinesCursor: null,
    sessionsCursor: null,
    routinesDirty: false,
    deletedRoutineIds: [],
    upsertSessionIds: [],
    deletedSessionIds: [],
  }
}

function readStored(): SyncState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState()
  } catch {
    return emptyState()
  }
}

function addUnique(list: string[], id: string) {
  if (!list.includes(id)) list.push(id)
}

function without(list: string[], ids: string[]): string[] {
  const drop = new Set(ids)
  return list.filter((id) => !drop.has(id))
}

function chunks<T>(items: T[], size = 200): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function laterOf(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return Date.parse(a) >= Date.parse(b) ? a : b
}

/**
 * Mirrors the local routine library and session log to Supabase while logged
 * in. The local stores stay the source of truth for the UI; this store only
 * watches their actions (`$onAction`), pushes changes, and folds pulled rows
 * back in through their `applyRemote` methods.
 */
export const useSyncStore = defineStore('sync', () => {
  const state = ref<SyncState>(readStored())
  const status = ref<SyncStatus>('off')
  const lastSyncedAt = ref<number | null>(null)
  const lastError = ref('')

  watch(
    state,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        /* storage unavailable — keep the in-memory state */
      }
    },
    { deep: true },
  )

  let userId: string | null = null
  let stopWatching: (() => void)[] = []
  let running: Promise<void> | null = null
  let rerun = false
  let flushTimer: ReturnType<typeof setTimeout> | undefined
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let retryDelay = 2000

  function scheduleSync(delay = FLUSH_DEBOUNCE_MS) {
    if (!userId) return
    clearTimeout(flushTimer)
    flushTimer = setTimeout(() => void syncNow(), delay)
  }

  function watchStores() {
    const routines = useRoutinesStore()
    const sessions = useSessionsStore()

    stopWatching.push(
      routines.$onAction(({ name, after }) => {
        if (!ROUTINE_MUTATIONS.has(name)) return
        const before = routines.routines.map((r) => r.id)
        after(() => {
          const now = new Set(routines.routines.map((r) => r.id))
          for (const id of before) if (!now.has(id)) addUnique(state.value.deletedRoutineIds, id)
          state.value.routinesDirty = true
          scheduleSync()
        })
      }),
    )

    stopWatching.push(
      sessions.$onAction(({ name, after }) => {
        if (!SESSION_MUTATIONS.has(name)) return
        // Device-only sessions never reach the server, so they're left out of both diffs.
        const syncedIds = () => new Set(sessions.sessions.filter((s) => !s.localOnly).map((s) => s.id))
        const before = syncedIds()
        after(() => {
          const now = syncedIds()
          const present = new Set(sessions.sessions.map((s) => s.id))
          for (const id of now) if (!before.has(id)) addUnique(state.value.upsertSessionIds, id)
          for (const id of before) {
            if (present.has(id)) continue
            addUnique(state.value.deletedSessionIds, id)
            state.value.upsertSessionIds = without(state.value.upsertSessionIds, [id])
          }
          scheduleSync()
        })
      }),
    )
  }

  function onOnline() {
    scheduleSync(0)
  }

  function onVisible() {
    if (document.visibilityState === 'visible') scheduleSync(0)
  }

  /** Replaces legacy `r_…` / `sess_…` ids with UUIDs so they fit the server's `uuid` keys. */
  function normalizeIds() {
    const routines = useRoutinesStore()
    const sessions = useSessionsStore()
    const activeSession = useActiveSessionStore()

    const routineMap: Record<string, string> = {}
    for (const r of routines.routines) if (!isUuid(r.id)) routineMap[r.id] = newUuid()
    if (Object.keys(routineMap).length) {
      routines.applyRemote(routines.routines.map((r) => (routineMap[r.id] ? { ...r, id: routineMap[r.id]! } : r)))
      state.value.routinesDirty = true
    }

    let changed = Object.keys(routineMap).length > 0
    const next = sessions.sessions.map((s) => {
      let out = s
      if (s.routineId && routineMap[s.routineId]) out = { ...out, routineId: routineMap[s.routineId] }
      if (!isUuid(s.id)) {
        out = { ...out, id: newUuid() }
        addUnique(state.value.upsertSessionIds, out.id)
        state.value.upsertSessionIds = without(state.value.upsertSessionIds, [s.id])
      }
      if (out !== s) changed = true
      return out
    })
    if (changed) sessions.applyRemote(next)

    const active = activeSession.session
    if (active && routineMap[active.routineId]) active.routineId = routineMap[active.routineId]!
  }

  async function flush() {
    const uid = userId
    if (!uid) return
    const sb = requireSupabase()
    const routines = useRoutinesStore()
    const sessions = useSessionsStore()

    normalizeIds()

    if (state.value.routinesDirty) {
      state.value.routinesDirty = false
      const rows = routines.routines.map((r, i) => routineToRow(r, uid, i))
      try {
        for (const batch of chunks(rows)) {
          const { error } = await sb.from('routines').upsert(batch)
          if (error) throw error
        }
      } catch (e) {
        state.value.routinesDirty = true
        throw e
      }
    }

    const deletedRoutines = [...state.value.deletedRoutineIds]
    for (const batch of chunks(deletedRoutines)) {
      const { error } = await sb
        .from('routines')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', batch)
      if (error) throw error
      state.value.deletedRoutineIds = without(state.value.deletedRoutineIds, batch)
    }

    const upsertIds = [...state.value.upsertSessionIds]
    const byId = new Map(sessions.sessions.map((s) => [s.id, s]))
    for (const batch of chunks(upsertIds)) {
      const rows = batch.flatMap((id) => {
        const s = byId.get(id)
        return s && !s.localOnly ? [sessionToRow(s, uid)] : []
      })
      if (rows.length) {
        const { error } = await sb.from('sessions').upsert(rows)
        if (error) throw error
      }
      state.value.upsertSessionIds = without(state.value.upsertSessionIds, batch)
    }

    const deletedSessions = [...state.value.deletedSessionIds]
    for (const batch of chunks(deletedSessions)) {
      const { error } = await sb
        .from('sessions')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', batch)
      if (error) throw error
      state.value.deletedSessionIds = without(state.value.deletedSessionIds, batch)
    }
  }

  async function fetchSince<T extends 'routines' | 'sessions'>(table: T, cursor: string | null) {
    const sb = requireSupabase()
    const rows: Tables<T>[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = sb.from(table).select('*').order('updated_at').order('id').range(from, from + PAGE_SIZE - 1)
      if (cursor) query = query.gt('updated_at', new Date(Date.parse(cursor) - CURSOR_OVERLAP_MS).toISOString())
      const { data, error } = await query
      if (error) throw error
      rows.push(...(data as unknown as Tables<T>[]))
      if (!data || data.length < PAGE_SIZE) return rows
    }
  }

  /**
   * Pulls rows changed since the last pull and folds them into the local stores.
   *
   * @returns The ids of every session row the server has (in this pull).
   */
  async function pull(opts: { dedupe?: boolean } = {}): Promise<Set<string>> {
    const routines = useRoutinesStore()
    const sessions = useSessionsStore()
    const activeSession = useActiveSessionStore()

    const routineRows = await fetchSince('routines', state.value.routinesCursor)
    const sessionRows = await fetchSince('sessions', state.value.sessionsCursor)

    const mergedRoutines = mergeRoutines(routines.routines, routineRows.map(rowToRoutine), opts)
    const remap = mergedRoutines.remap
    if (routineRows.length) routines.applyRemote(mergedRoutines.items as StoredRoutine[])

    const mergedSessions = mergeSessions(sessions.sessions, sessionRows.map(rowToSession), opts)
    const needsRemap = Object.keys(remap).length > 0
    if (sessionRows.length || needsRemap) {
      sessions.applyRemote(
        (mergedSessions.items as StoredSession[]).map((s) =>
          s.routineId && remap[s.routineId] ? { ...s, routineId: remap[s.routineId] } : s,
        ),
      )
    }
    for (const [localId] of Object.entries(mergedSessions.remap)) {
      state.value.upsertSessionIds = without(state.value.upsertSessionIds, [localId])
    }

    const active = activeSession.session
    if (active && remap[active.routineId]) active.routineId = remap[active.routineId]!

    state.value.routinesCursor = routineRows.reduce<string | null>(
      (max, r) => laterOf(max, r.updated_at),
      state.value.routinesCursor,
    )
    state.value.sessionsCursor = sessionRows.reduce<string | null>(
      (max, r) => laterOf(max, r.updated_at),
      state.value.sessionsCursor,
    )

    return new Set(sessionRows.map((r) => r.id))
  }

  /**
   * First sync of this device for this account: pull everything (folding the
   * device's duplicates into what the account already has), then upload
   * whatever is only on the device.
   */
  async function firstSync(uid: string) {
    const sessions = useSessionsStore()
    state.value = emptyState(uid)
    const remoteSessionIds = await pull({ dedupe: true })
    state.value.routinesDirty = true
    state.value.upsertSessionIds = sessions.sessions
      .filter((s) => !s.localOnly && !remoteSessionIds.has(s.id))
      .map((s) => s.id)
    await flush()
  }

  async function runOnce() {
    const uid = userId
    if (!uid) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      status.value = 'offline'
      return
    }
    status.value = 'syncing'
    try {
      if (state.value.userId !== uid) {
        await firstSync(uid)
      } else {
        await flush()
        await pull()
      }
      if (userId !== uid) return
      status.value = 'idle'
      lastSyncedAt.value = Date.now()
      lastError.value = ''
      retryDelay = 2000
    } catch (e) {
      if (userId !== uid) return
      status.value = typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error'
      lastError.value = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)
      clearTimeout(retryTimer)
      retryTimer = setTimeout(() => void syncNow(), retryDelay)
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS)
    }
  }

  /** Pushes pending changes, then pulls. Concurrent calls coalesce into one extra run. */
  function syncNow(): Promise<void> {
    if (running) {
      rerun = true
      return running
    }
    running = (async () => {
      do {
        rerun = false
        await runOnce()
      } while (rerun && userId)
    })().finally(() => {
      running = null
    })
    return running
  }

  /** Starts syncing for a logged-in user (first sync included, if this device is new to them). */
  function start(uid: string): Promise<void> {
    if (userId === uid) return syncNow()
    stop()
    userId = uid
    status.value = 'idle'
    watchStores()
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return syncNow()
  }

  /** Stops watching and syncing. Pending changes stay persisted for the same account. */
  function stop() {
    userId = null
    stopWatching.forEach((fn) => fn())
    stopWatching = []
    clearTimeout(flushTimer)
    clearTimeout(retryTimer)
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
    status.value = 'off'
  }

  /** Forgets everything about the last account (on log-out / account deletion). */
  function reset() {
    state.value = emptyState()
    lastSyncedAt.value = null
    lastError.value = ''
  }

  return { status, lastSyncedAt, lastError, start, stop, reset, syncNow }
})
