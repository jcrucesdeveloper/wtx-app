/** Workouts logged before a rating is ever asked for — enough to have an opinion. */
const MIN_SESSIONS = 3

/** Gap between two asks. The stores cap how often their sheet shows; this keeps well under it. */
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000

export interface ReviewPromptInput {
  /** The finish had something to celebrate: a personal record or a milestone. */
  hadWin: boolean
  /** Lifetime workouts, including the one just finished. */
  totalSessions: number
  /** When a rating was last asked for (epoch ms), if ever. */
  lastAskedAt: number | null
  now: number
}

/**
 * Whether this finish is a good moment to ask for a store rating: only right
 * after a win, only once the app has been used a few times, and not again
 * for a while.
 */
export function shouldAskForReview(input: ReviewPromptInput): boolean {
  if (!input.hadWin) return false
  if (input.totalSessions < MIN_SESSIONS) return false
  if (input.lastAskedAt !== null && input.now - input.lastAskedAt < COOLDOWN_MS) return false
  return true
}
