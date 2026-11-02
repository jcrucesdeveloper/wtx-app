import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { FollowError, LIKERS_PAGE_SIZE, useFeedStore } from '@/stores/feed'

type Result = { data: unknown; error: { message: string } | null }

const rpc = vi.fn<(fn: string, args?: unknown) => Promise<Result>>()

// loadFollowing() runs after a follow: `.from().select().eq().order()` → no rows.
function emptyQuery() {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => Promise.resolve({ data: [], error: null }),
  }
  return chain
}

vi.mock('@/services/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: true,
  requireSupabase: () => ({ rpc, from: () => emptyQuery() }),
}))

vi.mock('@/services/analytics', () => ({ track: vi.fn<(event: string) => void>() }))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'a0000000-0000-0000-0000-000000000001' } }),
}))

const THEM = 'b0000000-0000-0000-0000-000000000001'

async function followError(run: () => Promise<unknown>): Promise<FollowError> {
  const error = await run().then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(FollowError)
  return error as FollowError
}

describe('feed store follow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    rpc.mockReset()
  })

  it('follows by a normalized code and returns the profile card', async () => {
    rpc.mockResolvedValue({ data: { id: THEM, display_name: 'Ana', bio: '' }, error: null })
    const profile = await useFeedStore().followByCode('k7qm 3x9p')
    expect(rpc).toHaveBeenCalledWith('follow_by_code', { p_code: 'K7QM3X9P' })
    expect(profile.display_name).toBe('Ana')
  })

  it('reads the empty row an unknown code returns as code_not_found', async () => {
    rpc.mockResolvedValue({ data: { id: null, display_name: null, bio: null }, error: null })
    expect((await followError(() => useFeedStore().followByCode('K7QM3X9P'))).code).toBe('code_not_found')

    rpc.mockResolvedValue({ data: null, error: null })
    expect((await followError(() => useFeedStore().followByCode('K7QM3X9P'))).code).toBe('code_not_found')
  })

  it('surfaces a throttled follow as rate_limited', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'rate_limited' } })
    const feed = useFeedStore()
    expect((await followError(() => feed.followByCode('K7QM3X9P'))).code).toBe('rate_limited')
    expect((await followError(() => feed.followUser(THEM))).code).toBe('rate_limited')
  })

  it('keeps the other server errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'cannot_follow_self' } })
    expect((await followError(() => useFeedStore().followByCode('K7QM3X9P'))).code).toBe('cannot_follow_self')
  })
})

describe('feed store likers', () => {
  const SESSION = 'c0000000-0000-0000-0000-000000000001'

  function row(i: number) {
    return {
      user_id: `d0000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
      display_name: `User ${i}`,
      liked_at: `2026-10-01T10:${String(59 - (i % 60)).padStart(2, '0')}:00Z`,
      i_follow: i === 0,
      follows_me: false,
    }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    rpc.mockReset()
  })

  it('asks for the first page and maps the rows', async () => {
    rpc.mockResolvedValue({ data: [row(0)], error: null })
    const page = await useFeedStore().fetchLikers(SESSION)
    expect(rpc).toHaveBeenCalledWith('get_session_likers', {
      p_session_id: SESSION,
      p_before: null,
      p_before_user: null,
      p_limit: LIKERS_PAGE_SIZE,
    })
    expect(page.likers).toEqual([
      { id: row(0).user_id, displayName: 'User 0', likedAt: row(0).liked_at, iFollow: true, followsMe: false },
    ])
    expect(page.next).toBeNull()
  })

  it('pages on the last row of a full page', async () => {
    const rows = Array.from({ length: LIKERS_PAGE_SIZE }, (_, i) => row(i))
    rpc.mockResolvedValue({ data: rows, error: null })
    const feed = useFeedStore()
    const page = await feed.fetchLikers(SESSION)
    const last = rows[rows.length - 1]!
    expect(page.next).toEqual({ likedAt: last.liked_at, id: last.user_id })

    rpc.mockResolvedValue({ data: [], error: null })
    await feed.fetchLikers(SESSION, page.next)
    expect(rpc).toHaveBeenLastCalledWith('get_session_likers', {
      p_session_id: SESSION,
      p_before: last.liked_at,
      p_before_user: last.user_id,
      p_limit: LIKERS_PAGE_SIZE,
    })
  })

  it('leaves out accounts hidden on this device', async () => {
    rpc.mockResolvedValue({ data: [row(0), row(1)], error: null })
    const feed = useFeedStore()
    feed.hideUser(row(1).user_id)
    expect((await feed.fetchLikers(SESSION)).likers.map((l) => l.id)).toEqual([row(0).user_id])
  })

  it('throws when the post is not visible', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'not_found' } })
    await expect(useFeedStore().fetchLikers(SESSION)).rejects.toMatchObject({ message: 'not_found' })
  })
})
