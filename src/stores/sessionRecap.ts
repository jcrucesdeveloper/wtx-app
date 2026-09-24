import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { PersonalRecord } from '@/lib/sessionRecords'
import type { SessionComparison } from '@/lib/sessionComparisons'
import type { Milestone } from '@/lib/sessionMilestones'

export interface SessionRecap {
  sessionId: string
  personalRecords: PersonalRecord[]
  comparison: SessionComparison | undefined
  milestone: Milestone | undefined
  weekStreak: number
  elapsedSeconds: number
}

/**
 * The celebratory recap for the session that was just finished, handed from
 * `useFinishSession` to `SessionCompleteView` across the route transition.
 *
 * Deliberately NOT persisted to localStorage, unlike every other store here
 * — it's a one-shot handoff for the screen the user is about to land on, not
 * durable state. Don't add a `watch`+`localStorage.setItem` to "fix" that.
 */
export const useSessionRecapStore = defineStore('sessionRecap', () => {
  const recap = ref<SessionRecap | null>(null)

  function setRecap(value: SessionRecap) {
    recap.value = value
  }

  function clear() {
    recap.value = null
  }

  return { recap, setRecap, clear }
})
