import { ref } from 'vue'
import { defineStore } from 'pinia'
import { requireSupabase } from '@/services/supabase'
import { track } from '@/services/analytics'
import { useAuthStore } from '@/stores/auth'
import { parseSessionText } from '@/lib/parseSession'
import { parseFeedSnapshot, type FeedSnapshot } from '@/lib/feedSnapshot'
import { normalizeFollowCode } from '@/lib/followCode'
import type { ProfileRow } from '@/lib/supabase/database.types'
import type { WorkoutSession } from '@/lib/wtx'

const PAGE_SIZE = 20
/** Re-entering the Social tab within this window reuses what's loaded instead of refetching. */
const STALE_MS = 2 * 60_000

export interface FeedPost {
  sessionId: string
  posterId: string
  posterName: string
  createdAt: string
  session: WorkoutSession
  snapshot: FeedSnapshot | null
  kudosCount: number
  kudosByMe: boolean
}

export interface FollowedUser {
  id: string
  displayName: string
}

/** A follow-graph error the UI can translate: `social.follow.errors.<code>`. */
export class FollowError extends Error {
  constructor(
    public code: 'code_not_found' | 'cannot_follow_self' | 'not_authenticated' | 'unknown',
    message?: string,
  ) {
    super(message ?? code)
  }
}

function toFollowError(error: { message?: string } | null | undefined): FollowError {
  const message = error?.message ?? ''
  for (const code of ['code_not_found', 'cannot_follow_self', 'not_authenticated'] as const) {
    if (message.includes(code)) return new FollowError(code, message)
  }
  return new FollowError('unknown', message)
}

interface FeedRow {
  id: string
  user_id: string
  raw_text: string
  created_at: string
  feed_snapshot: unknown
  profiles: { display_name: string } | null
  session_kudos: { count: number }[] | null
}

function toFeedPost(row: FeedRow, kudosByMe: Set<string>): FeedPost | null {
  const parsed = parseSessionText(row.raw_text)
  if (!parsed.ok) return null
  return {
    sessionId: row.id,
    posterId: row.user_id,
    posterName: row.profiles?.display_name ?? '—',
    createdAt: row.created_at,
    session: parsed.session,
    snapshot: parseFeedSnapshot(row.feed_snapshot),
    kudosCount: row.session_kudos?.[0]?.count ?? 0,
    kudosByMe: kudosByMe.has(row.id),
  }
}

/**
 * The async Social feed: shared sessions from people you follow (RLS already
 * restricts reads to your own shared sessions plus theirs — see the
 * `sessions: followers read shared` policy), kudos on them, and the follow
 * graph itself (grown by invite code or by training together in a room).
 */
