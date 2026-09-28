import type { Database, Json, Tables } from '@/lib/supabase/database.types'
import { isUuid } from '@/lib/uuid'
import { parseFeedSnapshot, type FeedSnapshot } from '@/lib/feedSnapshot'

type RoutineInsert = Database['public']['Tables']['routines']['Insert']
type SessionInsert = Database['public']['Tables']['sessions']['Insert']

/** The synced fields of a local routine (a `StoredRoutine`). */
export interface LocalRoutine {
  id: string
  filename: string
  rawText: string
  addedAt: number
}

/** The synced fields of a local session (a `StoredSession`). */
export interface LocalSession {
  id: string
  rawText: string
  addedAt: number
  routineId?: string
  roomId?: string
  shared?: boolean
  feedSnapshot?: FeedSnapshot
}

/** A routine as pulled from the server — `deleted` rows are tombstones. */
export interface RemoteRoutine extends LocalRoutine {
  position: number
  deleted: boolean
}

/** A session as pulled from the server — `deleted` rows are tombstones. */
export interface RemoteSession extends LocalSession {
  deleted: boolean
}

export function routineToRow(routine: LocalRoutine, userId: string, position: number): RoutineInsert {
  return {
    id: routine.id,
    user_id: userId,
    filename: routine.filename,
    raw_text: routine.rawText,
    position,
    created_at: new Date(routine.addedAt).toISOString(),
    deleted_at: null,
  }
}

export function rowToRoutine(row: Tables<'routines'>): RemoteRoutine {
  return {
    id: row.id,
    filename: row.filename,
    rawText: row.raw_text,
    addedAt: Date.parse(row.created_at),
    position: row.position,
    deleted: row.deleted_at !== null,
  }
}

export function sessionToRow(session: LocalSession, userId: string): SessionInsert {
  return {
    id: session.id,
    user_id: userId,
    // Legacy non-UUID routine ids can't be stored in a `uuid` column — drop the link rather than fail.
    routine_id: session.routineId && isUuid(session.routineId) ? session.routineId : null,
    room_id: session.roomId ?? null,
    raw_text: session.rawText,
    shared: session.shared ?? false,
    // FeedSnapshot is a plain-data shape (numbers/strings/booleans/arrays), so it
    // serializes as jsonb directly — the cast is just past TS's lack of a
    // structural `Json` index signature on a named interface.
    feed_snapshot: session.feedSnapshot ? (session.feedSnapshot as unknown as Json) : null,
    created_at: new Date(session.addedAt).toISOString(),
    deleted_at: null,
  }
}

export function rowToSession(row: Tables<'sessions'>): RemoteSession {
  return {
    id: row.id,
    rawText: row.raw_text,
    addedAt: Date.parse(row.created_at),
    routineId: row.routine_id ?? undefined,
    roomId: row.room_id ?? undefined,
    shared: row.shared,
    feedSnapshot: parseFeedSnapshot(row.feed_snapshot) ?? undefined,
    deleted: row.deleted_at !== null,
  }
}
