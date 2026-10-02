import { normalizeSource, sourceFromUrl } from '@/lib/acquisition'

const STORAGE_KEY = 'wtx:source'

/** The first source this install was opened from, if any — sent with analytics events. */
export function acquisitionSource(): string | null {
  return normalizeSource(localStorage.getItem(STORAGE_KEY))
}

/**
 * Remembers where this visitor came from. First touch wins: a later link
 * never overwrites the one that brought them in.
 *
 * @param pathname - Path relative to the router base.
 */
export function captureSource(pathname: string, search: string): void {
  if (acquisitionSource()) return
  const source = sourceFromUrl(pathname, search)
  if (source) localStorage.setItem(STORAGE_KEY, source)
}
