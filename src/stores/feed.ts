import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { requireSupabase } from '@/services/supabase'
import { track } from '@/services/analytics'
import { useAuthStore } from '@/stores/auth'
import { parseSessionText } from '@/lib/parseSession'
import { parseFeedSnapshot, type FeedSnapshot } from '@/lib/feedSnapshot'
import { normalizeFollowCode } from '@/lib/followCode'
import type { ProfileRow } from '@/lib/supabase/database.types'
import type { WorkoutSession } from '@/lib/wtx'

export const FEED_PAGE_SIZE = 20
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

  /**
   * Accounts this user has blocked (set by the moderation store). The server
   * already hides them once the block lands, but a page fetched just before,
   * or a request racing the block, must not bring their posts back.
   */
  const hiddenUserIds = ref(new Set<string>())

  function isHidden(userId: string) {
    return hiddenUserIds.value.has(userId)
  }

  /** Replaces the hidden set and drops anything already loaded from those accounts. */
  function setHiddenUsers(ids: Iterable<string>) {
    hiddenUserIds.value = new Set(ids)
    for (const id of hiddenUserIds.value) dropUser(id)
  }

  /** Hides one account from now on — right after blocking it. */
  function hideUser(userId: string) {
    hiddenUserIds.value = new Set(hiddenUserIds.value).add(userId)
    dropUser(userId)
  }

  function unhideUser(userId: string) {
    const next = new Set(hiddenUserIds.value)
    next.delete(userId)
    hiddenUserIds.value = next
  }

  /** Removes an account's posts and follow edge from everything loaded. */
  function dropUser(userId: string) {
    posts.value = posts.value.filter((p) => p.posterId !== userId)
    for (const [sessionId, post] of known) {
      if (post.posterId === userId) known.delete(sessionId)
    }
    following.value = following.value.filter((f) => f.id !== userId)
  }

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

  const FEED_SELECT =
    'id, user_id, raw_text, created_at, feed_snapshot, profiles!sessions_user_id_fkey(display_name), session_kudos(count)'

  /**
   * Every post loaded anywhere (feed pages, a profile, a deep link), one
   * reactive object per session — so a kudos tap on a profile shows up in
   * the feed and on the post page too.
   */
  const known = reactive(new Map<string, FeedPost>())

  function intern(post: FeedPost): FeedPost {
    const existing = known.get(post.sessionId)
    if (existing) {
      Object.assign(existing, post)
      return existing
    }
    known.set(post.sessionId, post)
    return known.get(post.sessionId)!
  }

  /** A page of shared posts, newest first — everyone visible to you, or one person's. */
  async function fetchPosts(opts: { from: number; userId?: string }): Promise<FeedPost[]> {
    let query = requireSupabase().from('sessions').select(FEED_SELECT).eq('shared', true)
    if (opts.userId) query = query.eq('user_id', opts.userId)
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(opts.from, opts.from + FEED_PAGE_SIZE - 1)
    if (error) throw error

    const rows = ((data ?? []) as unknown as FeedRow[]).filter((r) => !isHidden(r.user_id))
    const kudosByMe = await fetchKudosByMe(rows.map((r) => r.id))
    return rows
      .map((r) => toFeedPost(r, kudosByMe))
      .filter((p): p is FeedPost => p !== null)
      .map(intern)
  }

  function getPost(sessionId: string): FeedPost | undefined {
    return known.get(sessionId)
  }

  /** Returns an already-loaded post, or fetches it on its own (RLS decides if it's visible). */
  async function loadPost(sessionId: string): Promise<FeedPost | null> {
    const cached = getPost(sessionId)
    if (cached) return cached
    const { data, error } = await requireSupabase()
      .from('sessions')
      .select(FEED_SELECT)
      .eq('id', sessionId)
      .eq('shared', true)
      .maybeSingle()
    if (error || !data || isHidden((data as unknown as FeedRow).user_id)) return null
    const kudosByMe = await fetchKudosByMe([sessionId])
    const post = toFeedPost(data as unknown as FeedRow, kudosByMe)
    return post ? intern(post) : null
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
      const page = await fetchPosts({ from: 0 })
      posts.value = page
      hasMore.value = page.length === FEED_PAGE_SIZE
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
      const page = await fetchPosts({ from: posts.value.length })
      posts.value = [...posts.value, ...page]
      hasMore.value = page.length === FEED_PAGE_SIZE
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
    const post = getPost(sessionId)
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
    const uid = myId()
    if (!uid || (!opts.force && isFresh(followingLoadedAt, followingLoadedFor))) return
    followingLoading.value = true
    try {
      // RLS returns edges in both directions (so the followers list works) — keep only ours.
      const { data, error } = await requireSupabase()
        .from('follows')
        .select('followee_id, profiles!follows_followee_id_fkey(display_name)')
        .eq('follower_id', uid)
        .order('created_at', { ascending: false })
      if (error) throw error
      following.value = (data ?? [])
        .filter((row) => !isHidden(row.followee_id))
        .map((row) => ({
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

  /** Follows someone you can already see (a follower or a roommate) — "Follow back". */
  async function followUser(userId: string): Promise<ProfileRow> {
    const { data, error } = await requireSupabase().rpc('follow_user', { p_user_id: userId })
    if (error || !data) throw toFollowError(error)
    track('user_followed')
    if (!following.value.some((f) => f.id === userId)) {
      following.value = [{ id: userId, displayName: data.display_name }, ...following.value]
    }
    void loadFollowing({ force: true })
    feedLoadedAt = 0
    return data
  }

  /** Stops following — silently, the other person isn't notified. Throws if it didn't go through. */
  async function unfollow(userId: string) {
    const uid = myId()
    if (!uid) return
    following.value = following.value.filter((f) => f.id !== userId)
    feedLoadedAt = 0
    const { error } = await requireSupabase().from('follows').delete().eq('follower_id', uid).eq('followee_id', userId)
    if (error) {
      void loadFollowing({ force: true })
      throw error
    }
  }

  /** Removes someone from your followers — silently, like unfollowing. */
  async function removeFollower(userId: string) {
    const uid = myId()
    if (!uid) return
    const { error } = await requireSupabase().from('follows').delete().eq('follower_id', userId).eq('followee_id', uid)
    if (error) throw error
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
    fetchPosts,
    getPost,
    loadPost,
    toggleKudos,
    loadFollowing,
    followByCode,
    followUser,
    unfollow,
    removeFollower,
    isHidden,
    setHiddenUsers,
    hideUser,
    unhideUser,
  }
})
