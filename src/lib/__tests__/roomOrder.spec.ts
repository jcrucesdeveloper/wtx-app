import { describe, expect, it } from 'vitest'
import {
  applyOrder,
  hostOrder,
  identityOrder,
  mergeRoomRow,
  missingAdded,
  needsReorder,
  normalizeAdded,
  normalizeFocus,
  normalizeOrder,
  normalizeRemoved,
  normalizeSwaps,
  orderedRoutine,
  pendingSwaps,
  roomSlots,
  sameEdits,
  sameOrder,
  splitRemoved,
  swapsRecord,
  type RoomOrderFields,
} from '@/lib/roomOrder'

const ex = (name: string, slot?: number) => ({ name, ...(slot === undefined ? {} : { slot }) })
const names = (list: { name: string }[]) => list.map((e) => e.name)

describe('normalizeOrder', () => {
  it('is the routine order when there is none', () => {
    expect(normalizeOrder(null, 3)).toEqual([0, 1, 2])
    expect(normalizeOrder(undefined, 0)).toEqual([])
    expect(identityOrder(2)).toEqual([0, 1])
  })

  it('keeps a valid permutation as is', () => {
    expect(normalizeOrder([2, 0, 1], 3)).toEqual([2, 0, 1])
  })

  it('drops junk, repeats and out-of-range slots, and appends the missing ones', () => {
    expect(normalizeOrder([2, 2, 'x', -1, 9, 1.5], 4)).toEqual([2, 0, 1, 3])
  })

  it('cuts an order that is longer than the routine', () => {
    expect(normalizeOrder([3, 2, 1, 0], 2)).toEqual([1, 0])
  })
})

describe('orderedRoutine', () => {
  it('puts the routine in the room order', () => {
    expect(orderedRoutine(['a', 'b', 'c'], [2, 0, 1])).toEqual(['c', 'a', 'b'])
    expect(orderedRoutine(['a', 'b'], null)).toEqual(['a', 'b'])
  })
})

describe('hostOrder', () => {
  it("is the host's session order", () => {
    expect(hostOrder(null, [2, 0, 1], 3)).toEqual([2, 0, 1])
  })

  it('ignores exercises the host added', () => {
    expect(hostOrder(null, [1, undefined, 0, 2], 3)).toEqual([1, 0, 2])
  })

  it('keeps a slot the host removed right after the one that came before it', () => {
    // Host took out slot 1 (between 0 and 2), then moved 3 to the front.
    expect(hostOrder([0, 1, 2, 3], [3, 0, 2], 4)).toEqual([3, 0, 1, 2])
  })

  it('keeps removed slots that led the order first, in their order', () => {
    expect(hostOrder([0, 1, 2, 3], [3, 2], 4)).toEqual([0, 1, 3, 2])
  })

  it('reads the previous order safely', () => {
    expect(hostOrder('garbage', [1], 3)).toEqual([0, 1, 2])
  })
})

describe('applyOrder', () => {
  it('reorders routine exercises by slot', () => {
    const list = [ex('a', 0), ex('b', 1), ex('c', 2)]
    expect(names(applyOrder(list, [2, 0, 1]))).toEqual(['c', 'a', 'b'])
  })

  it('returns the same objects, so what points at one still does', () => {
    const list = [ex('a', 0), ex('b', 1)]
    const next = applyOrder(list, [1, 0])
    expect(next[0]).toBe(list[1])
    expect(next[1]).toBe(list[0])
  })

  it("keeps a member's own exercises next to the one they followed", () => {
    const list = [ex('mine-first'), ex('a', 0), ex('mine-after-a'), ex('b', 1), ex('c', 2)]
    expect(names(applyOrder(list, [2, 1, 0]))).toEqual(['mine-first', 'c', 'b', 'a', 'mine-after-a'])
  })

  it('works around slots the member removed', () => {
    const list = [ex('a', 0), ex('c', 2)]
    expect(names(applyOrder(list, [2, 1, 0]))).toEqual(['c', 'a'])
  })

  it('keeps a swapped exercise in its slot', () => {
    const list = [ex('Bench', 0), ex('Leg press (swapped from Squat)', 1)]
    expect(names(applyOrder(list, [1, 0]))).toEqual(['Leg press (swapped from Squat)', 'Bench'])
  })

  it('leaves a session without slots alone', () => {
    const list = [ex('a'), ex('b')]
    expect(applyOrder(list, [1, 0])).toEqual(list)
    expect(needsReorder(list, [1, 0])).toBe(false)
  })

  it('is idempotent', () => {
    const list = [ex('a', 0), ex('b', 1), ex('c', 2)]
    const once = applyOrder(list, [1, 2, 0])
    expect(needsReorder(once, [1, 2, 0])).toBe(false)
    expect(applyOrder(once, [1, 2, 0])).toEqual(once)
  })
})

