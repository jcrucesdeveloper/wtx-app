import { describe, it, expect } from 'vitest'
import { CLAIM_STAGGER_MS, HOST_GRACE_MS, claimDelayMs, memberStart, nextHost, type HostCandidate } from '../roomHost'

const at = (minute: number) => new Date(Date.UTC(2026, 10, 1, 18, minute)).toISOString()
const member = (userId: string, joinedMinute: number, patch: Partial<HostCandidate> = {}): HostCandidate => ({
  userId,
  joinedAt: at(joinedMinute),
  finishedAt: null,
  leftAt: null,
  ...patch,
})

describe('nextHost', () => {
  it('picks whoever joined earliest, after the host', () => {
    const members = [member('host', 0), member('ana', 2), member('ben', 1)]
    expect(nextHost(members, 'host')?.userId).toBe('ben')
  })

  it("skips anyone who left or finished, and is nobody when nobody's still working out", () => {
    const members = [
      member('host', 0),
      member('ben', 1, { finishedAt: at(30) }),
      member('cleo', 2, { leftAt: at(20) }),
      member('ana', 3),
    ]
    expect(nextHost(members, 'host')?.userId).toBe('ana')
    expect(nextHost(members.slice(0, 3), 'host')).toBeNull()
  })

  it('breaks a tie on join time the same way every device does', () => {
    const members = [member('host', 0), member('zoe', 1), member('ana', 1)]
    expect(nextHost(members, 'host')?.userId).toBe('ana')
    expect(nextHost([...members].reverse(), 'host')?.userId).toBe('ana')
  })
})

describe('claimDelayMs', () => {
  const members = [member('host', 0), member('ana', 1), member('ben', 2), member('cleo', 3)]

  it('puts the online members still working out in join order, a stagger apart', () => {
    const online = ['ana', 'ben', 'cleo']
    expect(claimDelayMs(members, 'host', online, 'ana')).toBe(HOST_GRACE_MS)
    expect(claimDelayMs(members, 'host', online, 'ben')).toBe(HOST_GRACE_MS + CLAIM_STAGGER_MS)
    // Ana's app is closed: Ben is first in line.
    expect(claimDelayMs(members, 'host', ['ben', 'cleo'], 'ben')).toBe(HOST_GRACE_MS)
  })

  it("never asks the host, nor someone who's done", () => {
    expect(claimDelayMs(members, 'host', [], 'host')).toBeNull()
    const finished = members.map((m) => (m.userId === 'ana' ? { ...m, finishedAt: at(40) } : m))
    expect(claimDelayMs(finished, 'host', ['ana'], 'ana')).toBeNull()
    expect(claimDelayMs(members, 'host', [], null)).toBeNull()
  })
})

describe('memberStart', () => {
  it("is the room's start, or when they joined if that was later", () => {
    expect(memberStart(at(5), at(0))).toBe(at(5))
    expect(memberStart(at(5), at(12))).toBe(at(12))
    expect(memberStart(at(5), undefined)).toBe(at(5))
    expect(memberStart(null, at(12))).toBeNull()
  })
})
