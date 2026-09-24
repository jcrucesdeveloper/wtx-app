import { exerciseImageUrl } from '@/config/exerciseImages'
import { findCatalogEntryByName } from './exerciseCatalog'

/**
 * On-device persistence for exercise images, via the standard Cache Storage
 * API (`caches.open`/`match`/`put`) — supported in both WKWebView and
 * Android's System WebView, no Capacitor plugin or service worker needed.
 *
 * Deliberately never auto-evicted: post-compression images are a few KB
 * each and the catalog is finite (~870 exercises), so even a
 * used-everything worst case stays small. See src/lib/exercises/README.md.
 */
const CACHE_NAME = 'wtx-exercise-images-v1'

function hasCacheStorage(): boolean {
  return typeof caches !== 'undefined'
}

/** Cache-first fetch: returns a cached Response if present, else fetches and (when possible) persists it. */
async function getOrFetch(url: string): Promise<Response | undefined> {
  try {
    if (hasCacheStorage()) {
      const cache = await caches.open(CACHE_NAME)
      const hit = await cache.match(url)
      if (hit) return hit

      const response = await fetch(url)
      if (!response.ok) return undefined
      await cache.put(url, response.clone())
      return response
    }

    const response = await fetch(url)
    return response.ok ? response : undefined
  } catch {
    return undefined
  }
}

/**
 * Fetches and persists both frames for each name that resolves to a catalog
 * entry, skipping ones already cached. Best-effort — network failures are
 * swallowed so a flaky connection never breaks routine/session loading.
 */
export async function warmExerciseImages(names: string[]): Promise<void> {
  if (!hasCacheStorage()) return

  const ids = new Set<string>()
  for (const name of names) {
    const entry = findCatalogEntryByName(name)
    if (entry) ids.add(entry.id)
  }

  await Promise.all(
    [...ids].flatMap((id) => ([0, 1] as const).map((frame) => getOrFetch(exerciseImageUrl(id, frame)))),
  )
}

/**
 * Resolves an exercise's image to a blob URL for use in an `<img src>`,
 * cache-first. Falls back to a live (uncached, if Cache Storage is
 * unavailable) fetch for images not yet warmed, e.g. previewing from search
 * before an exercise is ever added anywhere.
 *
 * Callers own the returned URL and should `URL.revokeObjectURL` it when done.
 */
export async function getCachedImageObjectUrl(
  catalogId: string,
  frame: 0 | 1,
): Promise<string | undefined> {
  const response = await getOrFetch(exerciseImageUrl(catalogId, frame))
  if (!response) return undefined
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}
