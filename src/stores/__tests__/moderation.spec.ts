import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFeedStore, type FeedPost } from '@/stores/feed'
import { useModerationStore } from '@/stores/moderation'
import { useProfileStore } from '@/stores/profile'

type Result = { data?: unknown; error: { message: string } | null }

const rpc = vi.fn<(fn: string, args?: unknown) => Promise<Result>>()
const insert = vi.fn<(row: unknown) => Promise<Result>>()
const deleteEq = vi.fn<(column: string, value: string) => void>()

/** Awaitable like supabase-js's query builder, without hand-rolling a `then`. */
type DeleteChain = Promise<Result> & { eq: (column: string, value: string) => DeleteChain }

// A chainable `.from(table).delete().eq().eq()` / `.insert()` stand-in.
const from = vi.fn<(table: string) => { insert: typeof insert; delete: () => DeleteChain }>(() => ({
  insert,
  delete: () => {
    const chain: DeleteChain = Object.assign(Promise.resolve<Result>({ error: null }), {
      eq: (column: string, value: string) => {
        deleteEq(column, value)
        return chain
      },
    })
    return chain
  },
}))

// Signed in as ME; the auth store's session plumbing isn't under test here.
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'a0000000-0000-0000-0000-000000000001' } }),
}))

vi.mock('@/services/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: true,
  requireSupabase: () => ({ rpc, from }),
}))

const ME = 'a0000000-0000-0000-0000-000000000001'
const THEM = 'b0000000-0000-0000-0000-000000000001'
const OTHER = 'c0000000-0000-0000-0000-000000000001'

function post(sessionId: string, posterId: string): FeedPost {
  return {
    sessionId,
    posterId,
    posterName: 'x',
    createdAt: '2026-09-01T10:00:00Z',
    session: {} as FeedPost['session'],
    snapshot: null,
    kudosCount: 0,
    kudosByMe: false,
  }
}

describe('moderation store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    rpc.mockReset()
    insert.mockReset()
    deleteEq.mockReset()
    from.mockClear()
    rpc.mockResolvedValue({ data: null, error: null })
    insert.mockResolvedValue({ error: null })
  })

  it('loads the block list once per account and hides those accounts in the feed', async () => {
    rpc.mockResolvedValue({
      data: [{ id: THEM, display_name: 'Ana', blocked_at: '2026-09-01T10:00:00Z' }],
      error: null,
    })
    const moderation = useModerationStore()
    await moderation.loadBlocked()
    await moderation.loadBlocked()

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('get_blocked_users')
    expect(moderation.blocked).toEqual([{ id: THEM, displayName: 'Ana' }])
    expect(moderation.isBlocked(THEM)).toBe(true)
    expect(useFeedStore().isHidden(THEM)).toBe(true)
  })

  it('blocking removes their posts and follow edges from what is loaded', async () => {
    const feed = useFeedStore()
    const profiles = useProfileStore()
    feed.posts = [post('s1', THEM), post('s2', OTHER)]
    feed.following = [
      { id: THEM, displayName: 'Ana' },
      { id: OTHER, displayName: 'Bo' },
    ]
    profiles.followers = [{ id: THEM, displayName: 'Ana' }]

    const moderation = useModerationStore()
    await moderation.block({ id: THEM, displayName: 'Ana' })

    expect(rpc).toHaveBeenCalledWith('block_user', { p_user_id: THEM })
    expect(moderation.blocked).toEqual([{ id: THEM, displayName: 'Ana' }])
    expect(feed.posts.map((p) => p.sessionId)).toEqual(['s2'])
    expect(feed.following.map((f) => f.id)).toEqual([OTHER])
    expect(profiles.followers).toEqual([])
    expect(profiles.get(THEM).error).toBe('not_found')
  })

  it('does not change anything when the server refuses the block', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'not_found' } })
    const feed = useFeedStore()
    feed.posts = [post('s1', THEM)]
    const moderation = useModerationStore()

    await expect(moderation.block({ id: THEM, displayName: 'Ana' })).rejects.toBeTruthy()
    expect(moderation.blocked).toEqual([])
    expect(feed.posts).toHaveLength(1)
  })

  it('unblocks your own row and stops hiding the account', async () => {
    const moderation = useModerationStore()
    await moderation.block({ id: THEM, displayName: 'Ana' })
    await moderation.unblock(THEM)

    expect(from).toHaveBeenCalledWith('user_blocks')
    expect(deleteEq).toHaveBeenCalledWith('blocker_id', ME)
    expect(deleteEq).toHaveBeenCalledWith('blocked_id', THEM)
    expect(moderation.blocked).toEqual([])
    expect(useFeedStore().isHidden(THEM)).toBe(false)
  })

  it('files a report with trimmed details and an optional session', async () => {
    const moderation = useModerationStore()
    await moderation.report({ userId: THEM, sessionId: 's1', reason: 'spam', details: '  ads  ' })
    await moderation.report({ userId: THEM, reason: 'harassment' })

    expect(from).toHaveBeenCalledWith('content_reports')
    expect(insert).toHaveBeenNthCalledWith(1, {
      reported_user_id: THEM,
      session_id: 's1',
      reason: 'spam',
      details: 'ads',
    })
    expect(insert).toHaveBeenNthCalledWith(2, {
      reported_user_id: THEM,
      session_id: null,
      reason: 'harassment',
      details: '',
    })
  })

  it('throws when a report does not go through', async () => {
    insert.mockResolvedValue({ error: { message: 'new row violates row-level security' } })
    const moderation = useModerationStore()
    await expect(moderation.report({ userId: THEM, reason: 'other' })).rejects.toBeTruthy()
  })
})
