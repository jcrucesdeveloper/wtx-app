import { describe, expect, it } from 'vitest'
import {
  applyOrder,
  hostOrder,
  identityOrder,
  mergeRoomRow,
  needsReorder,
  normalizeOrder,
  normalizeRemoved,
  orderedRoutine,
  sameOrder,
  splitRemoved,
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