describe('sameOrder', () => {
  it('compares slot by slot', () => {
    expect(sameOrder([1, 0], [1, 0])).toBe(true)
    expect(sameOrder([1, 0], [0, 1])).toBe(false)
    expect(sameOrder([1], [1, 0])).toBe(false)
  })
})

describe('mergeRoomRow', () => {
  const row = (version: number | undefined, order: number[] | null, status = 'active') => ({
    status,
    exercise_order: order,
    order_version: version,
  })

  it('takes the first row as is', () => {
    expect(mergeRoomRow(null, row(3, [1, 0]))).toEqual(row(3, [1, 0]))
  })

  it('takes a newer or equal order', () => {
    expect(mergeRoomRow(row(1, [0, 1]), row(2, [1, 0]))).toEqual(row(2, [1, 0]))
    expect(mergeRoomRow(row(2, [1, 0]), row(2, [1, 0], 'finished'))).toEqual(row(2, [1, 0], 'finished'))
  })

  it('ignores a stale order but keeps the rest of the row', () => {
    expect(mergeRoomRow(row(3, [2, 1, 0]), row(2, [1, 0, 2], 'finished'))).toEqual(row(3, [2, 1, 0], 'finished'))
  })

  it('treats a server without the order columns as version 0', () => {
    expect(mergeRoomRow(row(undefined, null), row(undefined, null, 'finished'))).toEqual(row(undefined, null, 'finished'))
  })
})

describe('removed slots', () => {
  it('normalizes what the server holds', () => {
    expect(normalizeRemoved(null, 3)).toEqual([])
    expect(normalizeRemoved([2, 2, 'x', -1, 9, 0], 3)).toEqual([0, 2])
  })

  it('leaves removed slots out of the routine, in the room order', () => {
    expect(orderedRoutine(['a', 'b', 'c'], [2, 0, 1], [0])).toEqual(['c', 'b'])
    expect(orderedRoutine(['a', 'b', 'c'], null, undefined)).toEqual(['a', 'b', 'c'])
  })

  it('drops untouched exercises in removed slots and keeps the ones with sets logged', () => {
    const done = { name: 'a', slot: 0, loggedSets: [{ completed: true }, { completed: false }] }
    const fresh = { name: 'b', slot: 1, loggedSets: [{ completed: false }] }
    const stays = { name: 'c', slot: 2, loggedSets: [] }
    const own = { name: 'd', loggedSets: [] }
    expect(splitRemoved([done, fresh, stays, own], [0, 1])).toEqual({ drop: [fresh], keep: [done] })
  })
})

describe('mergeRoomRow with removed slots', () => {
  it('keeps the removed slots held here when the incoming row is stale', () => {
    const held = { status: 'active', exercise_order: [1, 0], removed_slots: [1], order_version: 4 }
    const stale = { status: 'active', exercise_order: [0, 1], removed_slots: [], order_version: 3 }
    expect(mergeRoomRow(held, stale).removed_slots).toEqual([1])
    expect(mergeRoomRow(stale, held).removed_slots).toEqual([1])
  })
})

