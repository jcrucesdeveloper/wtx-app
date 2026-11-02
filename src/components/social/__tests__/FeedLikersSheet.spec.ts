import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { i18n } from '@/i18n'
import { useFeedStore, type Liker } from '@/stores/feed'
import FeedLikersSheet from '../FeedLikersSheet.vue'

const ME = 'a0000000-0000-0000-0000-000000000001'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn<() => void>() }) }))
vi.mock('@/services/supabase', () => ({ supabase: null, isSupabaseConfigured: false, requireSupabase: () => ({}) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: { id: ME } }) }))

function liker(id: string, displayName: string, extra: Partial<Liker> = {}): Liker {
  return { id, displayName, likedAt: '2026-10-01T10:00:00Z', iFollow: false, followsMe: false, ...extra }
}

describe('FeedLikersSheet', () => {
  let pinia: Pinia
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    i18n.global.locale.value = 'en'
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  function mountSheet(pages: { likers: Liker[]; next: { likedAt: string; id: string } | null }[]) {
    const feed = useFeedStore()
    const fetchLikers = vi.spyOn(feed, 'fetchLikers')
    for (const page of pages) fetchLikers.mockResolvedValueOnce(page)
    vi.spyOn(feed, 'loadFollowing').mockResolvedValue()
    wrapper = mount(FeedLikersSheet, {
      props: { sessionId: 's1' },
      attachTo: document.body,
      global: { plugins: [pinia, i18n] },
    })
    return fetchLikers
  }

  it('lists the likers with a follow button, and "You" without one', async () => {
    mountSheet([
      {
        likers: [liker(ME, 'Jaco'), liker('ana', 'Ana', { followsMe: true }), liker('bo', 'Bo')],
        next: null,
      },
    ])
    await flushPromises()
    const rows = [...document.body.querySelectorAll('.row')]
    expect(rows.map((r) => r.querySelector('.row__name')?.textContent?.trim())).toEqual(['You', 'Ana', 'Bo'])
    expect(rows[0]?.querySelector('.follow')).toBeNull()
    expect(rows[1]?.querySelector('.follow')?.textContent).toContain('Follow back')
    expect(rows[2]?.querySelector('.follow')?.textContent).toContain('Follow')
    expect(document.body.querySelector('.more')).toBeNull()
  })

  it('loads the next page from where the last one ended', async () => {
    const cursor = { likedAt: '2026-10-01T10:00:00Z', id: 'ana' }
    const fetchLikers = mountSheet([
      { likers: [liker('ana', 'Ana')], next: cursor },
      { likers: [liker('bo', 'Bo')], next: null },
    ])
    await flushPromises()
    ;(document.body.querySelector('.more') as HTMLButtonElement).click()
    await flushPromises()
    expect(fetchLikers).toHaveBeenLastCalledWith('s1', cursor)
    expect(document.body.querySelectorAll('.row')).toHaveLength(2)
    expect(document.body.querySelector('.more')).toBeNull()
  })

  it('says so when nobody is left to show', async () => {
    mountSheet([{ likers: [], next: null }])
    await flushPromises()
    expect(document.body.textContent).toContain('No kudos yet.')
  })
})
