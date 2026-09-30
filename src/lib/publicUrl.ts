import { Capacitor } from '@capacitor/core'

/**
 * Absolute links that leave the device — QR codes, share sheets, auth email
 * redirects — must point at the app's public web address, never at the page
 * the app happens to be served from. Inside Capacitor that is
 * `https://localhost` (Android) or `capacitor://localhost` (iOS), which is
 * useless to anyone else.
 */

let warnedMissing = false

/**
 * The origin links should use, without a trailing slash.
 *
 * `VITE_PUBLIC_URL` (e.g. `https://wtx.app`) wins when set. Without it the web
 * build falls back to the current origin, which is correct there. A native
 * build without it also falls back — to a localhost origin that only works on
 * the sender's own device — so shipping a store build without
 * `VITE_PUBLIC_URL` is a release blocker (a warning is logged once).
 */
export function publicOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_URL?.trim()
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      /* malformed — fall through to the current origin */
    }
  }
  if (Capacitor.isNativePlatform() && !warnedMissing) {
    warnedMissing = true
    console.warn('VITE_PUBLIC_URL is not set: share links and auth emails will point at localhost.')
  }
  return typeof window !== 'undefined' ? window.location.origin : ''
}

/**
 * An absolute public link to `path`.
 *
 * @param path - An already-resolved app path, including the router base (e.g.
 *   `router.resolve(...).href`), optionally with query/hash.
 */
export function publicUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${publicOrigin()}${normalized}`
}

/**
 * An absolute public link to a route path that is *not* yet prefixed with the
 * router base (`import.meta.env.BASE_URL`) — for places that can't use the
 * router, like the auth store building email redirect URLs.
 */
export function publicRouteUrl(routePath: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  const normalized = routePath.startsWith('/') ? routePath : `/${routePath}`
  return publicUrl(`${base}${normalized}`)
}

/**
 * Maps an incoming deep link (a universal / app link opened on the phone) to
 * the in-app route it names: path + query + hash, relative to the router base.
 *
 * Only links on the public host are accepted, so an unrelated URL handed to
 * the app can't navigate it anywhere.
 *
 * @returns The router location string, or `null` when the URL isn't ours.
 */
export function deepLinkToRoute(url: string, origin: string = publicOrigin()): string | null {
  let parsed: URL
  let expected: URL
  try {
    parsed = new URL(url)
    expected = new URL(origin)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== expected.protocol) return null
  if (parsed.host.toLowerCase() !== expected.host.toLowerCase()) return null

  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  let path = parsed.pathname
  if (base && (path === base || path.startsWith(`${base}/`))) path = path.slice(base.length) || '/'
  return `${path}${parsed.search}${parsed.hash}`
}
