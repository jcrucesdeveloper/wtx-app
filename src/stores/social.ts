import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { requireSupabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import { parseSessionText } from '@/lib/parseSession'
import type { WorkoutSession } from '@/lib/wtx'
import type {
  CommentRow,
  FeedRow,
  PersonRow,
  SocialProfileRow,
  SuggestionReason,
} from '@/lib/supabase/database.types'

/** A workout in the feed. One shared object per workout, so every list showing it stays in step. */
export interface FeedPost {
  id: string
  userId: string
  displayName: string
  roomId: string | null
  /** Epoch millis the workout was saved. */
  createdAt: number
  /** The server's timestamp as-is — the paging cursor. */
  cursor: string
  kudosCount: number
  commentCount: number
  gaveKudos: boolean
  /** `null` if the `.wts` text didn't parse (shown as a plain card). */
  session: WorkoutSession | null
}

export type SocialProfile = SocialProfileRow
export type Person = PersonRow
export type Comment = CommentRow

export interface Suggestion {
  id: string
  display_name: string
  reason: SuggestionReason
  follows_me: boolean
}

export type FeedStatus = 'idle' | 'loading' | 'ready' | 'error'

const PAGE_SIZE = 15

function rowToPost(row: FeedRow): FeedPost {
  const parsed = parseSessionText(row.raw_text)
  return {
    id: row.session_id,
    userId: row.user_id,
    displayName: row.display_name,
    roomId: row.room_id,
    createdAt: Date.parse(row.created_at),
    cursor: row.created_at,
    kudosCount: row.kudos_count,
    commentCount: row.comment_count,
    gaveKudos: row.gave_kudos,
    session: parsed.ok ? parsed.session : null,
  }
}

/**
 * The social feed: workouts from you and the people you follow, plus follows,
 * kudos and comments. Server-backed and not persisted — unlike routines and
 * sessions, none of this is the user's own data to keep offline.
 */
export const useSocialStore = defineStore('social', () => {
  const posts = reactive(new Map<string, FeedPost>())
  const profiles = reactive(new Map<string, SocialProfile>())

  const feedIds = ref<string[]>([])
  const feedStatus = ref<FeedStatus>('idle')
  const feedHasMore = ref(true)
  const loadingMore = ref(false)

  /** Who you follow — the source of truth for every Follow button. */
  const following = reactive(new Set<string>())
  /** Follows / unfollows still on their way to the server. */
  const pendingFollows = reactive(new Set<string>())
  /** People you've dismissed from suggestions this session. */
  const dismissed = reactive(new Set<string>())
  const suggestionRows = ref<Suggestion[]>([])

  const feed = computed(() => feedIds.value.map((id) => posts.get(id)).filter((p): p is FeedPost => !!p))
  const suggestions = computed(() =>
    suggestionRows.value.filter((s) => !following.has(s.id) && !dismissed.has(s.id)),
  )

  function myId(): string | null {
    return useAuthStore().user?.id ?? null
  }

  /** Stores fetched rows, reusing the existing object for a workout already on screen. */
  function remember(rows: FeedRow[]): FeedPost[] {
    return rows.map((row) => {
      const next = rowToPost(row)
      const existing = posts.get(next.id)
      if (existing) {
        Object.assign(existing, next)
        return existing
      }
      posts.set(next.id, next)
      return posts.get(next.id)!
    })
  }

  /**
   * One page of workouts, newest first: the home feed, or one person's.
   *
   * @param after - The last post already shown; the page continues below it.
   */
  async function fetchPage(opts: { userId?: string; after?: FeedPost; limit?: number } = {}): Promise<FeedPost[]> {
    const { data, error } = await requireSupabase().rpc('social_feed', {
      p_user_id: opts.userId ?? null,
      p_before: opts.after?.cursor ?? null,
      p_before_id: opts.after?.id ?? null,
      p_limit: opts.limit ?? PAGE_SIZE,
    })
    if (error) throw error
    return remember(data ?? [])
  }

  /** A single workout, or `null` if it's gone or you can't see it. */
  async function fetchPost(id: string): Promise<FeedPost | null> {
    const { data, error } = await requireSupabase().rpc('social_feed', { p_session_id: id, p_limit: 1 })
    if (error) throw error
    return remember(data ?? [])[0] ?? null
  }

  /** Reloads the home feed from the top. Keeps showing the old one until the new one arrives. */
  async function loadFeed() {
    if (feedStatus.value !== 'ready') feedStatus.value = 'loading'
    try {
      const page = await fetchPage()
      feedIds.value = page.map((p) => p.id)
      feedHasMore.value = page.length === PAGE_SIZE
      feedStatus.value = 'ready'
    } catch (e) {
      if (!feedIds.value.length) feedStatus.value = 'error'
      throw e
    }
  }

  /** Appends the next page (infinite scroll). A no-op while one is loading or at the end. */
  async function loadMoreFeed() {
    if (loadingMore.value || !feedHasMore.value || feedStatus.value !== 'ready') return
    const last = feed.value[feed.value.length - 1]
    if (!last) return
    loadingMore.value = true
    try {
      const page = await fetchPage({ after: last })
      const seen = new Set(feedIds.value)
      feedIds.value.push(...page.map((p) => p.id).filter((id) => !seen.has(id)))
      feedHasMore.value = page.length === PAGE_SIZE
    } finally {
      loadingMore.value = false
    }
  }

  async function loadFollowing() {
    const uid = myId()
    if (!uid) return
    const { data, error } = await requireSupabase().from('follows').select('followee_id').eq('follower_id', uid)
    if (error) throw error
    following.clear()
    for (const row of data ?? []) following.add(row.followee_id)
  }

  async function loadSuggestions() {
    const { data, error } = await requireSupabase().rpc('suggested_profiles', { p_limit: 12 })
    if (error) throw error
    suggestionRows.value = data ?? []
  }

  /** A profile with its follow counts; cached so revisits render instantly. */
  async function fetchProfile(userId: string): Promise<SocialProfile | null> {
    const { data, error } = await requireSupabase().rpc('social_profile', { p_user_id: userId })
    if (error) throw error
    const row = data?.[0] ?? null
    if (row) profiles.set(userId, row)
    return row
  }

  function adjustCount(userId: string | null, key: 'followers_count' | 'following_count', by: number) {
    const profile = userId ? profiles.get(userId) : undefined
    if (profile) profile[key] = Math.max(0, profile[key] + by)
  }

  function isFollowing(userId: string): boolean {
    return following.has(userId)
  }

  /** Follows or unfollows, updating every button and count right away and rolling back on failure. */
  async function setFollowing(userId: string, follow: boolean) {
    const uid = myId()
    if (!uid || userId === uid || pendingFollows.has(userId) || following.has(userId) === follow) return
    const by = follow ? 1 : -1
    pendingFollows.add(userId)
    if (follow) following.add(userId)
    else following.delete(userId)
    adjustCount(userId, 'followers_count', by)
    adjustCount(uid, 'following_count', by)
    const profile = profiles.get(userId)
    if (profile) profile.is_following = follow

    try {
      const sb = requireSupabase()
      const { error } = follow
        ? await sb.from('follows').insert({ follower_id: uid, followee_id: userId })
        : await sb.from('follows').delete().eq('follower_id', uid).eq('followee_id', userId)
      if (error) throw error
      // Their workouts join (or leave) the feed.
      void loadFeed().catch(() => {})
    } catch (e) {
      if (follow) following.delete(userId)
      else following.add(userId)
      adjustCount(userId, 'followers_count', -by)
      adjustCount(uid, 'following_count', -by)
      if (profile) profile.is_following = !follow
      throw e
    } finally {
      pendingFollows.delete(userId)
    }
  }

  function dismissSuggestion(userId: string) {
    dismissed.add(userId)
  }

  /** Gives or takes back kudos, optimistically. You can't give your own workout kudos. */
  async function toggleKudos(post: FeedPost) {
    const uid = myId()
    if (!uid || post.userId === uid) return
    const give = !post.gaveKudos
    post.gaveKudos = give
    post.kudosCount = Math.max(0, post.kudosCount + (give ? 1 : -1))
    try {
      const sb = requireSupabase()
      const { error } = give
        ? await sb.from('session_kudos').insert({ session_id: post.id, user_id: uid })
        : await sb.from('session_kudos').delete().eq('session_id', post.id).eq('user_id', uid)
      // A double tap that raced the first insert is already the state we want.
      if (error && error.code !== '23505') throw error
    } catch (e) {
      post.gaveKudos = !give
      post.kudosCount = Math.max(0, post.kudosCount + (give ? -1 : 1))
      throw e
    }
  }

  async function fetchKudosGivers(postId: string): Promise<{ user_id: string; display_name: string }[]> {
    const { data, error } = await requireSupabase().rpc('post_kudos', { p_session_id: postId })
    if (error) throw error
    return data ?? []
  }

  async function fetchComments(postId: string): Promise<Comment[]> {
    const { data, error } = await requireSupabase().rpc('post_comments', { p_session_id: postId })
    if (error) throw error
    const comments = data ?? []
    const post = posts.get(postId)
    if (post) post.commentCount = comments.length
    return comments
  }

  async function addComment(postId: string, body: string): Promise<Comment> {
    const uid = myId()
    if (!uid) throw new Error('not_authenticated')
    const { data, error } = await requireSupabase()
      .from('session_comments')
      .insert({ session_id: postId, user_id: uid, body: body.trim() })
      .select()
      .single()
    if (error) throw error
    const post = posts.get(postId)
    if (post) post.commentCount++
    return {
      id: data.id,
      user_id: uid,
      display_name: useAuthStore().profile?.display_name ?? '',
      body: data.body,
      created_at: data.created_at,
    }
  }

  async function deleteComment(postId: string, commentId: string) {
    const { error } = await requireSupabase().from('session_comments').delete().eq('id', commentId)
    if (error) throw error
    const post = posts.get(postId)
    if (post) post.commentCount = Math.max(0, post.commentCount - 1)
  }

  async function searchPeople(query: string): Promise<Person[]> {
    const { data, error } = await requireSupabase().rpc('search_profiles', { p_query: query })
    if (error) throw error
    return data ?? []
  }

  async function followList(userId: string, kind: 'followers' | 'following'): Promise<Person[]> {
    const { data, error } = await requireSupabase().rpc('follow_list', { p_user_id: userId, p_kind: kind })
    if (error) throw error
    return data ?? []
  }

  /** Loads what the Social tab needs; each part fails on its own. */
  async function refresh() {
    await Promise.allSettled([
      loadFollowing(),
      loadFeed(),
      loadSuggestions(),
      ...(myId() ? [fetchProfile(myId()!)] : []),
    ])
  }

  /** Forgets everything (log-out). */
  function reset() {
    posts.clear()
    profiles.clear()
    feedIds.value = []
    feedStatus.value = 'idle'
    feedHasMore.value = true
    loadingMore.value = false
    following.clear()
    pendingFollows.clear()
    dismissed.clear()
    suggestionRows.value = []
  }

  return {
    posts,
    profiles,
    feed,
    feedStatus,
    feedHasMore,
    loadingMore,
    following,
    pendingFollows,
    suggestions,
    fetchPage,
    fetchPost,
    loadFeed,
    loadMoreFeed,
    loadFollowing,
    loadSuggestions,
    fetchProfile,
    isFollowing,
    setFollowing,
    dismissSuggestion,
    toggleKudos,
    fetchKudosGivers,
    fetchComments,
    addComment,
    deleteComment,
    searchPeople,
    followList,
    refresh,
    reset,
  }
})
