/** Characters a room code can use — no 0/O or 1/I/L, so it survives being read aloud. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 6

/** The query-parameter name carrying a room code in a join link. */
export const ROOM_CODE_PARAM = 'code'

const CODE_RE = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`)

/** Uppercases and strips spaces/dashes: `"k7q m3x"` → `"K7QM3X"`. */
export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '')
}

export function isValidRoomCode(code: string): boolean {
  return CODE_RE.test(code)
}

/**
 * An absolute link that opens the app on the join screen with the code filled in.
 *
 * @param joinPath - The resolved join route path (from the router), including base.
 */
export function buildJoinUrl(code: string, joinPath: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const sep = joinPath.includes('?') ? '&' : '?'
  return `${origin}${joinPath}${sep}${ROOM_CODE_PARAM}=${code}`
}

/**
 * Pulls a room code out of a scanned QR payload — a join link, or a bare code.
 *
 * @returns The normalized code, or `null` if nothing code-shaped was found.
 */
export function readScannedRoomCode(scanned: string): string | null {
  const value = scanned.trim()
  if (!value) return null

  try {
    const param = new URL(value).searchParams.get(ROOM_CODE_PARAM)
    if (param) {
      const code = normalizeRoomCode(param)
      return isValidRoomCode(code) ? code : null
    }
  } catch {
    /* not a URL — fall through */
  }

  const code = normalizeRoomCode(value)
  return isValidRoomCode(code) ? code : null
}