describe("the host's additions, swaps and focus", () => {
  it('keeps added exercises up to the first junk entry, so every slot keeps its meaning', () => {
    expect(normalizeAdded(null)).toEqual([])
    expect(normalizeAdded([' Push-up ', 'Curl'])).toEqual(['Push-up', 'Curl'])
    expect(normalizeAdded(['Push-up', '', 'Curl'])).toEqual(['Push-up'])
    expect(normalizeAdded(['a'.repeat(201)])).toEqual([])
  })

  it('keeps swaps for slots that exist, by their name', () => {
    expect(normalizeSwaps(null, 3)).toEqual(new Map())
    expect(normalizeSwaps(['x'], 3)).toEqual(new Map())
    expect(normalizeSwaps({ '1': 'Arnold Press', '5': 'Far', '01': 'Odd', x: 'Junk', '2': '' }, 3)).toEqual(
      new Map([[1, 'Arnold Press']]),
    )
  })

  it('keeps a focus slot only when it is one', () => {
    expect(normalizeFocus(2, 3)).toBe(2)
    expect(normalizeFocus(3, 3)).toBeNull()
    expect(normalizeFocus(null, 3)).toBeNull()
    expect(normalizeFocus('1', 3)).toBeNull()
  })

  it('lays out the routine slot by slot: as written, then added, under swapped names', () => {
    const routine = [
      { name: 'Bench', kind: 'reps' as const, sets: 4 },
      { name: 'Row', kind: 'reps' as const, sets: 3 },
    ]
    expect(roomSlots(routine, ['Push-up'], { '0': 'DB Bench', '2': 'Diamond Push-up' })).toEqual([
      { name: 'DB Bench', kind: 'reps', sets: 4 },
      { name: 'Row', kind: 'reps', sets: 3 },
      { name: 'Diamond Push-up', kind: 'reps', sets: 3 },
    ])
  })

  it('finds the added slots a session lacks, except the ones removed since', () => {
    expect(missingAdded(3, ['a', 'b', 'c'], [0, 1, 2, 3, undefined], [5])).toEqual([4])
    expect(missingAdded(3, [], [0, 1, 2], [])).toEqual([])
  })

  it('lists the swaps not followed yet, with the exercise in each slot', () => {
    const a = ex('Bench', 0)
    const b = ex('Row', 1)
    const swaps = new Map([
      [0, 'DB Bench'],
      [1, 'Cable Row'],
      [2, 'Dips'],
    ])
    expect(pendingSwaps([a, b], swaps, { '1': 'Cable Row' })).toEqual([
      { slot: 0, name: 'DB Bench', exercise: a },
      { slot: 2, name: 'Dips' },
    ])
  })

  it('compares two plans by their additions, swaps and focus', () => {
    const plan = { added: ['a'], swaps: new Map([[0, 'x']]), focus: 1 }
    expect(sameEdits(plan, { added: ['a'], swaps: new Map([[0, 'x']]), focus: 1 })).toBe(true)
    expect(sameEdits(plan, { ...plan, focus: 2 })).toBe(false)
    expect(sameEdits(plan, { ...plan, added: ['b'] })).toBe(false)
    expect(sameEdits(plan, { ...plan, swaps: new Map([[0, 'y']]) })).toBe(false)
  })

  it('stores swaps as a record keyed by slot', () => {
    expect(swapsRecord(new Map([[2, 'b'], [0, 'a']]))).toEqual({ '0': 'a', '2': 'b' })
  })

  it('keeps the held additions, swaps and focus when the incoming row is stale', () => {
    const held: RoomOrderFields = { added_exercises: ['a'], swapped_slots: { '0': 'x' }, focus_slot: 2, order_version: 4 }
    const stale: RoomOrderFields = { added_exercises: [], swapped_slots: {}, focus_slot: 0, order_version: 3 }
    expect(mergeRoomRow(held, stale)).toMatchObject({ added_exercises: ['a'], swapped_slots: { '0': 'x' }, focus_slot: 2 })
  })
})
