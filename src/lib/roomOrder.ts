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
 *
 * The host can also take a slot out of the routine for everyone: removed
 * slots ride on the room next to the order, under the same version. So do
 * the exercises the host added (new slots after the written routine's), the
 * movements the host swapped into a slot, and the slot the host is on.
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

/**
 * The slots the host took out of the routine, made safe to use: in range,
 * each once, ascending. Like the order, it comes from the server.
 */
export function normalizeRemoved(removed: unknown, count: number): number[] {
  if (!Array.isArray(removed)) return []
  return [...new Set(removed.filter((slot): slot is number => isSlot(slot, count)))].sort((a, b) => a - b)
}

/** The routine's exercises in the room's order, without the ones the host removed. */
export function orderedRoutine<T>(routine: readonly T[], order: unknown, removed?: unknown): T[] {
  const gone = new Set(normalizeRemoved(removed, routine.length))
  return normalizeOrder(order, routine.length)
    .filter((slot) => !gone.has(slot))
    .map((slot) => routine[slot]!)
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
  removed_slots?: number[] | null
  added_exercises?: string[] | null
  swapped_slots?: Record<string, string> | null
  focus_slot?: number | null
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
  return {
    ...incoming,
    exercise_order: current.exercise_order,
    removed_slots: current.removed_slots,
    added_exercises: current.added_exercises,
    swapped_slots: current.swapped_slots,
    focus_slot: current.focus_slot,
    order_version: current.order_version,
  }
}

/** An exercise as far as the host's removals care: its slot and whether anything was logged on it. */
export interface RemovableExercise extends Slotted {
  loggedSets: readonly { completed: boolean }[]
}

/**
 * What the host's removals do to a member's session. An exercise in a
 * removed slot with nothing logged is dropped; one with sets logged keeps
 * them — they were lifted, and belong in that member's history — and leaves
 * the shared routine, staying as their own exercise.
 */
export function splitRemoved<T extends RemovableExercise>(
  exercises: readonly T[],
  removed: readonly number[],
): { drop: T[]; keep: T[] } {
  const gone = new Set(removed)
  const drop: T[] = []
  const keep: T[] = []
  for (const exercise of exercises) {
    if (exercise.slot === undefined || !gone.has(exercise.slot)) continue
    if (exercise.loggedSets.some((s) => s.completed)) keep.push(exercise)
    else drop.push(exercise)
  }
  return { drop, keep }
}

// --- The host's edits to the routine: additions, swaps, focus --------------

/** Most exercises a host can add to a group workout (`rooms_added_exercises_length`). */
export const ADDED_EXERCISES_MAX = 100
/** Longest exercise name the room keeps (`room_set_logs_exercise_name_length`). */
const NAME_MAX = 200

const isName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= NAME_MAX

/**
 * The exercises the host added to the routine, made safe to use. Each takes
 * the next slot after the written routine's — the first one added is slot
 * `routine.length` — so a slot never changes meaning once handed out.
 */
export function normalizeAdded(added: unknown): string[] {
  if (!Array.isArray(added)) return []
  // Junk can't just be dropped: every later addition's slot depends on its place.
  const result: string[] = []
  for (const name of added.slice(0, ADDED_EXERCISES_MAX)) {
    if (!isName(name)) break
    result.push(name.trim())
  }
  return result
}

/** The movements the host swapped into routine slots, made safe to use: slot → exercise name. */
export function normalizeSwaps(swaps: unknown, count: number): Map<number, string> {
  const result = new Map<number, string>()
  if (!swaps || typeof swaps !== 'object' || Array.isArray(swaps)) return result
  for (const [key, name] of Object.entries(swaps as Record<string, unknown>)) {
    const slot = Number(key)
    if (isSlot(slot, count) && String(slot) === key && isName(name)) result.set(slot, name.trim())
  }
  return result
}

/** The slot the host is on, if it is one. */
export function normalizeFocus(focus: unknown, count: number): number | null {
  return isSlot(focus, count) ? focus : null
}

/** A routine exercise as the room plans it. */
export interface PlannedSlot {
  name: string
  kind: 'reps' | 'time'
  sets: number
  specificSets?: { label: string }[]
}

/**
 * The room's routine slot by slot, as the host has it now: the routine as
 * written, then the exercises the host added (3 sets, like any exercise
 * added mid-workout), each under the name of the movement the host swapped
 * into it, if they did. Swapped slots keep their shape, as a swap does.
 */
export function roomSlots<T extends PlannedSlot>(
  routine: readonly T[],
  added: unknown,
  swaps: unknown,
): PlannedSlot[] {
  const slots: PlannedSlot[] = [
    ...routine,
    ...normalizeAdded(added).map((name) => ({ name, kind: 'reps' as const, sets: 3 })),
  ]
  const swapped = normalizeSwaps(swaps, slots.length)
  return slots.map((slot, i) => {
    const name = swapped.get(i)
    return name === undefined ? slot : { ...slot, name }
  })
}

/**
 * The slots the host added that a member's session doesn't hold yet — and
 * that the host hasn't taken out again since.
 *
 * @param sessionSlots Every slot the member's session holds.
 */
export function missingAdded(
  routineCount: number,
  added: readonly string[],
  sessionSlots: readonly (number | undefined)[],
  removed: readonly number[],
): number[] {
  const have = new Set(sessionSlots)
  const gone = new Set(removed)
  const result: number[] = []
  for (let slot = routineCount; slot < routineCount + added.length; slot++) {
    if (!have.has(slot) && !gone.has(slot)) result.push(slot)
  }
  return result
}

/** A host's swap a member's session hasn't followed yet. */
export interface PendingSwap<T> {
  slot: number
  name: string
  /** The member's exercise in that slot; unset when they no longer hold it. */
  exercise?: T
}

/**
 * The host's swaps a member hasn't followed yet. Each swap is followed once:
 * a member who later swaps that slot for something else themselves (their
 * machine is taken too) keeps their own pick until the host swaps it again.
 *
 * @param followed The swap last followed per slot.
 */
export function pendingSwaps<T extends Slotted & { name: string }>(
  exercises: readonly T[],
  swaps: ReadonlyMap<number, string>,
  followed: Readonly<Record<string, string>> | undefined,
): PendingSwap<T>[] {
  const result: PendingSwap<T>[] = []
  for (const [slot, name] of swaps) {
    if (followed?.[slot] === name) continue
    const exercise = exercises.find((e) => e.slot === slot)
    result.push(exercise ? { slot, name, exercise } : { slot, name })
  }
  return result
}

/** Whether two room plans' additions, swaps and focus are the same. */
export function sameEdits(
  a: { added: readonly string[]; swaps: ReadonlyMap<number, string>; focus: number | null },
  b: { added: readonly string[]; swaps: ReadonlyMap<number, string>; focus: number | null },
): boolean {
  if (a.focus !== b.focus || a.added.length !== b.added.length || a.swaps.size !== b.swaps.size) return false
  if (a.added.some((name, i) => name !== b.added[i])) return false
  return [...a.swaps].every(([slot, name]) => b.swaps.get(slot) === name)
}

/** Swaps as the room stores them: `{ "slot": "name" }`. */
export function swapsRecord(swaps: ReadonlyMap<number, string>): Record<string, string> {
  return Object.fromEntries([...swaps].sort(([a], [b]) => a - b).map(([slot, name]) => [String(slot), name]))
}
