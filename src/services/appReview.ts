import { Capacitor } from '@capacitor/core'
import { InAppReview } from '@capacitor-community/in-app-review'
import { shouldAskForReview } from '@/lib/reviewPrompt'
import { track } from '@/services/analytics'

const STORAGE_KEY = 'wtx:review-asked-at'

function lastAskedAt(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  const value = raw === null ? NaN : Number(raw)
  return Number.isFinite(value) ? value : null
}

/**
 * Asks for a store rating through the system's own sheet (StoreKit / Play
 * In-App Review). Native only. The store decides whether the sheet actually
 * appears and never reports back, so "asked" here means "requested".
 */
export const AppReviewService = {
  /**
   * Requests the rating sheet if this finish is a good moment for it (see
   * `shouldAskForReview`). Resolves `true` when a request was made, so the
   * caller can skip anything else that would stack on top of it.
   */
  async maybeAsk(input: { hadWin: boolean; totalSessions: number }): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false
    const now = Date.now()
    if (!shouldAskForReview({ ...input, lastAskedAt: lastAskedAt(), now })) return false

    // Recorded before the request: a failure shouldn't retry on every finish.
    localStorage.setItem(STORAGE_KEY, String(now))
    try {
      await InAppReview.requestReview()
      track('review_requested')
      return true
    } catch (err) {
      console.error('[review] request failed', err)
      return false
    }
  },
}
