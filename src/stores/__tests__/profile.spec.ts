import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFeedStore } from '@/stores/feed'
import { useProfileStore } from '@/stores/profile'

const rpc =
  vi.fn<(fn: string, args?: unknown) => Promise<{ data: unknown; error: { message: string } | null }>>()

vi.mock('@/services/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: true,
  requireSupabase: () => ({ rpc }),
}))

const THEM = 'b0000000-0000-0000-0000-000000000001'

function profileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: THEM,
    display_name: 'Ana',
    bio: 'Squats',
    created_at: '2026-01-10T12:00:00Z',
    workout_count: 4,
    follower_count: 2,
    following_count: 3,
    i_follow: false,
    follows_me: true,
    trained_together: 1,
    workout_times: [],
    ...overrides,
  }
}

describe('profile store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    rpc.mockReset()
    rpc.mockResolvedValue({ data: [profileRow()], error: null })
  })

  it('maps get_profile into a profile and locks workouts until you follow', async () => {
    const profiles = useProfileStore()
    await profiles.load(THEM)

    const p = profiles.get(THEM).profile!
    expect(p.displayName).toBe('Ana')
    expect(p.followsMe).toBe(true)
    expect(p.trainedTogether).toBe(1)
    expect(profiles.canSeeWorkouts(THEM)).toBe(false)
  })

  it('reports not_found for a profile you are not allowed to see', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'not_found' } })
    const profiles = useProfileStore()
    await profiles.load(THEM)

    expect(profiles.get(THEM).profile).toBeNull()
    expect(profiles.get(THEM).error).toBe('not_found')
  })

  it('follows optimistically and reverts when the server refuses', async () => {
    const profiles = useProfileStore()
    const feed = useFeedStore()
    await profiles.load(THEM)

    let release!: (e: Error) => void
    vi.spyOn(feed, 'followUser').mockReturnValue(new Promise((_, reject) => (release = reject)))

    const pending = profiles.follow(THEM)
    expect(profiles.get(THEM).profile!.iFollow).toBe(true)
    expect(profiles.get(THEM).profile!.followerCount).toBe(3)

    release(new Error('boom'))
    await expect(pending).rejects.toThrow('boom')
    expect(profiles.get(THEM).profile!.iFollow).toBe(false)
    expect(profiles.get(THEM).profile!.followerCount).toBe(2)
  })

  it('unfollows optimistically and restores on failure', async () => {
    rpc.mockResolvedValue({ data: [profileRow({ i_follow: true })], error: null })
    const profiles = useProfileStore()
    const feed = useFeedStore()
    vi.spyOn(feed, 'fetchPosts').mockResolvedValue([])
    await profiles.load(THEM)

    vi.spyOn(feed, 'unfollow').mockRejectedValue(new Error('offline'))
    await expect(profiles.unfollow(THEM)).rejects.toThrow('offline')

    expect(profiles.get(THEM).profile!.iFollow).toBe(true)
    expect(profiles.get(THEM).profile!.followerCount).toBe(2)
  })

  it('removes a follower from the list and puts them back if it fails', async () => {
    const profiles = useProfileStore()
    const feed = useFeedStore()
    profiles.followers = [{ id: THEM, displayName: 'Ana' }]

    vi.spyOn(feed, 'removeFollower').mockRejectedValue(new Error('offline'))
    await expect(profiles.removeFollower(THEM)).rejects.toThrow('offline')
    expect(profiles.followers).toEqual([{ id: THEM, displayName: 'Ana' }])
  })
})
