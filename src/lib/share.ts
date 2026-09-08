/** URL-safe base64 (no padding) of a UTF-8 string. */
export function encodeRoutineParam(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Reverses {@link encodeRoutineParam}.
 *
 * @throws If the parameter is not valid base64.
 */
export function decodeRoutineParam(param: string): string {
  const base64 = param.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** The query-parameter name carrying the encoded routine. */
export const ROUTINE_PARAM = 'r'

/**
 * Builds a self-contained import URL for a `.wtt` routine.
 *
 * @param text - Raw `.wtt` file contents.
 * @param importPath - The resolved `/import` path (from the router), including base.
 * @returns An absolute URL that opens the app on the import screen.
 */
export function buildImportUrl(text: string, importPath: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const sep = importPath.includes('?') ? '&' : '?'
  return `${origin}${importPath}${sep}${ROUTINE_PARAM}=${encodeRoutineParam(text)}`
}

/**
 * Pulls the `.wtt` text out of a scanned QR payload.
 *
 * Accepts either an import URL carrying a `?${ROUTINE_PARAM}=` param (what
 * {@link buildImportUrl} produces) or raw `.wtt` text encoded straight into
 * the code.
 *
 * @param scanned - The decoded QR string.
 * @returns The `.wtt` text, or `null` if nothing routine-shaped was found.
 */
export function readScannedRoutine(scanned: string): string | null {
  const value = scanned.trim()
  if (!value) return null

  try {
    const param = new URL(value).searchParams.get(ROUTINE_PARAM)
    if (param) return decodeRoutineParam(param)
  } catch {
    /* not a URL — fall through */
  }

  // A bare `?r=...` fragment, or the param sitting anywhere in the string.
  const match = new RegExp(`[?&]${ROUTINE_PARAM}=([A-Za-z0-9_-]+)`).exec(value)
  if (match) {
    try {
      return decodeRoutineParam(match[1]!)
    } catch {
      /* corrupt param */
    }
  }

  // Raw `.wtt` text encoded directly into the QR.
  if (value.startsWith('#') || value.includes(' | ')) return value

  return null
}
