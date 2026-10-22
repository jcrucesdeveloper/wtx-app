import type {
  LocalRoutine,
  LocalSection,
  LocalSession,
  RemoteRoutine,
  RemoteSection,
  RemoteSession,
} from './rows'

export interface MergeOptions {
  /**
   * Fold local items that were never uploaded into a remote item with the
   * same text, instead of keeping both. Only safe on the first sync of a
   * device, when nothing local is on the server yet — it's what stops the
   * starter Push/Pull/Leg routines from doubling up on every new device.
   */
  dedupe?: boolean
}

export interface MergeResult<T> {
  items: T[]
  /** Local id → remote id, for every local item folded into a remote one by `dedupe`. */
  remap: Record<string, string>
}

/**
 * Applies pulled routine rows to the local library: tombstones remove,
 * everything else is inserted or replaced at its remote `position`.
 * Returns new arrays/objects — never mutates `local`.
 */
export function mergeRoutines<T extends LocalRoutine>(
  local: T[],
  remote: RemoteRoutine[],
  options: MergeOptions = {},
): MergeResult<T | LocalRoutine> {
  const items: (T | LocalRoutine)[] = [...local]
  const remap: Record<string, string> = {}
  const remoteIds = new Set(remote.map((r) => r.id))

  for (const row of [...remote].sort((a, b) => a.position - b.position)) {
    const index = items.findIndex((r) => r.id === row.id)
    if (index >= 0) items.splice(index, 1)
    if (row.deleted) continue

    if (index < 0 && options.dedupe) {
      const dup = items.findIndex((r) => !remoteIds.has(r.id) && r.rawText === row.rawText)
      if (dup >= 0) {
        remap[items[dup]!.id] = row.id
        items.splice(dup, 1)
      }
    }

    const { id, filename, rawText, addedAt, sectionId } = row
    const merged: LocalRoutine = { id, filename, rawText, addedAt, ...(sectionId ? { sectionId } : {}) }
    items.splice(Math.min(Math.max(row.position, 0), items.length), 0, merged)
  }

  return { items, remap }
}

/**
 * Applies pulled section rows to the local sections, exactly like
 * {@link mergeRoutines}: tombstones remove, everything else is inserted or
 * replaced at its remote `position`. With `dedupe`, a never-uploaded local
 * section folds into the account's one of the same name (ignoring case), so
 * signing in on a device where you'd made "Push/Pull/Legs" doesn't double it.
 */
export function mergeSections<T extends LocalSection>(
  local: T[],
  remote: RemoteSection[],
  options: MergeOptions = {},
): MergeResult<T | LocalSection> {
  const items: (T | LocalSection)[] = [...local]
  const remap: Record<string, string> = {}
  const remoteIds = new Set(remote.map((s) => s.id))
  const key = (name: string) => name.trim().toLocaleLowerCase()

  for (const row of [...remote].sort((a, b) => a.position - b.position)) {
    const index = items.findIndex((s) => s.id === row.id)
    if (index >= 0) items.splice(index, 1)
    if (row.deleted) continue

    if (index < 0 && options.dedupe) {
      const dup = items.findIndex((s) => !remoteIds.has(s.id) && key(s.name) === key(row.name))
      if (dup >= 0) {
        remap[items[dup]!.id] = row.id
        items.splice(dup, 1)
      }
    }

    const { id, name, color, addedAt } = row
    items.splice(Math.min(Math.max(row.position, 0), items.length), 0, { id, name, color, addedAt })
  }

  return { items, remap }
}

/**
 * Applies pulled session rows to the local log. Sessions are an immutable log
 * sorted by `addedAt` on read, so order here doesn't matter.
 */
export function mergeSessions<T extends LocalSession>(
  local: T[],
  remote: RemoteSession[],
  options: MergeOptions = {},
): MergeResult<T | LocalSession> {
  let items: (T | LocalSession)[] = [...local]
  const remap: Record<string, string> = {}
  const remoteIds = new Set(remote.map((s) => s.id))

  for (const row of remote) {
    const exists = items.some((s) => s.id === row.id)
    items = items.filter((s) => s.id !== row.id)
    if (row.deleted) continue

    if (!exists && options.dedupe) {
      const dup = items.find((s) => !remoteIds.has(s.id) && s.rawText === row.rawText)
      if (dup) {
        remap[dup.id] = row.id
        items = items.filter((s) => s !== dup)
      }
    }

    const { id, rawText, addedAt, routineId, roomId } = row
    items.push({ id, rawText, addedAt, routineId, roomId })
  }

  return { items, remap }
}
