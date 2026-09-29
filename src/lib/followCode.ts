/**
 * A profile's permanent follow code — the follow-graph equivalent of
 * `roomCode.ts`'s room codes, but never expires. Kept as a sibling file
 * rather than merged with `roomCode.ts`: the alphabet/length are shared by
 * convention, not by contract, and the two codes have different lifecycles
 * (a room code frees up when the room finishes; a follow code never does).
 */

import { publicUrl } from './publicUrl'

/** Same no-ambiguous-character alphabet as room codes: no 0/O or 1/I/L. */
export const FOLLOW_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const FOLLOW_CODE_LENGTH = 8

/** The query-parameter name carrying a follow code in a follow link. */
export const FOLLOW_CODE_PARAM = 'follow'

const CODE_RE = new RegExp(`^[${FOLLOW_CODE_ALPHABET}]{${FOLLOW_CODE_LENGTH}}$`)

/** Uppercases and strips spaces/dashes: `"k7qm 3x9p"` → `"K7QM3X9P"`. */
export function normalizeFollowCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '')
}

export function isValidFollowCode(code: string): boolean {
  return CODE_RE.test(code)
}

/**
 * An absolute link that opens the app on the follow screen with the code
 * filled in — a plain web URL, same as `buildJoinUrl`, so it works whether
 * or not the recipient has the app installed yet.
 *
 * @param followPath - The resolved follow route path (from the router), including base.
 */
export function buildFollowUrl(code: string, followPath: string): string {
  const sep = followPath.includes('?') ? '&' : '?'
  return publicUrl(`${followPath}${sep}${FOLLOW_CODE_PARAM}=${code}`)
}

/**
 * Pulls a follow code out of a scanned QR payload — a follow link, or a bare
 * code.
 *
 * @returns The normalized code, or `null` if nothing code-shaped was found.
 */
export function readScannedFollowCode(scanned: string): string | null {
  const value = scanned.trim()
  if (!value) return null

  try {
    const param = new URL(value).searchParams.get(FOLLOW_CODE_PARAM)
    if (param) {
      const code = normalizeFollowCode(param)
      return isValidFollowCode(code) ? code : null
    }
  } catch {
    /* not a URL — fall through */
  }

  const code = normalizeFollowCode(value)
  return isValidFollowCode(code) ? code : null
}
