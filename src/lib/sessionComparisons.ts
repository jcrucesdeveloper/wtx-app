import type { WorkoutSession } from '@/lib/wtx'

/** How a session's totals moved versus the previous logged session of the same routine. */
export interface SessionComparison {
  volumeDelta: number
  workingSetsDelta: number
  isVolumeUp: boolean
}

/**
 * Compares a session's totals against the previous one for the same routine.
 *
 * Returns `undefined` when there's nothing to compare against (first time
 * logging this routine, or both sessions have zero volume) — callers should
 * show a "first session" framing instead of a delta in that case.
 */
export function compareSessions(
  current: WorkoutSession,
  previous: WorkoutSession | undefined,
): SessionComparison | undefined {
  if (!previous) return undefined
  if (current.totalVolume === 0 && previous.totalVolume === 0) return undefined

  const volumeDelta = current.totalVolume - previous.totalVolume
  return {
    volumeDelta,
    workingSetsDelta: current.totalWorkingSets - previous.totalWorkingSets,
    isVolumeUp: volumeDelta > 0,
  }
}
