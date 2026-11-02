import type { NextActionView } from '@/lib/sessionNextAction'

/**
 * The contract between the phone (this app and its native host) and the Wear OS
 * app, version 1. The same shapes live in Java (`WearProtocol`, android/app) and
 * Kotlin (`WearProtocol`, android/wear); all three are checked against
 * `android/protocol/wear-v1.json`. Documented in the README ("Wear OS").
 *
 * Only the pieces JavaScript touches are code here. The wire messages between the
 * devices are built and read natively, so they are types: JS never sees them.
 */

export const WEAR_PROTOCOL_VERSION = 1

/** Data Layer paths. The state is a DataItem; the rest are MessageClient messages. */
export const WEAR_PATHS = {
  /** DataItem the phone publishes; also the path of the phone's reply to a request. */
  state: '/wtx/v1/session/state',
  /** Watch → phone: "send me the state now". */
  request: '/wtx/v1/session/request',
  /** Watch → phone: move the running rest by `deltaSeconds`. */
  adjust: '/wtx/v1/timer/adjust',
  /** Phone → watch: whether a command was applied, and the state after it. */
  result: '/wtx/v1/command/result',
} as const

/** The capability the phone app declares, so the watch can find a compatible host. */
export const WEAR_HOST_CAPABILITY = 'wtx_host_v1'

export type WearHostStatus = 'idle' | 'active' | 'resting' | 'ended' | 'not_ready'
export type WearEndedReason = 'finished' | 'discarded'

/** Why the host did not apply a command. `duplicate` is not a rejection: see `WearCommandResult`. */
export type WearRejectReason =
  | 'invalid_payload'
  | 'unsupported_version'
  | 'not_ready'
  | 'no_session'
  | 'session_mismatch'
  | 'rest_mismatch'
  | 'rest_ended'

/** What the phone publishes. Times are milliseconds; `remainingMs` is as of the moment it was built. */
export interface WearHostState {
  v: typeof WEAR_PROTOCOL_VERSION
  /** Changes if the phone app's data is wiped, which restarts `revision`. */
  hostId: string
  /** Grows with every state the host publishes; the watch ignores a lower one. */
  revision: number
  /** Set on a reply, to the request's `requestId`. */
  inReplyTo?: string
  status: WearHostStatus
  sessionId: string | null
  endedReason?: WearEndedReason
  rest: { restId: string; remainingMs: number; durationMs: number } | null
  stepSeconds: number
  vibrate: boolean
  sessionName: string
  next: NextActionView | null
}

export interface WearAdjustCommand {
  v: typeof WEAR_PROTOCOL_VERSION
  commandId: string
  sessionId: string
  restId: string
  deltaSeconds: number
}

export interface WearCommandResult {
  v: typeof WEAR_PROTOCOL_VERSION
  commandId: string
  accepted: boolean
  reason: WearRejectReason | null
  /** True when this `commandId` had been decided before: the answer is the earlier one. */
  duplicate: boolean
  state: WearHostState
}

/**
 * What the watch shows on its own, built from the session by `buildWearProjection`
 * and sent down with the notification. The host adds the rest's timing and
 * identity to make a `WearHostState`.
 */
export interface WearProjection {
  sessionName: string
  /** The next set or exercise while a rest runs. */
  afterRest: NextActionView
  /** The current exercise and its next set, outside rest. */
  working: NextActionView
  stepSeconds: number
  vibrate: boolean
}

/**
 * The rest as the host has confirmed it, sent to JS after the host applied a
 * change (a notification action, a watch command, a phone control). JS adopts
 * these absolute values instead of re-applying a delta. `restEndsAt` is `null`
 * when that rest is over (skipped, or cut back to zero).
 */
export interface ConfirmedRest {
  sessionId: string
  restId: string
  restRev: number
  /** Epoch milliseconds on this phone's clock. */
  restEndsAt: number | null
  restDurationSeconds: number | null
}

/** Reads a native event or result into a `ConfirmedRest`; `null` when it is malformed. */
export function parseConfirmedRest(raw: unknown): ConfirmedRest | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.sessionId !== 'string' || r.sessionId === '') return null
  if (typeof r.restId !== 'string' || r.restId === '') return null
  if (!Number.isSafeInteger(r.restRev) || (r.restRev as number) < 0) return null
  const endsAt = r.restEndsAt ?? null
  if (endsAt !== null && (typeof endsAt !== 'number' || !Number.isFinite(endsAt) || endsAt <= 0))
    return null
  const duration = r.restDurationSeconds ?? null
  if (duration !== null && (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0))
    return null
  return {
    sessionId: r.sessionId,
    restId: r.restId,
    restRev: r.restRev as number,
    restEndsAt: endsAt,
    restDurationSeconds: duration,
  }
}
