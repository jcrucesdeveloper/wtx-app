/**
 * The order a group workout follows. The host owns it: a permutation of the
 * room routine's exercise *slots* (their positions in `routine_wtt`), stored
 * on the room with a version that only goes up. Everyone else applies it to
 * their own session; nobody else can change it.
 *
 * Slots, not names: a routine can hold the same exercise twice, and a slot
 * keeps its place when someone swaps the movement in it for another one.
 * Exercises a member added mid-workout have no slot — they are theirs alone
 * and stay where they put them, next to the exercise they followed.
 */

/** Anything that may sit in a routine slot — a session exercise, mostly. */
export interface Slotted {
  /** Position of this exercise in the room's routine; unset for exercises added mid-workout. */
  slot?: number
}

const isSlot = (value: unknown, count: number): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < count

/** `[0, 1, …, count - 1]` — the routine as written. */
export function identityOrder(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i)
}

/**
 * A stored order made safe to use for a routine of `count` exercises: every
 * slot exactly once. It comes from the server (and before that, a client),
 * so anything unknown, repeated or out of range is dropped, and any slot it
 * doesn't mention keeps its routine position at the end.
 */
export function normalizeOrder(order: unknown, count: number): number[] {
  if (!Array.isArray(order)) return identityOrder(count)
  const seen = new Set<number>()
  const result: number[] = []
  for (const slot of order) {
    if (!isSlot(slot, count) || seen.has(slot)) continue
    seen.add(slot)
    result.push(slot)
  }
  for (let slot = 0; slot < count; slot++) if (!seen.has(slot)) result.push(slot)
  return result
}

export function sameOrder(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((slot, i) => slot === b[i])
}

/** The routine's exercises in the room's order. */
export function orderedRoutine<T>(routine: readonly T[], order: unknown): T[] {
  return normalizeOrder(order, routine.length).map((slot) => routine[slot]!)
}

/**
 * The room order after the host reorders their own session. Their session is
 * the source, but it may no longer hold every slot (they took an exercise
 * out): those slots stay in the room order, right after the slot that came
 * before them last time, so everyone who still has them keeps them in place.
 *
 * @param previous The room order before this reorder.
 * @param hostSlots The host's session, in its new order (`undefined` for exercises they added).
 */
export function hostOrder(previous: unknown, hostSlots: readonly (number | undefined)[], count: number): number[] {
  const before = normalizeOrder(previous, count)
  const result: number[] = []
  const placed = new Set<number>()
  for (const slot of hostSlots) {
    if (!isSlot(slot, count) || placed.has(slot)) continue
    placed.add(slot)
    result.push(slot)
  }
  for (const [i, slot] of before.entries()) {
    if (placed.has(slot)) continue
    // Behind the nearest slot that came before it and is already placed; first if there is none.
    let at = 0
    for (let j = i - 1; j >= 0; j--) {
      const anchor = result.indexOf(before[j]!)
      if (anchor >= 0) {
        at = anchor + 1
        break
      }
    }
    result.splice(at, 0, slot)
    placed.add(slot)
  }
  return result
}

/**
 * A member's session put in the room's order. The routine exercises move;
 * each exercise of their own travels with the routine exercise it followed
 * (any before the first routine exercise stay first). The same objects come
 * back, so whatever points at one — the exercise on screen, the rest timer —
 * still does.
 */
export function applyOrder<T extends Slotted>(exercises: readonly T[], order: readonly number[]): T[] {
  const rank = new Map(order.map((slot, i) => [slot, i]))
  const head: T[] = []
  const groups: { rank: number; at: number; items: T[] }[] = []
  for (const exercise of exercises) {
    const slotRank = exercise.slot === undefined ? undefined : rank.get(exercise.slot)
    if (slotRank === undefined) {
      // Their own exercise (or a slot the order doesn't know): it rides with the one before it.
      const last = groups[groups.length - 1]
      if (last) last.items.push(exercise)
      else head.push(exercise)
    } else {
      groups.push({ rank: slotRank, at: groups.length, items: [exercise] })
    }
  }
  groups.sort((a, b) => a.rank - b.rank || a.at - b.at)
  return [...head, ...groups.flatMap((g) => g.items)]
}

/** Whether applying `order` would change this session at all. */
export function needsReorder<T extends Slotted>(exercises: readonly T[], order: readonly number[]): boolean {
  const next = applyOrder(exercises, order)
  return next.some((exercise, i) => exercise !== exercises[i])
}

/** The fields of a room row that carry its order. */
export interface RoomOrderFields {
  exercise_order?: number[] | null
  order_version?: number | null
}

/**
 * A room row that just arrived (Realtime, or a refetch after reconnecting)
 * merged into the one held here: everything from the new row, except an
 * order older than the one already held — events can land out of order, and
 * the host's own screen is ahead of the server until its write echoes back.
 */
export function mergeRoomRow<T extends RoomOrderFields>(current: T | null, incoming: T): T {
  if (!current) return incoming
  const have = current.order_version ?? 0
  const got = incoming.order_version ?? 0
  if (got >= have) return incoming
  return { ...incoming, exercise_order: current.exercise_order, order_version: current.order_version }
}
