import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { requireSupabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feed'
import { useProfileStore } from '@/stores/profile'
import { isRateLimited } from '@/lib/supabase/limits'

/** Mirrors the `content_reports.reason` check constraint. */
export const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'other'] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

/** Mirrors the `content_reports.details` check constraint. */
export const REPORT_DETAILS_MAX = 500

/** A block/report that didn't go through; `rate_limited` when the server throttled it. */
export class ModerationError extends Error {
  constructor(
    public code: 'rate_limited' | 'unknown',
    message?: string,
  ) {
    super(message ?? code)
  }
}

function toModerationError(error: { message?: string }): ModerationError {
  return new ModerationError(isRateLimited(error) ? 'rate_limited' : 'unknown', error.message)
}

export interface BlockedUser {
  id: string
  displayName: string
}

export interface ReportInput {
  userId: string
  /** The shared workout being reported, when it's a post rather than the account. */
  sessionId?: string
  reason: ReportReason
  details?: string
}

/**
 * Blocking and reporting (App Store 1.2 / Play UGC). The server does the real
 * enforcement — `block_user` removes the follows both ways and every follow
 * path refuses a blocked pair — so this store only keeps the list for the
 * Blocked accounts screen and makes a block take effect on screen at once:
 * the feed hides the account's posts and the profile cache forgets them.
 */
export const useModerationStore = defineStore('moderation', () => {
  const feed = useFeedStore()
  const profiles = useProfileStore()

  const blocked = ref<BlockedUser[]>([])
  const loading = ref(false)
  const blockedIds = computed(() => new Set(blocked.value.map((b) => b.id)))

  const myId = () => useAuthStore().user?.id ?? null
  let loadedFor: string | null = null

  // Another account on this device has its own block list.
  watch(myId, () => {
    blocked.value = []
    loadedFor = null
    feed.setHiddenUsers([])
  })

  function setBlocked(list: BlockedUser[]) {
    blocked.value = list
    feed.setHiddenUsers(list.map((b) => b.id))
  }

  /** Loads the block list once per account, unless `force` is set. */
  async function loadBlocked(opts: { force?: boolean } = {}) {
    const uid = myId()
    if (!uid || loading.value || (!opts.force && loadedFor === uid)) return
    loading.value = true
    try {
      const { data, error } = await requireSupabase().rpc('get_blocked_users')
      if (error) throw error
      setBlocked((data ?? []).map((row) => ({ id: row.id, displayName: row.display_name })))
      loadedFor = uid
    } catch {
      /* keep what was loaded; blocks are still enforced server-side */
    } finally {
      loading.value = false
    }
  }

  function isBlocked(id: string) {
    return blockedIds.value.has(id)
  }

  /** Blocks an account. They aren't notified; follows between you are removed. */
  async function block(user: BlockedUser) {
    const { error } = await requireSupabase().rpc('block_user', { p_user_id: user.id })
    if (error) throw toModerationError(error)
    if (!isBlocked(user.id)) blocked.value = [user, ...blocked.value]
    feed.hideUser(user.id)
    profiles.forget(user.id, { blocked: true })
  }

  async function unblock(id: string) {
    const uid = myId()
    if (!uid) return
    const before = blocked.value
    blocked.value = blocked.value.filter((b) => b.id !== id)
    const { error } = await requireSupabase()
      .from('user_blocks')
      .delete()
      .eq('blocker_id', uid)
      .eq('blocked_id', id)
    if (error) {
      blocked.value = before
      throw error
    }
    feed.unhideUser(id)
    profiles.forget(id)
  }

  /** Files a report for review. Throws if it didn't go through. */
  async function report(input: ReportInput) {
    const { error } = await requireSupabase()
      .from('content_reports')
      .insert({
        reported_user_id: input.userId,
        session_id: input.sessionId ?? null,
        reason: input.reason,
        details: (input.details ?? '').trim().slice(0, REPORT_DETAILS_MAX),
      })
    if (error) throw toModerationError(error)
  }

  return { blocked, blockedIds, loading, loadBlocked, isBlocked, block, unblock, report }
})
