import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exerciseImageUrl } from '@/config/exerciseImages'
import { getCachedImageObjectUrl, warmExerciseImages } from '../imageCache'

const SQUAT_URL_0 = exerciseImageUrl('Barbell_Squat', 0)
const SQUAT_URL_1 = exerciseImageUrl('Barbell_Squat', 1)

function fakeCacheStorage() {
  const store = new Map<string, Response>()
  return {
    match: vi.fn<(url: string) => Promise<Response | undefined>>(async (url) => store.get(url)),
    put: vi.fn<(url: string, response: Response) => Promise<void>>(async (url, response) => {
      store.set(url, response)
    }),
  }
}

describe('imageCache', () => {
  let cache: ReturnType<typeof fakeCacheStorage>
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    cache = fakeCacheStorage()
    vi.stubGlobal('caches', { open: vi.fn<() => Promise<typeof cache>>(async () => cache) })
    // jsdom's Blob isn't compatible with Node/undici's Response body extraction,
    // so use a plain string body instead of `new Blob([...])`.
    fetchMock = vi.fn<typeof fetch>(async () => new Response('fake-image', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    URL.createObjectURL = vi.fn<(obj: Blob) => string>(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn<(url: string) => void>()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('warmExerciseImages', () => {
    it('fetches and caches both frames for a name that matches the catalog', async () => {
      await warmExerciseImages(['Squat'])
      expect(fetchMock).toHaveBeenCalledWith(SQUAT_URL_0)
      expect(fetchMock).toHaveBeenCalledWith(SQUAT_URL_1)
      expect(cache.put).toHaveBeenCalledTimes(2)
    })

    it('skips names with no catalog match', async () => {
      await warmExerciseImages(['Not A Real Exercise'])
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('does not re-fetch an image already in the cache', async () => {
      await warmExerciseImages(['Squat'])
      fetchMock.mockClear()
      await warmExerciseImages(['Squat'])
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('getCachedImageObjectUrl', () => {
    it('resolves an already-cached image to an object URL', async () => {
      await warmExerciseImages(['Squat'])
      const url = await getCachedImageObjectUrl('Barbell_Squat', 0)
      expect(url).toBe('blob:fake')
    })

    it('falls back to a live fetch for an image that was never warmed', async () => {
      const url = await getCachedImageObjectUrl('Barbell_Squat', 0)
      expect(url).toBe('blob:fake')
      expect(fetchMock).toHaveBeenCalledWith(SQUAT_URL_0)
    })

    it('returns undefined when the fetch fails', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 404 }))
      const url = await getCachedImageObjectUrl('Barbell_Squat', 0)
      expect(url).toBeUndefined()
    })
  })
})
