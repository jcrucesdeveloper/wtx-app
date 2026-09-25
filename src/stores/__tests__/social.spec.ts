import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { FeedRow } from '@/lib/supabase/database.types'
import { serializeSession } from '@/lib/serializeSession'

/** A tiny stand-in for the Supabase client: canned RPC results and recorded table writes. */
const server = vi.hoisted(() => ({
  rpc: vi.fn<(name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>>(),
  writes: [] as { table: string; op: string; payload?: unknown; filters: [string, unknown][] }[],
  failWrites: false,
}))

vi.mock('@/services/supabase', () => {
  function table(name: string) {
    const write = { table: name, op: '', payload: undefined as unknown, filters: [] as [string, unknown][] }
    const result = () =>
      server.failWrites ? { data: null, error: { code: '500', message: 'down' } } : { data: [], error: null }
    // Each step is awaitable like the real query builder: a promise with the chain methods on it.
    interface Chain extends Promise<unknown> {
      insert(payload: unknown): Chain
      delete(): Chain
      select(): Chain
      eq(column: string, value: unknown): Chain
    }
    const chain = (): Chain =>
      Object.assign(Promise.resolve().then(result), {
        insert(payload: unknown) {
          write.op = 'insert'
          write.payload = payload
          server.writes.push(write)
          return chain()
        },
        delete() {
          write.op = 'delete'
          server.writes.push(write)
          return chain()
        },
        select: () => chain(),
        eq(column: string, value: unknown) {
          write.filters.push([column, value])
          return chain()
        },
      })
    return chain()
  }
  return {
    supabase: null,
    isSupabaseConfigured: true,
    requireSupabase: () => ({ rpc: server.rpc, from: table }),
  }
})

import { useAuthStore } from '@/stores/auth'
import { useSocialStore } from '@/stores/social'

const ME = 'me-0000'
const BEN = 'ben-0000'

function row(n: number, overrides: Partial<FeedRow> = {}): FeedRow {
  return {
    session_id: `s${n}`,
    user_id: BEN,
    display_name: 'Ben',
    raw_text: serializeSession({
      name: `Push ${n}`,
      date: '2026-09-25',
      unit: 'kg',
      exercises: [
        {
          name: 'Bench Press',
          kind: 'reps',
          sets: 1,
          reps: 5,
          weight: 80,
          note: '',
          loggedSets: [{ id: '1', type: 'number', weight: 80, reps: 5, completed: true }],
        },
      ],
    }),
    room_id: null,
    created_at: new Date(Date.UTC(2026, 8, 25, 12, 60 - n)).toISOString(),
    kudos_count: 0,
    comment_count: 0,
    gave_kudos: false,
    ...overrides,
  }
}

function logIn() {
  const auth = useAuthStore()
  auth.session = { user: { id: ME } } as never
}

describe('social store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    server.rpc.mockReset()
    server.writes = []
    server.failWrites = false
    logIn()
  })

  it('loads the feed and pages on from the last post', async () => {
    const social = useSocialStore()
    server.rpc.mockResolvedValueOnce({ data: Array.from({ length: 15 }, (_, i) => row(i + 1)), error: null })
    await social.loadFeed()
    expect(social.feed).toHaveLength(15)
    expect(social.feedHasMore).toBe(true)
    expect(social.feed[0]!.session?.name).toBe('Push 1')

    server.rpc.mockResolvedValueOnce({ data: [row(16), row(15)], error: null })
    await social.loadMoreFeed()
    const [, args] = server.rpc.mock.calls[1]!
    expect(args).toMatchObject({ p_before: row(15).created_at, p_before_id: 's15' })
    // The overlapping row isn't duplicated; a short page means the end.
    expect(social.feed.map((p) => p.id)).toHaveLength(16)
    expect(social.feedHasMore).toBe(false)
  })

  it('shares one object per workout across lists', async () => {
    const social = useSocialStore()
    server.rpc.mockResolvedValueOnce({ data: [row(1)], error: null })
    await social.loadFeed()
    server.rpc.mockResolvedValueOnce({ data: [row(1, { kudos_count: 4 })], error: null })
    const fromProfile = await social.fetchPage({ userId: BEN })
    expect(fromProfile[0]).toBe(social.feed[0])
    expect(social.feed[0]!.kudosCount).toBe(4)
  })

  it('gives kudos optimistically and rolls back when the server says no', async () => {
    const social = useSocialStore()
    server.rpc.mockResolvedValueOnce({ data: [row(1)], error: null })
    await social.loadFeed()
    const post = social.feed[0]!

    await social.toggleKudos(post)
    expect(post.gaveKudos).toBe(true)
    expect(post.kudosCount).toBe(1)
    expect(server.writes[server.writes.length - 1]).toMatchObject({ table: 'session_kudos', op: 'insert' })

    server.failWrites = true
    await expect(social.toggleKudos(post)).rejects.toBeTruthy()
    expect(post.gaveKudos).toBe(true)
    expect(post.kudosCount).toBe(1)
  })

  it("doesn't let you give your own workout kudos", async () => {
    const social = useSocialStore()
    server.rpc.mockResolvedValueOnce({ data: [row(1, { user_id: ME })], error: null })
    await social.loadFeed()
    await social.toggleKudos(social.feed[0]!)
    expect(social.feed[0]!.gaveKudos).toBe(false)
    expect(server.writes).toHaveLength(0)
  })

  it('follows optimistically, updating counts, and undoes it on failure', async () => {
    const social = useSocialStore()
    server.rpc.mockResolvedValue({
      data: [
        {
          id: BEN,
          display_name: 'Ben',
          share_workouts: true,
          created_at: '2026-01-01T00:00:00Z',
          followers_count: 2,
          following_count: 0,
          workouts_count: 3,
          is_following: false,
          follows_me: true,
        },
      ],
      error: null,
    })
    await social.fetchProfile(BEN)

    await social.setFollowing(BEN, true)
    expect(social.isFollowing(BEN)).toBe(true)
    expect(social.profiles.get(BEN)!.followers_count).toBe(3)
    expect(server.writes[server.writes.length - 1]).toMatchObject({
      table: 'follows',
      op: 'insert',
      payload: { follower_id: ME, followee_id: BEN },
    })

    server.failWrites = true
    await expect(social.setFollowing(BEN, false)).rejects.toBeTruthy()
    expect(social.isFollowing(BEN)).toBe(true)
    expect(social.profiles.get(BEN)!.followers_count).toBe(3)
  })

  it("can't follow yourself", async () => {
    const social = useSocialStore()
    await social.setFollowing(ME, true)
    expect(social.isFollowing(ME)).toBe(false)
    expect(server.writes).toHaveLength(0)
  })

  it('hides followed and dismissed people from suggestions', async () => {
    const social = useSocialStore()
    server.rpc.mockResolvedValueOnce({
      data: [
        { id: BEN, display_name: 'Ben', reason: 'trained_together', follows_me: false },
        { id: 'cam', display_name: 'Cam', reason: 'new', follows_me: false },
        { id: 'dee', display_name: 'Dee', reason: 'new', follows_me: false },
      ],
      error: null,
    })
    await social.loadSuggestions()
    social.dismissSuggestion('cam')
    server.rpc.mockResolvedValue({ data: [], error: null })
    await social.setFollowing(BEN, true)
    expect(social.suggestions.map((s) => s.id)).toEqual(['dee'])
  })

  it('forgets everything on reset', async () => {
    const social = useSocialStore()
    server.rpc.mockResolvedValueOnce({ data: [row(1)], error: null })
    await social.loadFeed()
    social.reset()
    expect(social.feed).toHaveLength(0)
    expect(social.feedStatus).toBe('idle')
  })
})
