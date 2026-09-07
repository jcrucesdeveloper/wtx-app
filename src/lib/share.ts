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
