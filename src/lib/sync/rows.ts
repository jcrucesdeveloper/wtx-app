import type { Database, Json, Tables } from '@/lib/supabase/database.types'
import { isUuid } from '@/lib/uuid'
import { parseFeedSnapshot, type FeedSnapshot } from '@/lib/feedSnapshot'
import {
  FEED_SNAPSHOT_MAX_BYTES,
  ROUTINE_FILENAME_MAX,
  SECTION_NAME_MAX,
  jsonByteLength,
} from '@/lib/supabase/limits'

type RoutineInsert = Database['public']['Tables']['routines']['Insert']
type SectionInsert = Database['public']['Tables']['routine_sections']['Insert']
type SessionInsert = Database['public']['Tables']['sessions']['Insert']

/** The synced fields of a local routine (a `StoredRoutine`). */
export interface LocalRoutine {
  id: string
  filename: string
  rawText: string
  addedAt: number
  sectionId?: string
}

/** The synced fields of a local routine section (a `RoutineSection`). */
export interface LocalSection {
  id: string
  name: string
  color: string
  addedAt: number
}

/** A section as pulled from the server — `deleted` rows are tombstones. */
export interface RemoteSection extends LocalSection {
  position: number
  deleted: boolean
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
    // Always sent (null = unsorted), so taking a routine out of a section syncs too.
    section_id: routine.sectionId && isUuid(routine.sectionId) ? routine.sectionId : null,
    filename: routine.filename.slice(0, ROUTINE_FILENAME_MAX),
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
    // Rows written before sections existed have no such column at all.
    ...(row.section_id ? { sectionId: row.section_id } : {}),
    position: row.position,
    deleted: row.deleted_at !== null,
  }
}

export function sectionToRow(section: LocalSection, userId: string, position: number): SectionInsert {
  return {
    id: section.id,
    user_id: userId,
    name: section.name.trim().slice(0, SECTION_NAME_MAX) || '…',
    color: /^#[0-9a-f]{6}$/i.test(section.color) ? section.color : '#3b82f6',
    position,
    created_at: new Date(section.addedAt).toISOString(),
    deleted_at: null,
  }
}

export function rowToSection(row: Tables<'routine_sections'>): RemoteSection {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
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
    // An oversized recap is dropped rather than failing the whole session's sync
    // (the server caps it — see FEED_SNAPSHOT_MAX_BYTES).
    feed_snapshot:
      session.feedSnapshot && jsonByteLength(session.feedSnapshot) <= FEED_SNAPSHOT_MAX_BYTES
        ? (session.feedSnapshot as unknown as Json)
        : null,
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