export const useFeedStore = defineStore('feed', () => {
  const posts = ref<FeedPost[]>([])
  const loadingPosts = ref(false)
  const postsError = ref(false)
  const hasMore = ref(true)

  const following = ref<FollowedUser[]>([])
  const followingLoading = ref(false)

  const myId = () => useAuthStore().user?.id ?? null

  async function fetchKudosByMe(sessionIds: string[]): Promise<Set<string>> {
    const uid = myId()
    if (!uid || !sessionIds.length) return new Set()
    const { data } = await requireSupabase()
      .from('session_kudos')
      .select('session_id')
      .eq('user_id', uid)
      .in('session_id', sessionIds)
    return new Set((data ?? []).map((r) => r.session_id))
  }

  async function fetchPage(from: number): Promise<FeedPost[]> {
    const { data, error } = await requireSupabase()
      .from('sessions')
      .select('id, user_id, raw_text, created_at, feed_snapshot, profiles!sessions_user_id_fkey(display_name), session_kudos(count)')
      .eq('shared', true)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error

    const rows = (data ?? []) as unknown as FeedRow[]
    const kudosByMe = await fetchKudosByMe(rows.map((r) => r.id))
    return rows.map((r) => toFeedPost(r, kudosByMe)).filter((p): p is FeedPost => p !== null)
  }

  let feedLoadedAt = 0
  let feedLoadedFor: string | null = null
  let followingLoadedAt = 0
  let followingLoadedFor: string | null = null

  /** Loaded for the current account within {@link STALE_MS}. */
  function isFresh(loadedAt: number, loadedFor: string | null) {
    return loadedFor === myId() && Date.now() - loadedAt < STALE_MS
  }

  /** Reloads the feed from the top, unless it was loaded recently and `force` isn't set. */
  async function loadFeed(opts: { force?: boolean } = {}) {
    if (!opts.force && !postsError.value && isFresh(feedLoadedAt, feedLoadedFor)) return
    loadingPosts.value = true
    postsError.value = false
    try {
      const page = await fetchPage(0)
      posts.value = page
      hasMore.value = page.length === PAGE_SIZE
      feedLoadedAt = Date.now()
      feedLoadedFor = myId()
    } catch (e) {
      console.error('[feed] load failed', e)
      postsError.value = true
    } finally {
      loadingPosts.value = false
    }
  }

  /** Appends the next page. */
  async function loadMore() {
    if (!hasMore.value || loadingPosts.value) return
    loadingPosts.value = true
    try {
      const page = await fetchPage(posts.value.length)
      posts.value = [...posts.value, ...page]
      hasMore.value = page.length === PAGE_SIZE
    } catch {
      /* leave the existing page up; the user can retry via "load more" again */
    } finally {
      loadingPosts.value = false
    }
  }

  /**
   * Single-tap kudos, mirroring `room.ts`'s `sendReaction`: optimistic local
   * update, direct request, revert on failure. No retry queue — losing a
   * kudos tap while offline is low-stakes, unlike a lost workout set.
   */
  async function toggleKudos(sessionId: string) {
    const uid = myId()
    const post = posts.value.find((p) => p.sessionId === sessionId)
    if (!uid || !post) return

    const giving = !post.kudosByMe
    post.kudosByMe = giving
    post.kudosCount += giving ? 1 : -1

    try {
      if (giving) {
        const { error } = await requireSupabase().from('session_kudos').insert({ session_id: sessionId, user_id: uid })
        if (error) throw error
        track('kudos_given')
      } else {
        const { error } = await requireSupabase()
          .from('session_kudos')
          .delete()
          .eq('session_id', sessionId)
          .eq('user_id', uid)
        if (error) throw error
      }
    } catch {
      post.kudosByMe = !giving
      post.kudosCount += giving ? -1 : 1
    }
  }

  /** Who this account follows, newest first — skipped if loaded recently, unless `force` is set. */
  async function loadFollowing(opts: { force?: boolean } = {}) {
    if (!opts.force && isFresh(followingLoadedAt, followingLoadedFor)) return
    followingLoading.value = true
    try {
      const { data, error } = await requireSupabase()
        .from('follows')
        .select('followee_id, profiles!follows_followee_id_fkey(display_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      following.value = (data ?? []).map((row) => ({
        id: row.followee_id,
        displayName: (row.profiles as { display_name: string } | null)?.display_name ?? '—',
      }))
      followingLoadedAt = Date.now()
      followingLoadedFor = myId()
    } catch {
      /* keep whatever was loaded before; the Following list just won't refresh this time */
    } finally {
      followingLoading.value = false
    }
  }

  /** Follows a profile by its permanent invite code — one tap, no preview step. */
  async function followByCode(code: string): Promise<ProfileRow> {
    const { data, error } = await requireSupabase().rpc('follow_by_code', {
      p_code: normalizeFollowCode(code),
    })
    if (error || !data) throw toFollowError(error)
    track('user_followed')
    void loadFollowing({ force: true })
    // A new followee's shared sessions should show up right away.
    feedLoadedAt = 0
    return data
  }

  async function unfollow(userId: string) {
    const uid = myId()
    if (!uid) return
    following.value = following.value.filter((f) => f.id !== userId)
    const { error } = await requireSupabase().from('follows').delete().eq('follower_id', uid).eq('followee_id', userId)
    if (error) void loadFollowing({ force: true })
    feedLoadedAt = 0
  }

  return {
    posts,
    loadingPosts,
    postsError,
    hasMore,
    following,
    followingLoading,
    loadFeed,
    loadMore,
    toggleKudos,
    loadFollowing,
    followByCode,
    unfollow,
  }
})
