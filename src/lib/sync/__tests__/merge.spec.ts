import { describe, it, expect } from 'vitest'
import { mergeRoutines, mergeSessions } from '../merge'
import type { RemoteRoutine, RemoteSession } from '../rows'

const routine = (id: string, rawText = `# ${id}`) => ({ id, filename: `${id}.wtt`, rawText, addedAt: 1 })
const remoteRoutine = (id: string, position: number, extra: Partial<RemoteRoutine> = {}): RemoteRoutine => ({
  ...routine(id),
  position,
  deleted: false,
  ...extra,
})
const session = (id: string, rawText = `# ${id}`) => ({ id, rawText, addedAt: 1 })
const remoteSession = (id: string, extra: Partial<RemoteSession> = {}): RemoteSession => ({
  ...session(id),
  deleted: false,
  ...extra,
})

describe('mergeRoutines', () => {
  it('inserts new rows at their remote position', () => {
    const { items } = mergeRoutines([routine('a'), routine('b')], [remoteRoutine('c', 1)])
    expect(items.map((r) => r.id)).toEqual(['a', 'c', 'b'])
  })

  it('replaces an existing routine in place of its new position', () => {
    const { items } = mergeRoutines(
      [routine('a'), routine('b')],
      [remoteRoutine('a', 1, { rawText: '# edited' })],
    )
    expect(items.map((r) => r.id)).toEqual(['b', 'a'])
    expect(items[1]!.rawText).toBe('# edited')
  })

  it('removes tombstoned routines', () => {
    const { items } = mergeRoutines([routine('a'), routine('b')], [remoteRoutine('a', 0, { deleted: true })])
    expect(items.map((r) => r.id)).toEqual(['b'])
  })

  it('clamps positions past the end', () => {
    const { items } = mergeRoutines([routine('a')], [remoteRoutine('z', 99)])
    expect(items.map((r) => r.id)).toEqual(['a', 'z'])
  })

  it('keeps identical text twice unless deduping', () => {
    const local = [routine('local', '# Push')]
    const remote = [remoteRoutine('remote', 0, { rawText: '# Push' })]
    expect(mergeRoutines(local, remote).items).toHaveLength(2)

    const deduped = mergeRoutines(local, remote, { dedupe: true })
    expect(deduped.items.map((r) => r.id)).toEqual(['remote'])
    expect(deduped.remap).toEqual({ local: 'remote' })
  })

  it('does not mutate the local array', () => {
    const local = [routine('a')]
    mergeRoutines(local, [remoteRoutine('a', 0, { deleted: true })])
    expect(local).toHaveLength(1)
  })
})

describe('mergeSessions', () => {
  it('adds, replaces and removes sessions', () => {
    const { items } = mergeSessions(
      [session('a'), session('b')],
      [remoteSession('a', { deleted: true }), remoteSession('c', { roomId: 'room' })],
    )
    expect(items.map((s) => s.id).sort()).toEqual(['b', 'c'])
    expect(items.find((s) => s.id === 'c')).toMatchObject({ roomId: 'room' })
  })

  it('folds a duplicate local session into the remote one when deduping', () => {
    const { items, remap } = mergeSessions([session('local', 'same')], [remoteSession('remote', { rawText: 'same' })], {
      dedupe: true,
    })
    expect(items.map((s) => s.id)).toEqual(['remote'])
    expect(remap).toEqual({ local: 'remote' })
  })
})
