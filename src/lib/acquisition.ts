/**
 * Where a visitor came from, as a short label: a `src` (or `utm_source`)
 * query parameter on the link they opened — e.g. the link in a TikTok bio is
 * `https://<host>/?src=tiktok` — or, without one, the kind of shared link
 * they landed on. Never anything about the person.
 */

const SOURCE_PATTERN = /^[a-z0-9_-]{1,32}$/

/** Shared links name their own kind, so they need no tag. Longest prefix first. */
const SHARED_LINK_SOURCES: [prefix: string, source: string][] = [
  ['/social/posts/', 'share-post'],
  ['/social/follow', 'share-follow'],
  ['/social/join', 'share-room'],
  ['/rooms/', 'share-room'],
  ['/import', 'share-routine'],
]

/** A label safe to store and send, or `null` when the value isn't one. */
export function normalizeSource(raw: string | null | undefined): string | null {
  const value = raw?.trim().toLowerCase() ?? ''
  return SOURCE_PATTERN.test(value) ? value : null
}

/**
 * The source a landing URL names.
 *
 * @param pathname - Path relative to the router base.
 */
export function sourceFromUrl(pathname: string, search: string): string | null {
  const params = new URLSearchParams(search)
  const tagged = normalizeSource(params.get('src')) ?? normalizeSource(params.get('utm_source'))
  if (tagged) return tagged
  return SHARED_LINK_SOURCES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? null
}
