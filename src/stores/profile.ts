import { reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { requireSupabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import { FEED_PAGE_SIZE, useFeedStore, type FeedPost } from '@/stores/feed'
import { toDateStr } from '@/lib/sessionStats'

/** Re-opening a profile within this window reuses what's loaded instead of refetching. */
const STALE_MS = 2 * 60_000

export interface Profile {
  id: string
  displayName: string
  bio: string
  createdAt: string
  workoutCount: number
  followerCount: number
  followingCount: number
  iFollow: boolean
  followsMe: boolean
  /** Rooms you and they both trained in (0 on your own profile). */
  trainedTogether: number
  /** Local `YYYY-MM-DD` of each shared workout — empty when locked. */
  workoutDates: string[]
}

export interface Connection {
  id: string
  displayName: string
}

interface Entry {
  profile: Profile | null
  loading: boolean
  /** `not_found`: no such profile, or not one you're allowed to see. */
  error: 'not_found' | 'unknown' | null
  loadedAt: number
  workouts: FeedPost[]
  workoutsLoading: boolean
  hasMoreWorkouts: boolean
}

const emptyEntry = (): Entry => ({
  profile: null,
  loading: false,
  error: null,
  loadedAt: 0,
  workouts: [],
  workoutsLoading: false,
  hasMoreWorkouts: true,
})

type ProfileRpcRow = {
  id: string
  display_name: string
  bio: string
  created_at: string
  workout_count: number
  follower_count: number
  following_count: number
  i_follow: boolean
  follows_me: boolean
  trained_together: number
  workout_times: string[] | null
}

function toProfile(row: ProfileRpcRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    bio: row.bio ?? '',
    createdAt: row.created_at,
    workoutCount: row.workout_count,
    followerCount: row.follower_count,
    followingCount: row.following_count,
    iFollow: row.i_follow,
    followsMe: row.follows_me,
    trainedTogether: row.trained_together,
    workoutDates: (row.workout_times ?? []).map((t) => toDateStr(new Date(t))),
  }
}

/**
 * Social profiles: a header summary per person (`get_profile` — the counts
 * need the server, since follows RLS hides other people's edges), their
 * shared workouts (loaded through the feed store so each post is one shared
 * object), and your own followers list. Follow changes are optimistic and
 * revert on failure, like kudos.
 */
export const useProfileStore = defineStore('profile', () => {
  const feed = useFeedStore()
  const entries = reactive(new Map<string, Entry>())

  const followers = ref<Connection[]>([])
  const followersLoading = ref(false)

  const myId = () => useAuthStore().user?.id ?? null

  // Another account on this device must not see the previous one's cached relationships.
  watch(myId, () => {
    entries.clear()
    followers.value = []
  })

  function entry(id: string): Entry {
    if (!entries.has(id)) entries.set(id, emptyEntry())
    return entries.get(id)!
  }

  /** Loads a profile's header, then its first page of workouts if you're allowed to see them. */
  async function load(id: string, opts: { force?: boolean } = {}) {
    const e = entry(id)
    if (!opts.force && e.profile && Date.now() - e.loadedAt < STALE_MS) return
    e.loading = true
    e.error = null
    try {
      const { data, error } = await requireSupabase().rpc('get_profile', { p_user_id: id })
      if (error) throw error
      const row = (data as ProfileRpcRow[] | null)?.[0]
      if (!row) {
        e.error = 'not_found'
        e.profile = null
        return
      }
      e.profile = toProfile(row)
      e.loadedAt = Date.now()
    } catch (err) {
      e.error = (err as { message?: string }).message?.includes('not_found')
        ? 'not_found'
        : 'unknown'
      return
    } finally {
      e.loading = false
    }
    if (canSeeWorkouts(id)) await loadWorkouts(id, { reset: true })
    else e.workouts = []
  }

  function canSeeWorkouts(id: string): boolean {
    const p = entries.get(id)?.profile
    return !!p && (p.id === myId() || p.iFollow)
  }

  async function loadWorkouts(id: string, opts: { reset?: boolean } = {}) {
    const e = entry(id)
    if (e.workoutsLoading || (!opts.reset && !e.hasMoreWorkouts)) return
    e.workoutsLoading = true
    try {
      const from = opts.reset ? 0 : e.workouts.length
      const page = await feed.fetchPosts({ from, userId: id })
      e.workouts = opts.reset ? page : [...e.workouts, ...page]
      e.hasMoreWorkouts = page.length === FEED_PAGE_SIZE
    } catch {
      /* leave what's loaded; "load more" can retry */
    } finally {
      e.workoutsLoading = false
    }
  }

  /** Your followers, newest first. Only ever your own — lists are private. */
  async function loadFollowers() {
    const uid = myId()
    if (!uid) return
    followersLoading.value = true
    try {
      const { data, error } = await requireSupabase()
        .from('follows')
        .select('follower_id, profiles!follows_follower_id_fkey(display_name)')
        .eq('followee_id', uid)
        .order('created_at', { ascending: false })
      if (error) throw error
      followers.value = (data ?? []).map((row) => ({
        id: row.follower_id,
        displayName: (row.profiles as { display_name: string } | null)?.display_name ?? '—',
      }))
    } catch {
      /* keep the previous list */
    } finally {
      followersLoading.value = false
    }
  }

  /** Nudges the counts on your own loaded profile. */
  function adjustMine(field: 'followerCount' | 'followingCount', delta: number) {
    const uid = myId()
    const mine = uid ? entries.get(uid)?.profile : null
    if (mine) mine[field] = Math.max(0, mine[field] + delta)
  }

  async function follow(id: string) {
    const p = entries.get(id)?.profile
    if (p) {
      p.iFollow = true
      p.followerCount += 1
    }
    adjustMine('followingCount', 1)
    try {
      await feed.followUser(id)
    } catch (err) {
      if (p) {
        p.iFollow = false
        p.followerCount -= 1
      }
      adjustMine('followingCount', -1)
      throw err
    }
    // Following unlocks their workouts — refresh the profile if it's been opened.
    if (entries.get(id)?.profile) await load(id, { force: true })
  }

  async function unfollow(id: string) {
    const e = entries.get(id)
    const p = e?.profile
    if (p) {
      p.iFollow = false
      p.followerCount = Math.max(0, p.followerCount - 1)
    }
    adjustMine('followingCount', -1)
    try {
      await feed.unfollow(id)
      if (e && id !== myId()) e.workouts = []
    } catch (err) {
      if (p) {
        p.iFollow = true
        p.followerCount += 1
      }
      adjustMine('followingCount', 1)
      throw err
    }
  }

  async function removeFollower(id: string) {
    const before = followers.value
    followers.value = followers.value.filter((f) => f.id !== id)
    const p = entries.get(id)?.profile
    if (p) p.followsMe = false
    adjustMine('followerCount', -1)
    try {
      await feed.removeFollower(id)
    } catch (err) {
      followers.value = before
      if (p) p.followsMe = true
      adjustMine('followerCount', 1)
      throw err
    }
  }

  function get(id: string): Entry {
    return entries.get(id) ?? emptyEntry()
  }

  return {
    followers,
    followersLoading,
    get,
    load,
    loadWorkouts,
    canSeeWorkouts,
    loadFollowers,
    follow,
    unfollow,
    removeFollower,
  }
})
