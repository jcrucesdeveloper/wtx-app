/**
 * Who leads a group workout once its host is gone. The server decides (see
 * `pass_room_host` / `claim_room_host` in supabase/migrations); these mirror
 * its rule so the app can say who's next and pick one member to claim.
 *
 * The rule: whoever joined earliest of the members still working out — not
 * left, not finished. Explainable ("they've been here longest"), stable, and
 * never a ranking of who lifts most.
 */

/**
 * How long the host can be silent before a member takes over — the server
 * enforces the same 5 minutes. Longer than a heavy set's rest, so a host
 * resting with the screen off keeps the role.
 */
export const HOST_GRACE_MS = 5 * 60_000
/** Each member after the first in line waits this much longer, so one claim is usually all it takes. */
export const CLAIM_STAGGER_MS = 20_000
/** How often the host's open app tells the server it's still there. */
export const HOST_BEAT_MS = 30_000

export interface HostCandidate {
  userId: string
  joinedAt: string
  finishedAt: string | null
  leftAt?: string | null
}

/** Still working out: hasn't left and hasn't finished. */
export const isWorkingOut = (m: HostCandidate) => !m.leftAt && !m.finishedAt

function byJoin(a: HostCandidate, b: HostCandidate): number {
  const diff = Date.parse(a.joinedAt) - Date.parse(b.joinedAt)
  if (diff) return diff
  return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0
}

/** Who becomes host if `hostId` goes now; `null` when nobody is left (the room would end). */
export function nextHost<T extends HostCandidate>(members: readonly T[], hostId: string | null): T | null {
  return [...members].filter((m) => m.userId !== hostId && isWorkingOut(m)).sort(byJoin)[0] ?? null
}

/**
 * How long, after this device saw the host go missing, it should wait before
 * claiming the host role — `null` when it shouldn't (it's the host, or not
 * working out). Only members who are online are in line: someone whose app is
 * closed can't lead either.
 */
export function claimDelayMs(
  members: readonly HostCandidate[],
  hostId: string | null,
  onlineIds: readonly string[],
  myId: string | null,
): number | null {
  if (!myId || myId === hostId) return null
  const line = members
    .filter((m) => m.userId !== hostId && isWorkingOut(m) && (m.userId === myId || onlineIds.includes(m.userId)))
    .sort(byJoin)
  const rank = line.findIndex((m) => m.userId === myId)
  return rank < 0 ? null : HOST_GRACE_MS + rank * CLAIM_STAGGER_MS
}

/** When a member's own workout began: the room's start, or when they joined if they came later. */
export function memberStart(roomStartedAt: string | null, joinedAt: string | null | undefined): string | null {
  if (!roomStartedAt || !joinedAt) return roomStartedAt
  return Date.parse(joinedAt) > Date.parse(roomStartedAt) ? joinedAt : roomStartedAt
}
