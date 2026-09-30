import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { FollowError, useFeedStore } from '@/stores/feed'

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
